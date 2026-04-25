import crypto from "node:crypto";
import { log, optionsManager } from "../../../../utils/index.js";
import env from "../../env.js";
import { formatCompactLogLine, formatHierarchicalLog, formatCompactLogText, } from "../logFormat.js";
const PROVIDER_NAME = "mailerlite";
const EVENT_TYPE_MAP = {
    "subscriber.bounced": "bounce",
    "subscriber.complained": "complaint",
    "subscriber.unsubscribed": "unsubscribe",
    "campaign.sent": "delivered",
    "subscriber.opened": "opened",
    "subscriber.clicked": "clicked",
    "subscriber.spam_reported": "spam_report",
};
const BOUNCE_TYPE_MAP = {
    hard: "hard",
    soft: "soft",
};
const asRecord = (value) => {
    if (typeof value === "object" && value !== null) {
        return value;
    }
    return {};
};
const getString = (value) => {
    return typeof value === "string" && value.trim() ? value : undefined;
};
export class MailerliteWebhookHandler {
    provider = PROVIDER_NAME;
    webhookSecret;
    constructor() {
        const configuredSecret = optionsManager.getOption("ENV", "EMAIL_MAILERLITE_WEBHOOK_SECRET") || env.EMAIL_MAILERLITE_WEBHOOK_SECRET;
        this.webhookSecret = configuredSecret || null;
    }
    verify(payload, headers) {
        if (!this.webhookSecret) {
            log.warn?.("MailerliteWebhook: No webhook secret configured, rejecting request");
            return false;
        }
        const signature = headers["x-mailerlite-signature"] || headers["X-MailerLite-Signature"];
        if (!signature) {
            log.warn?.("MailerliteWebhook: Missing signature header");
            return false;
        }
        try {
            const payloadString = typeof payload === "string" ? payload : payload.toString("utf8");
            const expectedSignature = crypto
                .createHmac("sha256", this.webhookSecret)
                .update(payloadString)
                .digest("hex");
            const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
            if (!isValid) {
                log.warn?.("MailerliteWebhook: Invalid signature");
            }
            return isValid;
        }
        catch (error) {
            log.error?.(formatHierarchicalLog("MailerliteWebhook: Signature verification failed", [
                formatCompactLogLine([
                    [
                        "error",
                        formatCompactLogText(error instanceof Error ? error.message : String(error)),
                    ],
                ]),
            ]));
            return false;
        }
    }
    parse(payload) {
        const items = Array.isArray(payload) ? payload : [payload];
        const events = [];
        for (const item of items) {
            const event = this.parseEvent(item);
            if (event) {
                events.push(event);
            }
        }
        return events;
    }
    parseEvent(payload) {
        const data = asRecord(payload);
        const eventType = getString(data.type) || getString(data.event);
        const normalizedType = eventType ? EVENT_TYPE_MAP[eventType] : undefined;
        if (!normalizedType) {
            if (eventType) {
                log.debug?.(formatHierarchicalLog("MailerliteWebhook: Unknown event type", [
                    formatCompactLogLine([
                        ["eventType", formatCompactLogText(eventType)],
                    ]),
                ]));
            }
            return null;
        }
        const subscriber = asRecord(data.subscriber);
        const nestedData = asRecord(data.data);
        const email = getString(data.email) ||
            getString(subscriber.email) ||
            getString(nestedData.email);
        if (!email) {
            return null;
        }
        const baseEvent = {
            provider: PROVIDER_NAME,
            timestamp: new Date(getString(data.timestamp) || getString(data.created_at) || Date.now()),
            email,
            messageId: getString(data.message_id) || getString(nestedData.message_id),
            raw: payload,
        };
        switch (normalizedType) {
            case "bounce":
                return this.parseBounceEvent(baseEvent, data, nestedData);
            case "complaint":
            case "spam_report":
                return this.parseComplaintEvent(baseEvent, data, nestedData, normalizedType);
            case "unsubscribe":
                return this.parseUnsubscribeEvent(baseEvent, data);
            case "delivered":
                return this.parseDeliveryEvent(baseEvent, data, nestedData);
            case "opened":
                return this.parseOpenEvent(baseEvent, data, nestedData);
            case "clicked":
                return this.parseClickEvent(baseEvent, data, nestedData);
            default:
                return null;
        }
    }
    parseBounceEvent(baseEvent, data, nestedData) {
        const bounceType = BOUNCE_TYPE_MAP[getString(data.bounce_type) || ""] || "undetermined";
        return {
            ...baseEvent,
            type: "bounce",
            bounceType,
            reason: getString(data.reason) ||
                getString(data.bounce_reason) ||
                getString(nestedData.reason),
            errorCode: getString(data.error_code) || getString(nestedData.error_code),
        };
    }
    parseComplaintEvent(baseEvent, data, nestedData, type) {
        return {
            ...baseEvent,
            type,
            feedbackType: getString(data.feedback_type) || getString(nestedData.feedback_type),
        };
    }
    parseUnsubscribeEvent(baseEvent, data) {
        return {
            ...baseEvent,
            type: "unsubscribe",
            method: getString(data.method) || getString(data.unsubscribe_type) || "link",
        };
    }
    parseDeliveryEvent(baseEvent, data, nestedData) {
        return {
            ...baseEvent,
            type: "delivered",
            smtpResponse: getString(data.smtp_response) || getString(nestedData.smtp_response),
        };
    }
    parseOpenEvent(baseEvent, data, nestedData) {
        return {
            ...baseEvent,
            type: "opened",
            userAgent: getString(data.user_agent) || getString(nestedData.user_agent),
            ipAddress: getString(data.ip) ||
                getString(data.ip_address) ||
                getString(nestedData.ip),
        };
    }
    parseClickEvent(baseEvent, data, nestedData) {
        return {
            ...baseEvent,
            type: "clicked",
            url: getString(data.url) ||
                getString(data.link) ||
                getString(nestedData.url),
            userAgent: getString(data.user_agent) || getString(nestedData.user_agent),
            ipAddress: getString(data.ip) ||
                getString(data.ip_address) ||
                getString(nestedData.ip),
        };
    }
}
export const createMailerliteWebhookHandler = () => {
    return new MailerliteWebhookHandler();
};
//# sourceMappingURL=mailerlite.js.map