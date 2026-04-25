import crypto from "node:crypto";
import { log, optionsManager } from "../../../../utils/index.js";
import env from "../../env.js";
import {
  formatCompactLogLine,
  formatHierarchicalLog,
  formatCompactLogText,
} from "../logFormat.js";
import type {
  BounceEvent,
  BounceType,
  ClickEvent,
  ComplaintEvent,
  DeliveryEvent,
  IWebhookHandler,
  OpenEvent,
  UnsubscribeEvent,
  WebhookEvent,
} from "./types.js";

const PROVIDER_NAME = "resend";
const TIMESTAMP_TOLERANCE_SECONDS = 300;

interface ResendWebhookEnvelope {
  type?: string;
  created_at?: string;
  data?: Record<string, unknown>;
}

const getHeaderValue = (
  headers: Record<string, string>,
  key: string,
): string | undefined => {
  return (
    headers[key] || headers[key.toLowerCase()] || headers[key.toUpperCase()]
  );
};

const timingSafeEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() ? value : undefined;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => {
    return typeof item === "string" && item.trim().length > 0;
  });
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

const getRecipientEmails = (data: Record<string, unknown>): string[] => {
  return asStringArray(data.to);
};

export class ResendWebhookHandler implements IWebhookHandler {
  readonly provider = PROVIDER_NAME;

  private readonly webhookSecret: string | null;

  constructor() {
    const configuredSecret =
      (optionsManager.getOption("ENV", "EMAIL_RESEND_WEBHOOK_SECRET") as
        | string
        | undefined) || env.EMAIL_RESEND_WEBHOOK_SECRET;

    this.webhookSecret = configuredSecret || null;
  }

  async verify(
    payload: Buffer | string,
    headers: Record<string, string>,
  ): Promise<boolean> {
    if (!this.webhookSecret) {
      log.warn?.(
        "ResendWebhook: No webhook secret configured, rejecting request",
      );
      return false;
    }

    const id =
      getHeaderValue(headers, "svix-id") ||
      getHeaderValue(headers, "webhook-id");
    const timestamp =
      getHeaderValue(headers, "svix-timestamp") ||
      getHeaderValue(headers, "webhook-timestamp");
    const signatureHeader =
      getHeaderValue(headers, "svix-signature") ||
      getHeaderValue(headers, "webhook-signature");

    if (!id || !timestamp || !signatureHeader) {
      log.warn?.("ResendWebhook: Missing verification headers");
      return false;
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      log.warn?.("ResendWebhook: Invalid timestamp header");
      return false;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampSeconds) > TIMESTAMP_TOLERANCE_SECONDS) {
      log.warn?.(
        formatHierarchicalLog("ResendWebhook: Timestamp outside tolerance", [
          formatCompactLogLine([
            ["timestamp", formatCompactLogText(timestamp)],
          ]),
        ]),
      );
      return false;
    }

    const payloadString =
      typeof payload === "string" ? payload : payload.toString("utf8");
    const signedContent = `${id}.${timestamp}.${payloadString}`;
    const secret = this.webhookSecret.startsWith("whsec_")
      ? this.webhookSecret.slice(6)
      : this.webhookSecret;
    const secretBytes = Buffer.from(secret, "base64");
    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");
    const signatures = signatureHeader
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        return value.startsWith("v1,") ? value.slice(3) : undefined;
      })
      .filter((value): value is string => Boolean(value));

    return signatures.some((signature) => {
      return timingSafeEquals(signature, expectedSignature);
    });
  }

  parse(payload: unknown): WebhookEvent[] {
    const items = Array.isArray(payload) ? payload : [payload];
    const events: WebhookEvent[] = [];

    for (const item of items) {
      const envelope = item as ResendWebhookEnvelope;
      if (!envelope?.type || !envelope.data) {
        continue;
      }

      const createdAt = envelope.created_at || new Date().toISOString();
      const data = asRecord(envelope.data);
      const recipientEmails = getRecipientEmails(data);

      if (envelope.type === "email.bounced") {
        const bounce = asRecord(data.bounce);
        for (const email of recipientEmails) {
          const event: BounceEvent = {
            type: "bounce",
            provider: PROVIDER_NAME,
            timestamp: new Date(createdAt),
            email,
            messageId: getString(data.email_id),
            bounceType: getBounceType(bounce.type),
            reason:
              getString(bounce.message) || getString(bounce.diagnosticCode),
            errorCode: getString(bounce.subType),
            raw: envelope,
          };
          events.push(event);
        }
        continue;
      }

      if (envelope.type === "email.complained") {
        const complaint = asRecord(data.complaint);
        for (const email of recipientEmails) {
          const event: ComplaintEvent = {
            type: "complaint",
            provider: PROVIDER_NAME,
            timestamp: new Date(createdAt),
            email,
            messageId: getString(data.email_id),
            feedbackType: getString(complaint.type),
            raw: envelope,
          };
          events.push(event);
        }
        continue;
      }

      if (envelope.type === "email.delivered") {
        const delivery = asRecord(data.delivery);
        for (const email of recipientEmails) {
          const event: DeliveryEvent = {
            type: "delivered",
            provider: PROVIDER_NAME,
            timestamp: new Date(createdAt),
            email,
            messageId: getString(data.email_id),
            smtpResponse: getString(delivery.message),
            raw: envelope,
          };
          events.push(event);
        }
        continue;
      }

      if (envelope.type === "email.opened") {
        const open = asRecord(data.open);
        for (const email of recipientEmails) {
          const event: OpenEvent = {
            type: "opened",
            provider: PROVIDER_NAME,
            timestamp: new Date(getString(open.timestamp) || createdAt),
            email,
            messageId: getString(data.email_id),
            userAgent: getString(open.userAgent),
            ipAddress: getString(open.ipAddress),
            raw: envelope,
          };
          events.push(event);
        }
        continue;
      }

      if (envelope.type === "email.clicked") {
        const click = asRecord(data.click);
        for (const email of recipientEmails) {
          const event: ClickEvent = {
            type: "clicked",
            provider: PROVIDER_NAME,
            timestamp: new Date(getString(click.timestamp) || createdAt),
            email,
            messageId: getString(data.email_id),
            url: getString(click.link),
            userAgent: getString(click.userAgent),
            ipAddress: getString(click.ipAddress),
            raw: envelope,
          };
          events.push(event);
        }
        continue;
      }

      if (envelope.type === "contact.updated" && data.unsubscribed === true) {
        const email = getString(data.email);
        if (!email) {
          continue;
        }

        const event: UnsubscribeEvent = {
          type: "unsubscribe",
          provider: PROVIDER_NAME,
          timestamp: new Date(createdAt),
          email,
          method: "provider-contact-update",
          raw: envelope,
        };
        events.push(event);
      }
    }

    return events;
  }
}

export const createResendWebhookHandler = (): IWebhookHandler => {
  return new ResendWebhookHandler();
};
