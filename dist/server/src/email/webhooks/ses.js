import crypto from "node:crypto";
import { log, optionsManager } from "../../../../utils/index.js";
import env from "../../env.js";
import { requestWithTimeout } from "../requestTimeout.js";
const PROVIDER_NAME = "ses";
const getOptionalEnv = (key) => {
    const value = optionsManager.getOption("ENV", key) || env[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
};
const getBounceType = (value) => {
    const normalized = typeof value === "string" ? value.toLowerCase() : "";
    if (normalized === "hard") {
        return "hard";
    }
    if (normalized === "soft") {
        return "soft";
    }
    return "undetermined";
};
const getSigningAlgorithm = (value) => {
    if (value === "1") {
        return "RSA-SHA1";
    }
    if (value === "2") {
        return "RSA-SHA256";
    }
    return null;
};
const buildSnsStringToSign = (payload) => {
    const fields = [];
    const pushField = (key, value) => {
        if (value === undefined || value === "") {
            return;
        }
        fields.push(`${key}\n${value}\n`);
    };
    if (payload.Type === "Notification") {
        pushField("Message", typeof payload.Message === "string" ? payload.Message : undefined);
        pushField("MessageId", payload.MessageId);
        pushField("Subject", payload.Subject);
        pushField("Timestamp", payload.Timestamp);
        pushField("TopicArn", payload.TopicArn);
        pushField("Type", payload.Type);
        return fields.join("");
    }
    pushField("Message", typeof payload.Message === "string" ? payload.Message : undefined);
    pushField("MessageId", payload.MessageId);
    pushField("SubscribeURL", payload.SubscribeURL);
    pushField("Timestamp", payload.Timestamp);
    pushField("Token", payload.Token);
    pushField("TopicArn", payload.TopicArn);
    pushField("Type", payload.Type);
    return fields.join("");
};
const isAllowedCertUrl = (value) => {
    if (!value) {
        return false;
    }
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== "https:") {
            return false;
        }
        const hostname = parsed.hostname.toLowerCase();
        if (!hostname.endsWith(".amazonaws.com") &&
            hostname !== "sns.amazonaws.com") {
            return false;
        }
        return parsed.pathname.includes("SimpleNotificationService");
    }
    catch {
        return false;
    }
};
const getString = (value) => {
    return typeof value === "string" && value.trim() ? value : undefined;
};
const asStringArray = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item) => {
        return typeof item === "string" && item.trim().length > 0;
    });
};
export class SesWebhookHandler {
    provider = PROVIDER_NAME;
    allowedTopicArn;
    constructor() {
        this.allowedTopicArn = getOptionalEnv("EMAIL_SES_WEBHOOK_TOPIC_ARN");
    }
    async verify(payload, _headers) {
        const payloadString = typeof payload === "string" ? payload : payload.toString("utf8");
        let envelope;
        try {
            envelope = JSON.parse(payloadString);
        }
        catch {
            log.warn?.("SesWebhook: Payload is not valid JSON");
            return false;
        }
        if (!envelope.Type || !envelope.Signature || !envelope.SignatureVersion) {
            log.warn?.("SesWebhook: Missing SNS signature fields");
            return false;
        }
        if (this.allowedTopicArn && envelope.TopicArn !== this.allowedTopicArn) {
            log.warn?.("SesWebhook: Unexpected SNS topic ARN", {
                received: envelope.TopicArn,
            });
            return false;
        }
        if (!isAllowedCertUrl(envelope.SigningCertURL)) {
            log.warn?.("SesWebhook: Invalid SNS certificate URL");
            return false;
        }
        const algorithm = getSigningAlgorithm(envelope.SignatureVersion);
        if (!algorithm) {
            log.warn?.("SesWebhook: Unsupported SNS signature version", {
                version: envelope.SignatureVersion,
            });
            return false;
        }
        const certResponse = await requestWithTimeout("SES webhook certificate fetch", async (signal) => {
            return fetch(envelope.SigningCertURL, { signal });
        });
        if (!certResponse.ok) {
            log.warn?.("SesWebhook: Failed to fetch signing certificate", {
                status: certResponse.status,
            });
            return false;
        }
        const certificate = await certResponse.text();
        const verifier = crypto.createVerify(algorithm);
        verifier.update(buildSnsStringToSign(envelope), "utf8");
        verifier.end();
        try {
            return verifier.verify(certificate, envelope.Signature, "base64");
        }
        catch (error) {
            log.error?.("SesWebhook: Signature verification failed", {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    async preprocess(payload) {
        const envelope = payload;
        if (envelope.Type === "SubscriptionConfirmation" && envelope.SubscribeURL) {
            await requestWithTimeout("SES webhook subscription confirmation", async (signal) => {
                return fetch(envelope.SubscribeURL, {
                    method: "GET",
                    signal,
                });
            });
            log.info?.("SesWebhook: SNS subscription confirmed", {
                topicArn: envelope.TopicArn,
            });
            return null;
        }
        if (envelope.Type === "UnsubscribeConfirmation") {
            log.warn?.("SesWebhook: Received SNS unsubscribe confirmation", {
                topicArn: envelope.TopicArn,
            });
            return null;
        }
        return envelope;
    }
    parse(payload) {
        const envelope = payload;
        if (envelope.Type !== "Notification") {
            return [];
        }
        const message = typeof envelope.Message === "string"
            ? JSON.parse(envelope.Message)
            : envelope.Message || {};
        const messageType = (getString(message.notificationType) ||
            getString(message.eventType) ||
            "").toLowerCase();
        const messageTimestamp = new Date(getString(message.mail?.timestamp) ||
            getString(envelope.Timestamp) ||
            new Date().toISOString());
        const messageId = getString(message.mail?.messageId) || envelope.MessageId;
        if (messageType === "bounce") {
            return (message.bounce?.bouncedRecipients || [])
                .map((recipient) => {
                const email = getString(recipient.emailAddress);
                if (!email) {
                    return null;
                }
                const event = {
                    type: "bounce",
                    provider: PROVIDER_NAME,
                    timestamp: new Date(getString(message.bounce?.timestamp) || messageTimestamp),
                    email,
                    messageId,
                    bounceType: getBounceType(message.bounce?.bounceType),
                    reason: getString(recipient.diagnosticCode),
                    errorCode: getString(recipient.status) ||
                        getString(message.bounce?.bounceSubType),
                    raw: envelope,
                };
                return event;
            })
                .filter((event) => Boolean(event));
        }
        if (messageType === "complaint") {
            return (message.complaint?.complainedRecipients || [])
                .map((recipient) => {
                const email = getString(recipient.emailAddress);
                if (!email) {
                    return null;
                }
                const event = {
                    type: "complaint",
                    provider: PROVIDER_NAME,
                    timestamp: new Date(getString(message.complaint?.timestamp) || messageTimestamp),
                    email,
                    messageId,
                    feedbackType: getString(message.complaint?.complaintFeedbackType),
                    raw: envelope,
                };
                return event;
            })
                .filter((event) => Boolean(event));
        }
        if (messageType === "delivery") {
            return (message.delivery?.recipients || message.mail?.destination || [])
                .map((email) => {
                const recipientEmail = getString(email);
                if (!recipientEmail) {
                    return null;
                }
                const event = {
                    type: "delivered",
                    provider: PROVIDER_NAME,
                    timestamp: new Date(getString(message.delivery?.timestamp) || messageTimestamp),
                    email: recipientEmail,
                    messageId,
                    smtpResponse: getString(message.delivery?.smtpResponse),
                    raw: envelope,
                };
                return event;
            })
                .filter((event) => Boolean(event));
        }
        return [];
    }
}
export const createSesWebhookHandler = () => {
    return new SesWebhookHandler();
};
//# sourceMappingURL=ses.js.map