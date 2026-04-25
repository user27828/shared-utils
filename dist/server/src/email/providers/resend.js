import { log } from "../../../../utils/index.js";
import { getAttachmentContentBase64, getAttachmentContentType, } from "../attachments.js";
import { formatEmailAddress } from "../address.js";
import { EmailProviderError } from "../errors.js";
import { formatCompactLogLine, formatCompactLogList, formatHierarchicalLog, formatCompactLogText, formatCompactLogValue, } from "../logFormat.js";
import { requestWithTimeout } from "../requestTimeout.js";
const PROVIDER_NAME = "resend";
const DEFAULT_BASE_URL = "https://api.resend.com";
const RESEND_TAG_INVALID_CHARS = /[^A-Za-z0-9_-]+/g;
const RESEND_TAG_EDGE_SEPARATORS = /^[-_]+|[-_]+$/g;
const isRecord = (value) => {
    return typeof value === "object" && value !== null;
};
const trimToDefinedString = (value) => {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed || undefined;
};
const sanitizeTagPart = (value, fallback) => {
    const trimmed = trimToDefinedString(value);
    if (!trimmed) {
        return fallback;
    }
    const sanitized = trimmed
        .replace(RESEND_TAG_INVALID_CHARS, "-")
        .replace(RESEND_TAG_EDGE_SEPARATORS, "");
    return sanitized || fallback;
};
const normalizeStringTag = (tag, index) => {
    const trimmedTag = trimToDefinedString(tag);
    if (!trimmedTag) {
        return undefined;
    }
    const separatorIndex = trimmedTag.indexOf(":");
    if (separatorIndex > 0 && separatorIndex < trimmedTag.length - 1) {
        const name = sanitizeTagPart(trimmedTag.slice(0, separatorIndex), `tag_${index + 1}`);
        const value = sanitizeTagPart(trimmedTag.slice(separatorIndex + 1), `value_${index + 1}`);
        return { name, value };
    }
    return {
        name: `tag_${index + 1}`,
        value: sanitizeTagPart(trimmedTag, `value_${index + 1}`),
    };
};
const normalizeTags = (tags) => {
    if (!Array.isArray(tags)) {
        return undefined;
    }
    const normalizedTags = [];
    for (const [index, tag] of tags.entries()) {
        if (typeof tag === "string") {
            const normalizedTag = normalizeStringTag(tag, index);
            if (normalizedTag) {
                normalizedTags.push(normalizedTag);
            }
            continue;
        }
        normalizedTags.push({
            name: sanitizeTagPart(isRecord(tag) ? tag.name : undefined, `tag_${index + 1}`),
            value: sanitizeTagPart(isRecord(tag) ? tag.value : undefined, `value_${index + 1}`),
        });
    }
    return normalizedTags.length > 0 ? normalizedTags : undefined;
};
const parseJsonResponse = async (response) => {
    const raw = await response.text();
    if (!raw) {
        return undefined;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return raw;
    }
};
const extractApiError = (payload) => {
    if (!isRecord(payload)) {
        return {};
    }
    return {
        message: typeof payload.message === "string" ? payload.message : undefined,
        name: typeof payload.name === "string" ? payload.name : undefined,
        type: typeof payload.type === "string" ? payload.type : undefined,
    };
};
export class ResendEmailProvider {
    name = PROVIDER_NAME;
    enabled;
    config;
    initialized = false;
    constructor(config) {
        this.config = config;
        this.enabled = config.enabled;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            const baseUrl = this.getBaseUrl();
            new URL(baseUrl);
            this.initialized = true;
            log.info?.(formatHierarchicalLog("ResendProvider: Initialized", [
                formatCompactLogLine([["baseUrl", formatCompactLogText(baseUrl)]]),
            ]));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new EmailProviderError(`Failed to initialize Resend provider: ${message}`, PROVIDER_NAME, { retryable: false });
        }
    }
    async send(message, options) {
        if (!this.initialized) {
            await this.initialize();
        }
        const sendOptions = options;
        const payload = {
            from: formatEmailAddress(message.from),
            to: message.to.map(formatEmailAddress),
            subject: message.subject,
        };
        if (message.cc?.length) {
            payload.cc = message.cc.map(formatEmailAddress);
        }
        if (message.bcc?.length) {
            payload.bcc = message.bcc.map(formatEmailAddress);
        }
        if (message.replyTo) {
            payload.replyTo = formatEmailAddress(message.replyTo);
        }
        if (message.html) {
            payload.html = message.html;
        }
        if (message.text !== undefined) {
            payload.text = message.text;
        }
        if (message.headers) {
            payload.headers = message.headers;
        }
        if (message.attachments?.length) {
            payload.attachments = message.attachments.map((attachment) => {
                const resendAttachment = {
                    filename: attachment.filename,
                    content: getAttachmentContentBase64(attachment),
                };
                const contentType = getAttachmentContentType(attachment);
                if (contentType) {
                    resendAttachment.contentType = contentType;
                }
                if (attachment.contentId) {
                    resendAttachment.contentId = attachment.contentId;
                }
                return resendAttachment;
            });
        }
        if (sendOptions?.scheduledAt) {
            payload.scheduledAt = sendOptions.scheduledAt;
        }
        const normalizedTags = normalizeTags(sendOptions?.tags);
        if (normalizedTags?.length) {
            payload.tags = normalizedTags;
        }
        const headers = {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
        };
        if (sendOptions?.idempotencyKey) {
            headers["Idempotency-Key"] = sendOptions.idempotencyKey;
        }
        let response;
        try {
            response = await requestWithTimeout("Resend send", async (signal) => {
                return fetch(`${this.getBaseUrl()}/emails`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload),
                    signal,
                });
            });
        }
        catch (err) {
            const messageText = err instanceof Error ? err.message : String(err);
            throw new EmailProviderError(`Resend send failed: ${messageText}`, PROVIDER_NAME, {
                retryable: this.isRetryableNetworkError(err),
            });
        }
        const responseBody = await parseJsonResponse(response);
        if (!response.ok) {
            const apiError = extractApiError(responseBody);
            const providerCode = apiError.name || apiError.type || String(response.status);
            const errorMessage = apiError.message || `HTTP ${response.status} ${response.statusText}`;
            throw new EmailProviderError(`Resend send failed: ${errorMessage}`, PROVIDER_NAME, {
                retryable: this.isRetryableResponse(response.status, providerCode),
                providerCode,
                context: {
                    status: response.status,
                    response: responseBody,
                },
            });
        }
        const messageId = isRecord(responseBody) && typeof responseBody.id === "string"
            ? responseBody.id
            : message.messageId;
        log.info?.(formatHierarchicalLog("ResendProvider: Email sent", [
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
        ]));
        return {
            success: true,
            messageId,
            provider: PROVIDER_NAME,
            timestamp: new Date(),
            providerResponse: responseBody,
        };
    }
    async healthCheck() {
        const start = Date.now();
        try {
            if (!this.initialized) {
                await this.initialize();
            }
            const response = await requestWithTimeout("Resend health check", async (signal) => {
                return fetch(`${this.getBaseUrl()}/domains?limit=1`, {
                    method: "GET",
                    signal,
                    headers: {
                        Authorization: `Bearer ${this.config.apiKey}`,
                    },
                });
            });
            if (!response.ok) {
                const responseBody = await parseJsonResponse(response);
                const apiError = extractApiError(responseBody);
                throw new Error(apiError.message || `HTTP ${response.status} ${response.statusText}`);
            }
            return {
                provider: PROVIDER_NAME,
                healthy: true,
                lastCheck: new Date(),
                latencyMs: Date.now() - start,
            };
        }
        catch (err) {
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
    async dispose() {
        this.initialized = false;
        log.debug?.("ResendProvider: Disposed");
    }
    getBaseUrl() {
        return this.config.baseUrl || DEFAULT_BASE_URL;
    }
    isRetryableNetworkError(err) {
        if (err instanceof EmailProviderError) {
            return err.retryable;
        }
        if (!(err instanceof Error)) {
            return false;
        }
        const message = err.message.toLowerCase();
        return (err.name === "AbortError" ||
            message.includes("timeout") ||
            message.includes("timed out") ||
            message.includes("econnrefused") ||
            message.includes("enotfound") ||
            message.includes("network"));
    }
    isRetryableResponse(status, providerCode) {
        if (status === 429) {
            return true;
        }
        if (status >= 500 && status < 600) {
            return true;
        }
        return providerCode === "concurrent_idempotent_requests";
    }
}
export const isConfigured = () => {
    return (process.env.EMAIL_RESEND_ENABLED === "true" &&
        !!process.env.EMAIL_RESEND_API_KEY);
};
export const createResendProvider = (config) => {
    return new ResendEmailProvider(config);
};
//# sourceMappingURL=resend.js.map