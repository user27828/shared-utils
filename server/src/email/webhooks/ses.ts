import crypto from "node:crypto";
import { log, optionsManager } from "../../../../utils/index.js";
import env from "../../env.js";
import {
  formatCompactLogLine,
  formatHierarchicalLog,
  formatCompactLogText,
} from "../logFormat.js";
import { requestWithTimeout } from "../requestTimeout.js";
import type {
  BounceEvent,
  BounceType,
  ComplaintEvent,
  DeliveryEvent,
  IWebhookHandler,
  WebhookEvent,
} from "./types.js";

const PROVIDER_NAME = "ses";

interface SnsEnvelope {
  Type?: string;
  MessageId?: string;
  TopicArn?: string;
  Subject?: string;
  Message?: string | Record<string, unknown>;
  Timestamp?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  SubscribeURL?: string;
  Token?: string;
}

interface SesNotification {
  notificationType?: string;
  eventType?: string;
  mail?: {
    messageId?: string;
    timestamp?: string;
    destination?: string[];
  };
  bounce?: {
    bounceType?: string;
    bounceSubType?: string;
    timestamp?: string;
    bouncedRecipients?: Array<{
      emailAddress?: string;
      diagnosticCode?: string;
      status?: string;
    }>;
  };
  complaint?: {
    complainedRecipients?: Array<{
      emailAddress?: string;
    }>;
    complaintFeedbackType?: string;
    timestamp?: string;
  };
  delivery?: {
    recipients?: string[];
    smtpResponse?: string;
    timestamp?: string;
  };
}

const getOptionalEnv = (key: string): string | undefined => {
  const value =
    (optionsManager.getOption("ENV", key) as string | undefined) || env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const getBounceType = (value: unknown): BounceType => {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized === "hard") {
    return "hard";
  }
  if (normalized === "soft") {
    return "soft";
  }
  return "undetermined";
};

const getSigningAlgorithm = (value: string | undefined): string | null => {
  if (value === "1") {
    return "RSA-SHA1";
  }
  if (value === "2") {
    return "RSA-SHA256";
  }
  return null;
};

const buildSnsStringToSign = (payload: SnsEnvelope): string => {
  const fields: string[] = [];
  const pushField = (key: string, value: string | undefined) => {
    if (value === undefined || value === "") {
      return;
    }
    fields.push(`${key}\n${value}\n`);
  };

  if (payload.Type === "Notification") {
    pushField(
      "Message",
      typeof payload.Message === "string" ? payload.Message : undefined,
    );
    pushField("MessageId", payload.MessageId);
    pushField("Subject", payload.Subject);
    pushField("Timestamp", payload.Timestamp);
    pushField("TopicArn", payload.TopicArn);
    pushField("Type", payload.Type);
    return fields.join("");
  }

  pushField(
    "Message",
    typeof payload.Message === "string" ? payload.Message : undefined,
  );
  pushField("MessageId", payload.MessageId);
  pushField("SubscribeURL", payload.SubscribeURL);
  pushField("Timestamp", payload.Timestamp);
  pushField("Token", payload.Token);
  pushField("TopicArn", payload.TopicArn);
  pushField("Type", payload.Type);
  return fields.join("");
};

const isAllowedCertUrl = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      !hostname.endsWith(".amazonaws.com") &&
      hostname !== "sns.amazonaws.com"
    ) {
      return false;
    }

    return parsed.pathname.includes("SimpleNotificationService");
  } catch {
    return false;
  }
};

const getString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() ? value : undefined;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => {
    return typeof item === "string" && item.trim().length > 0;
  });
};

export class SesWebhookHandler implements IWebhookHandler {
  readonly provider = PROVIDER_NAME;

  private readonly allowedTopicArn?: string;

  constructor() {
    this.allowedTopicArn = getOptionalEnv("EMAIL_SES_WEBHOOK_TOPIC_ARN");
  }

  async verify(
    payload: Buffer | string,
    _headers: Record<string, string>,
  ): Promise<boolean> {
    const payloadString =
      typeof payload === "string" ? payload : payload.toString("utf8");
    let envelope: SnsEnvelope;

    try {
      envelope = JSON.parse(payloadString) as SnsEnvelope;
    } catch {
      log.warn?.("SesWebhook: Payload is not valid JSON");
      return false;
    }

    if (!envelope.Type || !envelope.Signature || !envelope.SignatureVersion) {
      log.warn?.("SesWebhook: Missing SNS signature fields");
      return false;
    }

    if (this.allowedTopicArn && envelope.TopicArn !== this.allowedTopicArn) {
      log.warn?.(
        formatHierarchicalLog("SesWebhook: Unexpected SNS topic ARN", [
          formatCompactLogLine([
            ["received", formatCompactLogText(envelope.TopicArn)],
          ]),
        ]),
      );
      return false;
    }

    if (!isAllowedCertUrl(envelope.SigningCertURL)) {
      log.warn?.("SesWebhook: Invalid SNS certificate URL");
      return false;
    }

    const algorithm = getSigningAlgorithm(envelope.SignatureVersion);
    if (!algorithm) {
      log.warn?.(
        formatHierarchicalLog("SesWebhook: Unsupported SNS signature version", [
          formatCompactLogLine([
            ["version", formatCompactLogText(envelope.SignatureVersion)],
          ]),
        ]),
      );
      return false;
    }

    const certResponse = await requestWithTimeout(
      "SES webhook certificate fetch",
      async (signal) => {
        return fetch(envelope.SigningCertURL!, { signal });
      },
    );
    if (!certResponse.ok) {
      log.warn?.(
        formatHierarchicalLog(
          "SesWebhook: Failed to fetch signing certificate",
          [formatCompactLogLine([["status", String(certResponse.status)]])],
        ),
      );
      return false;
    }

    const certificate = await certResponse.text();
    const verifier = crypto.createVerify(algorithm);
    verifier.update(buildSnsStringToSign(envelope), "utf8");
    verifier.end();

    try {
      return verifier.verify(certificate, envelope.Signature, "base64");
    } catch (error) {
      log.error?.(
        formatHierarchicalLog("SesWebhook: Signature verification failed", [
          formatCompactLogLine([
            [
              "error",
              formatCompactLogText(
                error instanceof Error ? error.message : String(error),
              ),
            ],
          ]),
        ]),
      );
      return false;
    }
  }

  async preprocess(payload: unknown): Promise<SnsEnvelope | null> {
    const envelope = payload as SnsEnvelope;

    if (envelope.Type === "SubscriptionConfirmation" && envelope.SubscribeURL) {
      await requestWithTimeout(
        "SES webhook subscription confirmation",
        async (signal) => {
          return fetch(envelope.SubscribeURL!, {
            method: "GET",
            signal,
          });
        },
      );
      log.info?.(
        formatHierarchicalLog("SesWebhook: SNS subscription confirmed", [
          formatCompactLogLine([
            ["topicArn", formatCompactLogText(envelope.TopicArn)],
          ]),
        ]),
      );
      return null;
    }

    if (envelope.Type === "UnsubscribeConfirmation") {
      log.warn?.(
        formatHierarchicalLog(
          "SesWebhook: Received SNS unsubscribe confirmation",
          [
            formatCompactLogLine([
              ["topicArn", formatCompactLogText(envelope.TopicArn)],
            ]),
          ],
        ),
      );
      return null;
    }

    return envelope;
  }

  parse(payload: unknown): WebhookEvent[] {
    const envelope = payload as SnsEnvelope;
    if (envelope.Type !== "Notification") {
      return [];
    }

    const message: SesNotification =
      typeof envelope.Message === "string"
        ? (JSON.parse(envelope.Message) as SesNotification)
        : (envelope.Message as SesNotification | undefined) || {};
    const messageType = (
      getString(message.notificationType) ||
      getString(message.eventType) ||
      ""
    ).toLowerCase();
    const messageTimestamp = new Date(
      getString(message.mail?.timestamp) ||
        getString(envelope.Timestamp) ||
        new Date().toISOString(),
    );
    const messageId = getString(message.mail?.messageId) || envelope.MessageId;

    if (messageType === "bounce") {
      return (message.bounce?.bouncedRecipients || [])
        .map((recipient) => {
          const email = getString(recipient.emailAddress);
          if (!email) {
            return null;
          }

          const event: BounceEvent = {
            type: "bounce",
            provider: PROVIDER_NAME,
            timestamp: new Date(
              getString(message.bounce?.timestamp) || messageTimestamp,
            ),
            email,
            messageId,
            bounceType: getBounceType(message.bounce?.bounceType),
            reason: getString(recipient.diagnosticCode),
            errorCode:
              getString(recipient.status) ||
              getString(message.bounce?.bounceSubType),
            raw: envelope,
          };
          return event;
        })
        .filter((event): event is BounceEvent => Boolean(event));
    }

    if (messageType === "complaint") {
      return (message.complaint?.complainedRecipients || [])
        .map((recipient) => {
          const email = getString(recipient.emailAddress);
          if (!email) {
            return null;
          }

          const event: ComplaintEvent = {
            type: "complaint",
            provider: PROVIDER_NAME,
            timestamp: new Date(
              getString(message.complaint?.timestamp) || messageTimestamp,
            ),
            email,
            messageId,
            feedbackType: getString(message.complaint?.complaintFeedbackType),
            raw: envelope,
          };
          return event;
        })
        .filter((event): event is ComplaintEvent => Boolean(event));
    }

    if (messageType === "delivery") {
      return (message.delivery?.recipients || message.mail?.destination || [])
        .map((email) => {
          const recipientEmail = getString(email);
          if (!recipientEmail) {
            return null;
          }

          const event: DeliveryEvent = {
            type: "delivered",
            provider: PROVIDER_NAME,
            timestamp: new Date(
              getString(message.delivery?.timestamp) || messageTimestamp,
            ),
            email: recipientEmail,
            messageId,
            smtpResponse: getString(message.delivery?.smtpResponse),
            raw: envelope,
          };
          return event;
        })
        .filter((event): event is DeliveryEvent => Boolean(event));
    }

    return [];
  }
}

export const createSesWebhookHandler = (): IWebhookHandler => {
  return new SesWebhookHandler();
};
