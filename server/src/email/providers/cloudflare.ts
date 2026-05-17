import { log } from "../../../../utils/index.js";
import {
  getAttachmentContentBase64,
  getAttachmentContentType,
} from "../attachments.js";
import { formatEmailAddress } from "../address.js";
import { EmailProviderError } from "../errors.js";
import {
  formatCompactLogLine,
  formatCompactLogList,
  formatHierarchicalLog,
  formatCompactLogText,
  formatCompactLogValue,
} from "../logFormat.js";
import { requestWithTimeout } from "../requestTimeout.js";
import type {
  CloudflareProviderConfig,
  EmailAttachment,
  EmailMessage,
  EmailSendResult,
  IEmailProvider,
  ProviderHealthStatus,
} from "./types.js";

const PROVIDER_NAME = "cloudflare";
const DEFAULT_BASE_URL = "https://api.cloudflare.com/client/v4";
const MAX_RECIPIENT_COUNT = 50;
const MAX_MESSAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_NON_X_HEADERS = 20;
const MAX_HEADER_NAME_BYTES = 100;
const MAX_HEADER_VALUE_BYTES = 2048;
const MAX_HEADERS_PAYLOAD_BYTES = 16 * 1024;
const CONTROL_CHARACTER_REGEX = /[\u0000-\u001F\u007F]/;
const X_HEADER_NAME_REGEX = /^X-[A-Za-z0-9\-_]+$/;
const STANDARD_HEADER_NAME_REGEX = /^[A-Za-z0-9-]+$/;

const PLATFORM_CONTROLLED_HEADERS = new Set([
  "date",
  "message-id",
  "mime-version",
  "content-type",
  "content-transfer-encoding",
  "dkim-signature",
  "return-path",
  "received",
  "feedback-id",
  "tls-required",
  "tls-report-domain",
  "tls-report-submitter",
  "cfbl-address",
  "cfbl-feedback-id",
]);

const FIRST_CLASS_FIELD_HEADERS = new Map([
  ["from", "from"],
  ["to", "to"],
  ["cc", "cc"],
  ["bcc", "bcc"],
  ["subject", "subject"],
  ["reply-to", "reply_to"],
]);

const ALLOWED_NON_X_HEADERS = new Map([
  ["in-reply-to", "In-Reply-To"],
  ["references", "References"],
  ["list-unsubscribe", "List-Unsubscribe"],
  ["list-unsubscribe-post", "List-Unsubscribe-Post"],
  ["list-id", "List-Id"],
  ["list-archive", "List-Archive"],
  ["list-help", "List-Help"],
  ["list-owner", "List-Owner"],
  ["list-post", "List-Post"],
  ["list-subscribe", "List-Subscribe"],
  ["precedence", "Precedence"],
  ["auto-submitted", "Auto-Submitted"],
  ["content-language", "Content-Language"],
  ["keywords", "Keywords"],
  ["comments", "Comments"],
  ["importance", "Importance"],
  ["sensitivity", "Sensitivity"],
  ["organization", "Organization"],
  ["require-recipient-valid-since", "Require-Recipient-Valid-Since"],
  ["archived-at", "Archived-At"],
]);

interface CloudflareApiMessage {
  code?: number | string;
  message?: string;
}

interface CloudflareSendResultData {
  delivered?: string[];
  permanent_bounces?: string[];
  queued?: string[];
  [key: string]: unknown;
}

interface CloudflareResponseEnvelope {
  success?: boolean;
  errors?: CloudflareApiMessage[];
  messages?: CloudflareApiMessage[];
  result?: CloudflareSendResultData | null;
}

interface CloudflareAttachmentPayload {
  content: string;
  filename: string;
  type?: string;
  disposition?: "attachment" | "inline";
}

interface CloudflareSendPayload {
  from: string;
  subject: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: CloudflareAttachmentPayload[];
}

interface CloudflareProviderRuntime {
  fetch: typeof fetch;
  requestWithTimeout: typeof requestWithTimeout;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const trimToDefinedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const parseJsonResponse = async (response: Response): Promise<unknown> => {
  const raw = await response.text();

  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
};

const getResponseEnvelope = (payload: unknown): CloudflareResponseEnvelope => {
  if (!isRecord(payload)) {
    return {};
  }

  return {
    success: typeof payload.success === "boolean" ? payload.success : undefined,
    errors: Array.isArray(payload.errors)
      ? (payload.errors as CloudflareApiMessage[])
      : undefined,
    messages: Array.isArray(payload.messages)
      ? (payload.messages as CloudflareApiMessage[])
      : undefined,
    result:
      payload.result === null || isRecord(payload.result)
        ? (payload.result as CloudflareSendResultData | null)
        : undefined,
  };
};

const getPrimaryApiMessage = (
  envelope: CloudflareResponseEnvelope,
): CloudflareApiMessage | undefined => {
  return envelope.errors?.find((entry) => {
    return !!entry && (entry.code !== undefined || entry.message !== undefined);
  });
};

const isPlatformControlledHeader = (headerNameLower: string): boolean => {
  return (
    PLATFORM_CONTROLLED_HEADERS.has(headerNameLower) ||
    headerNameLower.startsWith("arc-")
  );
};

const toLocalValidationError = (
  message: string,
  context?: Record<string, unknown>,
): EmailProviderError => {
  return new EmailProviderError(message, PROVIDER_NAME, {
    retryable: false,
    context: {
      operation: "send",
      ...context,
    },
  });
};

export class CloudflareEmailProvider implements IEmailProvider {
  readonly name = PROVIDER_NAME;
  readonly enabled: boolean;

  private config: CloudflareProviderConfig;
  private runtime: CloudflareProviderRuntime;
  private initialized = false;

  constructor(
    config: CloudflareProviderConfig,
    runtime: CloudflareProviderRuntime = {
      fetch: (input, init) => fetch(input, init),
      requestWithTimeout,
    },
  ) {
    this.config = config;
    this.enabled = config.enabled;
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.getRequiredConfigValue("accountId", this.config.accountId);
      this.getRequiredConfigValue("zoneId", this.config.zoneId);
      this.getRequiredConfigValue("apiToken", this.config.apiToken);

      if (
        this.config.timeoutMs !== undefined &&
        (!Number.isFinite(this.config.timeoutMs) || this.config.timeoutMs <= 0)
      ) {
        throw new EmailProviderError(
          "Cloudflare provider timeoutMs must be a positive number",
          PROVIDER_NAME,
          {
            retryable: false,
            context: {
              operation: "initialize",
              timeoutMs: this.config.timeoutMs,
            },
          },
        );
      }

      new URL(this.getBaseUrl());
      this.initialized = true;

      log.info?.(
        formatHierarchicalLog("CloudflareProvider: Initialized", [
          formatCompactLogLine([
            ["accountId", formatCompactLogText(this.config.accountId)],
            ["zoneId", formatCompactLogText(this.config.zoneId)],
          ]),
        ]),
      );
    } catch (err: unknown) {
      this.initialized = false;

      if (err instanceof EmailProviderError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new EmailProviderError(
        `Failed to initialize Cloudflare provider: ${message}`,
        PROVIDER_NAME,
        {
          retryable: false,
          context: {
            operation: "initialize",
          },
        },
      );
    }
  }

  async send(
    message: EmailMessage,
    _options?: Record<string, unknown>,
  ): Promise<EmailSendResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const payload = this.buildPayload(message);
    const response = await this.executeRequest("send", this.getSendUrl(), {
      method: "POST",
      headers: this.getRequestHeaders(),
      body: JSON.stringify(payload),
    });

    const responseBody = await parseJsonResponse(response);
    const envelope = getResponseEnvelope(responseBody);

    if (!response.ok || envelope.success === false) {
      throw this.createApiError(
        "send",
        response.status,
        response.statusText,
        responseBody,
      );
    }

    const messageId = this.getResponseMessageId(envelope);

    log.info?.(
      formatHierarchicalLog("CloudflareProvider: Email sent", [
        formatCompactLogLine([
          ["messageId", formatCompactLogValue(messageId)],
          ["subject", formatCompactLogText(message.subject)],
        ]),
        formatCompactLogLine([
          [
            "to",
            formatCompactLogList(message.to.map((address) => address.email)),
          ],
        ]),
      ]),
    );

    return {
      success: true,
      messageId,
      provider: PROVIDER_NAME,
      timestamp: new Date(),
      providerResponse: responseBody,
    };
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const start = Date.now();

    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const response = await this.executeRequest(
        "healthCheck",
        this.getHealthCheckUrl(),
        {
          method: "GET",
          headers: this.getRequestHeaders(),
        },
      );

      const responseBody = await parseJsonResponse(response);
      const envelope = getResponseEnvelope(responseBody);

      if (!response.ok || envelope.success === false) {
        const error = this.createApiError(
          "healthCheck",
          response.status,
          response.statusText,
          responseBody,
        );

        return {
          provider: PROVIDER_NAME,
          healthy: false,
          lastCheck: new Date(),
          error: error.message,
          latencyMs: Date.now() - start,
        };
      }

      return {
        provider: PROVIDER_NAME,
        healthy: true,
        lastCheck: new Date(),
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      return {
        provider: PROVIDER_NAME,
        healthy: false,
        lastCheck: new Date(),
        error: message,
        latencyMs: Date.now() - start,
      };
    }
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    log.debug?.("CloudflareProvider: Disposed");
  }

  private async executeRequest(
    operation: "send" | "healthCheck",
    url: string,
    init: Omit<RequestInit, "signal">,
  ): Promise<Response> {
    try {
      return await this.runtime.requestWithTimeout(
        operation === "send" ? "Cloudflare send" : "Cloudflare health check",
        async (signal) => {
          return this.runtime.fetch(url, {
            ...init,
            signal,
          });
        },
        this.config.timeoutMs,
      );
    } catch (err: unknown) {
      if (err instanceof EmailProviderError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new EmailProviderError(
        `Cloudflare ${operation} failed: ${message}`,
        PROVIDER_NAME,
        {
          retryable: this.isRetryableNetworkError(err),
          context: {
            operation,
          },
        },
      );
    }
  }

  private buildPayload(message: EmailMessage): CloudflareSendPayload {
    const subject = trimToDefinedString(message.subject);
    if (!subject) {
      throw toLocalValidationError(
        "Cloudflare send failed: subject is required",
      );
    }

    const hasHtml = !!trimToDefinedString(message.html);
    const hasText = !!trimToDefinedString(message.text);

    if (!hasHtml && !hasText) {
      throw toLocalValidationError(
        "Cloudflare send failed: either html or text content is required",
      );
    }

    const to = message.to.map(formatEmailAddress);
    const cc = message.cc?.map(formatEmailAddress);
    const bcc = message.bcc?.map(formatEmailAddress);
    const recipientCount = to.length + (cc?.length || 0) + (bcc?.length || 0);

    if (recipientCount === 0 || recipientCount > MAX_RECIPIENT_COUNT) {
      throw toLocalValidationError(
        `Cloudflare send failed: messages may target at most ${MAX_RECIPIENT_COUNT} recipients`,
        {
          recipientCount,
        },
      );
    }

    const payload: CloudflareSendPayload = {
      from: formatEmailAddress(message.from),
      subject,
      to,
    };

    if (cc?.length) {
      payload.cc = cc;
    }

    if (bcc?.length) {
      payload.bcc = bcc;
    }

    if (message.replyTo) {
      payload.reply_to = formatEmailAddress(message.replyTo);
    }

    if (hasHtml) {
      payload.html = message.html;
    }

    if (hasText) {
      payload.text = message.text;
    }

    const headers = this.buildHeaders(message);
    if (Object.keys(headers).length > 0) {
      payload.headers = headers;
    }

    if (message.attachments?.length) {
      payload.attachments = message.attachments.map((attachment) => {
        return this.buildAttachmentPayload(attachment);
      });
    }

    const payloadSizeBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    if (payloadSizeBytes > MAX_MESSAGE_SIZE_BYTES) {
      throw toLocalValidationError(
        "Cloudflare send failed: message exceeds the conservative 5 MiB size limit",
        {
          payloadSizeBytes,
          maxSizeBytes: MAX_MESSAGE_SIZE_BYTES,
        },
      );
    }

    return payload;
  }

  private buildAttachmentPayload(
    attachment: EmailAttachment,
  ): CloudflareAttachmentPayload {
    const payload: CloudflareAttachmentPayload = {
      content: getAttachmentContentBase64(attachment),
      filename: attachment.filename,
    };

    const contentType = getAttachmentContentType(attachment);
    if (contentType) {
      payload.type = contentType;
    }

    if (attachment.disposition) {
      payload.disposition = attachment.disposition;
    }

    return payload;
  }

  private buildHeaders(message: EmailMessage): Record<string, string> {
    const headers: Record<string, string> = {};
    const seenHeaderNames = new Set<string>();
    let nonXHeaderCount = 0;
    let headerPayloadBytes = 0;

    const addHeader = (name: string, value: string): void => {
      const normalizedName = trimToDefinedString(name);
      const normalizedValue = trimToDefinedString(value);

      if (!normalizedName || !normalizedValue) {
        throw toLocalValidationError(
          "Cloudflare send failed: header names and values must be non-empty",
        );
      }

      if (
        CONTROL_CHARACTER_REGEX.test(normalizedName) ||
        CONTROL_CHARACTER_REGEX.test(normalizedValue)
      ) {
        throw toLocalValidationError(
          `Cloudflare send failed: header '${normalizedName}' contains control characters`,
          {
            header: normalizedName,
          },
        );
      }

      const headerNameLower = normalizedName.toLowerCase();
      if (seenHeaderNames.has(headerNameLower)) {
        throw toLocalValidationError(
          `Cloudflare send failed: duplicate header '${normalizedName}' is not allowed`,
          {
            header: normalizedName,
          },
        );
      }

      if (isPlatformControlledHeader(headerNameLower)) {
        throw new EmailProviderError(
          `Cloudflare send failed: header '${normalizedName}' is platform-controlled and cannot be set manually`,
          PROVIDER_NAME,
          {
            providerCode: "E_HEADER_NOT_ALLOWED",
            retryable: false,
            context: {
              operation: "send",
              header: normalizedName,
            },
          },
        );
      }

      const apiField = FIRST_CLASS_FIELD_HEADERS.get(headerNameLower);
      if (apiField) {
        throw new EmailProviderError(
          `Cloudflare send failed: header '${normalizedName}' must be set via the '${apiField}' API field`,
          PROVIDER_NAME,
          {
            providerCode: "E_HEADER_USE_API_FIELD",
            retryable: false,
            context: {
              operation: "send",
              header: normalizedName,
              apiField,
            },
          },
        );
      }

      let canonicalName = normalizedName;
      if (X_HEADER_NAME_REGEX.test(normalizedName)) {
        canonicalName = normalizedName;
      } else {
        if (!STANDARD_HEADER_NAME_REGEX.test(normalizedName)) {
          throw new EmailProviderError(
            `Cloudflare send failed: header '${normalizedName}' contains invalid characters`,
            PROVIDER_NAME,
            {
              providerCode: "E_HEADER_NAME_INVALID",
              retryable: false,
              context: {
                operation: "send",
                header: normalizedName,
              },
            },
          );
        }

        const allowedCanonicalName = ALLOWED_NON_X_HEADERS.get(headerNameLower);
        if (!allowedCanonicalName) {
          throw new EmailProviderError(
            `Cloudflare send failed: header '${normalizedName}' is not allowed`,
            PROVIDER_NAME,
            {
              providerCode: "E_HEADER_NOT_ALLOWED",
              retryable: false,
              context: {
                operation: "send",
                header: normalizedName,
              },
            },
          );
        }

        canonicalName = allowedCanonicalName;
        nonXHeaderCount += 1;
        if (nonXHeaderCount > MAX_NON_X_HEADERS) {
          throw new EmailProviderError(
            "Cloudflare send failed: too many non-X custom headers were provided",
            PROVIDER_NAME,
            {
              providerCode: "E_HEADERS_TOO_MANY",
              retryable: false,
              context: {
                operation: "send",
                headerCount: nonXHeaderCount,
                maxHeaders: MAX_NON_X_HEADERS,
              },
            },
          );
        }
      }

      const nameSizeBytes = Buffer.byteLength(canonicalName, "utf8");
      if (nameSizeBytes > MAX_HEADER_NAME_BYTES) {
        throw new EmailProviderError(
          `Cloudflare send failed: header '${canonicalName}' exceeds the maximum header-name length`,
          PROVIDER_NAME,
          {
            providerCode: "E_HEADER_NAME_INVALID",
            retryable: false,
            context: {
              operation: "send",
              header: canonicalName,
              nameSizeBytes,
            },
          },
        );
      }

      const valueSizeBytes = Buffer.byteLength(normalizedValue, "utf8");
      if (valueSizeBytes > MAX_HEADER_VALUE_BYTES) {
        throw new EmailProviderError(
          `Cloudflare send failed: header '${canonicalName}' exceeds the maximum header-value length`,
          PROVIDER_NAME,
          {
            providerCode: "E_HEADER_VALUE_TOO_LONG",
            retryable: false,
            context: {
              operation: "send",
              header: canonicalName,
              valueSizeBytes,
            },
          },
        );
      }

      headerPayloadBytes += nameSizeBytes + 2 + valueSizeBytes + 2;
      if (headerPayloadBytes > MAX_HEADERS_PAYLOAD_BYTES) {
        throw new EmailProviderError(
          "Cloudflare send failed: custom headers exceed the 16 KB payload limit",
          PROVIDER_NAME,
          {
            providerCode: "E_HEADERS_TOO_LARGE",
            retryable: false,
            context: {
              operation: "send",
              headerPayloadBytes,
              maxHeaderPayloadBytes: MAX_HEADERS_PAYLOAD_BYTES,
            },
          },
        );
      }

      headers[canonicalName] = normalizedValue;
      seenHeaderNames.add(headerNameLower);
    };

    for (const [name, value] of Object.entries(message.headers || {})) {
      addHeader(name, value);
    }

    const inReplyTo = trimToDefinedString(message.inReplyTo);
    if (inReplyTo && !seenHeaderNames.has("in-reply-to")) {
      addHeader("In-Reply-To", inReplyTo);
    }

    const references = message.references
      ?.map((reference) => trimToDefinedString(reference))
      .filter((reference): reference is string => {
        return !!reference;
      })
      .join(" ");
    if (references && !seenHeaderNames.has("references")) {
      addHeader("References", references);
    }

    if (message.priority && !seenHeaderNames.has("importance")) {
      addHeader("Importance", message.priority);
    }

    return headers;
  }

  private createApiError(
    operation: "send" | "healthCheck",
    status: number,
    statusText: string,
    responseBody: unknown,
  ): EmailProviderError {
    const envelope = getResponseEnvelope(responseBody);
    const apiMessage = getPrimaryApiMessage(envelope);
    const providerCode =
      apiMessage?.code !== undefined ? String(apiMessage.code) : String(status);
    const errorMessage =
      apiMessage?.message || `HTTP ${status} ${statusText}`.trim();

    return new EmailProviderError(
      `Cloudflare ${operation} failed: ${errorMessage}`,
      PROVIDER_NAME,
      {
        providerCode,
        retryable: this.isRetryableResponse(status, providerCode),
        context: {
          httpStatus: status,
          operation,
          response: responseBody,
        },
      },
    );
  }

  private getResponseMessageId(
    envelope: CloudflareResponseEnvelope,
  ): string | undefined {
    if (!envelope.result) {
      return undefined;
    }

    const result = envelope.result;
    const messageId =
      (typeof result.message_id === "string" && result.message_id) ||
      (typeof result.id === "string" && result.id);

    return messageId || undefined;
  }

  private getBaseUrl(): string {
    return (
      trimToDefinedString(this.config.baseUrl) || DEFAULT_BASE_URL
    ).replace(/\/+$/, "");
  }

  private getSendUrl(): string {
    return `${this.getBaseUrl()}/accounts/${encodeURIComponent(this.getRequiredConfigValue("accountId", this.config.accountId))}/email/sending/send`;
  }

  private getHealthCheckUrl(): string {
    return `${this.getBaseUrl()}/zones/${encodeURIComponent(this.getRequiredConfigValue("zoneId", this.config.zoneId))}/email/sending/subdomains`;
  }

  private getRequestHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getRequiredConfigValue("apiToken", this.config.apiToken)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private getRequiredConfigValue(field: string, value: unknown): string {
    const normalizedValue = trimToDefinedString(value);
    if (!normalizedValue) {
      throw new EmailProviderError(
        `Cloudflare provider ${field} is required`,
        PROVIDER_NAME,
        {
          retryable: false,
          context: {
            operation: "initialize",
            field,
          },
        },
      );
    }

    return normalizedValue;
  }

  private isRetryableNetworkError(error: unknown): boolean {
    if (error instanceof EmailProviderError) {
      return error.retryable;
    }

    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      error.name === "AbortError" ||
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("network") ||
      message.includes("fetch failed")
    );
  }

  private isRetryableResponse(status: number, providerCode?: string): boolean {
    return (
      status === 429 ||
      (status >= 500 && status < 600) ||
      providerCode === "10002" ||
      providerCode === "10004"
    );
  }
}

export const isConfigured = (): boolean => {
  return !!(
    process.env.EMAIL_CLOUDFLARE_ENABLED === "true" &&
    trimToDefinedString(process.env.EMAIL_CLOUDFLARE_ACCOUNT_ID) &&
    trimToDefinedString(process.env.EMAIL_CLOUDFLARE_ZONE_ID) &&
    trimToDefinedString(process.env.EMAIL_CLOUDFLARE_API_TOKEN)
  );
};

export const createCloudflareProvider = (
  config: CloudflareProviderConfig,
): IEmailProvider => {
  return new CloudflareEmailProvider(config);
};
