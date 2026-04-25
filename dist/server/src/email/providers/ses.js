import { AttachmentContentDisposition, AttachmentContentTransferEncoding, GetAccountCommand, SESv2Client, SendEmailCommand, } from "@aws-sdk/client-sesv2";
import { log } from "../../../../utils/index.js";
import { getAttachmentContentBuffer, getAttachmentContentType, } from "../attachments.js";
import { formatEmailAddress, normalizeEmailAddress } from "../address.js";
import { EmailProviderError } from "../errors.js";
import { formatCompactLogLine, formatCompactLogList, formatHierarchicalLog, formatCompactLogText, formatCompactLogValue, } from "../logFormat.js";
const PROVIDER_NAME = "ses";
const TAG_INVALID_CHARS = /[^A-Za-z0-9_-]+/g;
const TAG_EDGE_SEPARATORS = /^[-_]+|[-_]+$/g;
const TAG_LIMIT = 256;
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
        .replace(TAG_INVALID_CHARS, "-")
        .replace(TAG_EDGE_SEPARATORS, "")
        .slice(0, TAG_LIMIT);
    return sanitized || fallback;
};
const normalizeStringTag = (tag, index) => {
    const trimmedTag = trimToDefinedString(tag);
    if (!trimmedTag) {
        return undefined;
    }
    const separatorIndex = trimmedTag.indexOf(":");
    if (separatorIndex > 0 && separatorIndex < trimmedTag.length - 1) {
        return {
            Name: sanitizeTagPart(trimmedTag.slice(0, separatorIndex), `tag_${index + 1}`),
            Value: sanitizeTagPart(trimmedTag.slice(separatorIndex + 1), `value_${index + 1}`),
        };
    }
    return {
        Name: `tag_${index + 1}`,
        Value: sanitizeTagPart(trimmedTag, `value_${index + 1}`),
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
            Name: sanitizeTagPart(isRecord(tag) ? tag.name : undefined, `tag_${index + 1}`),
            Value: sanitizeTagPart(isRecord(tag) ? tag.value : undefined, `value_${index + 1}`),
        });
    }
    return normalizedTags.length > 0 ? normalizedTags : undefined;
};
const normalizeListManagementOptions = (options) => {
    if (!isRecord(options)) {
        return undefined;
    }
    const contactListName = trimToDefinedString(("contactListName" in options ? options.contactListName : undefined) ??
        ("ContactListName" in options ? options.ContactListName : undefined));
    if (!contactListName) {
        return undefined;
    }
    const topicName = trimToDefinedString(("topicName" in options ? options.topicName : undefined) ??
        ("TopicName" in options ? options.TopicName : undefined));
    return {
        ContactListName: contactListName,
        ...(topicName ? { TopicName: topicName } : {}),
    };
};
const appendHeader = (headers, name, value) => {
    const trimmedValue = trimToDefinedString(value);
    if (!trimmedValue) {
        return;
    }
    const normalizedName = name.trim();
    if (!normalizedName) {
        return;
    }
    const exists = headers.some((header) => {
        return header.Name?.toLowerCase() === normalizedName.toLowerCase();
    });
    if (!exists) {
        headers.push({
            Name: normalizedName,
            Value: trimmedValue,
        });
    }
};
export class SesEmailProvider {
    name = PROVIDER_NAME;
    enabled;
    config;
    runtime;
    client = null;
    initialized = false;
    constructor(config, runtime = {
        SESv2Client,
        SendEmailCommand,
        GetAccountCommand,
    }) {
        this.config = config;
        this.enabled = config.enabled;
        this.runtime = runtime;
    }
    async initialize() {
        if (this.initialized && this.client) {
            return;
        }
        try {
            const clientConfig = {
                region: this.config.region,
            };
            if (this.config.endpoint) {
                clientConfig.endpoint = this.config.endpoint;
            }
            if (this.config.accessKeyId && this.config.secretAccessKey) {
                clientConfig.credentials = {
                    accessKeyId: this.config.accessKeyId,
                    secretAccessKey: this.config.secretAccessKey,
                    sessionToken: this.config.sessionToken,
                };
            }
            this.client = new this.runtime.SESv2Client(clientConfig);
            this.initialized = true;
            log.info?.(formatHierarchicalLog("SesProvider: Initialized", [
                formatCompactLogLine([
                    ["region", formatCompactLogText(this.config.region)],
                    ["endpoint", formatCompactLogText(this.config.endpoint)],
                ]),
            ]));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new EmailProviderError(`Failed to initialize Amazon SES provider: ${message}`, PROVIDER_NAME, { retryable: false });
        }
    }
    async send(message, options) {
        if (!this.initialized || !this.client) {
            await this.initialize();
        }
        const sendOptions = options;
        const body = {};
        if (message.html) {
            body.Html = {
                Data: message.html,
                Charset: "UTF-8",
            };
        }
        if (message.text !== undefined) {
            body.Text = {
                Data: message.text,
                Charset: "UTF-8",
            };
        }
        const headers = [];
        const normalizedFrom = normalizeEmailAddress(message.from);
        const normalizedTo = message.to.map((address) => normalizeEmailAddress(address));
        const normalizedCc = message.cc?.map((address) => normalizeEmailAddress(address));
        const normalizedBcc = message.bcc?.map((address) => normalizeEmailAddress(address));
        const normalizedReplyTo = message.replyTo
            ? normalizeEmailAddress(message.replyTo)
            : undefined;
        for (const [name, value] of Object.entries(message.headers || {})) {
            appendHeader(headers, name, value);
        }
        appendHeader(headers, "X-Priority", message.priority === "high"
            ? "1"
            : message.priority === "low"
                ? "5"
                : undefined);
        appendHeader(headers, "In-Reply-To", message.inReplyTo);
        appendHeader(headers, "References", message.references?.join(" "));
        const input = {
            FromEmailAddress: formatEmailAddress(normalizedFrom),
            Destination: {
                ToAddresses: normalizedTo.map((address) => address.email),
                ...(normalizedCc?.length
                    ? { CcAddresses: normalizedCc.map((address) => address.email) }
                    : {}),
                ...(normalizedBcc?.length
                    ? { BccAddresses: normalizedBcc.map((address) => address.email) }
                    : {}),
            },
            ...(normalizedReplyTo
                ? { ReplyToAddresses: [normalizedReplyTo.email] }
                : {}),
            Content: {
                Simple: {
                    Subject: {
                        Data: message.subject,
                        Charset: "UTF-8",
                    },
                    Body: body,
                    ...(headers.length ? { Headers: headers } : {}),
                    ...(message.attachments?.length
                        ? {
                            Attachments: message.attachments.map((attachment) => ({
                                FileName: attachment.filename,
                                RawContent: getAttachmentContentBuffer(attachment),
                                ContentDisposition: attachment.disposition === "inline"
                                    ? AttachmentContentDisposition.INLINE
                                    : AttachmentContentDisposition.ATTACHMENT,
                                ContentTransferEncoding: AttachmentContentTransferEncoding.BASE64,
                                ...(getAttachmentContentType(attachment)
                                    ? {
                                        ContentType: getAttachmentContentType(attachment),
                                    }
                                    : {}),
                                ...(attachment.contentId
                                    ? { ContentId: attachment.contentId }
                                    : {}),
                            })),
                        }
                        : {}),
                },
            },
            ConfigurationSetName: sendOptions?.configurationSetName || this.config.configurationSetName,
            FeedbackForwardingEmailAddress: sendOptions?.feedbackForwardingEmailAddress ||
                this.config.feedbackForwardingEmailAddress,
            FeedbackForwardingEmailAddressIdentityArn: sendOptions?.feedbackForwardingEmailAddressIdentityArn ||
                this.config.feedbackForwardingEmailAddressIdentityArn,
            FromEmailAddressIdentityArn: sendOptions?.fromEmailAddressIdentityArn ||
                this.config.fromEmailAddressIdentityArn,
            EndpointId: sendOptions?.endpointId || this.config.endpointId,
            TenantName: sendOptions?.tenantName || this.config.tenantName,
        };
        const normalizedTags = normalizeTags(sendOptions?.tags);
        if (normalizedTags?.length) {
            input.EmailTags = normalizedTags;
        }
        const listManagementOptions = normalizeListManagementOptions(sendOptions?.listManagementOptions);
        if (listManagementOptions) {
            input.ListManagementOptions = listManagementOptions;
        }
        try {
            const response = await this.client.send(new this.runtime.SendEmailCommand(input));
            const messageId = response.MessageId || message.messageId;
            log.info?.(formatHierarchicalLog("SesProvider: Email sent", [
                formatCompactLogLine([
                    ["messageId", formatCompactLogValue(messageId)],
                    ["subject", formatCompactLogText(message.subject)],
                ]),
                formatCompactLogLine([
                    [
                        "to",
                        formatCompactLogList(normalizedTo.map((address) => address.email)),
                    ],
                ]),
            ]));
            return {
                success: true,
                messageId,
                provider: PROVIDER_NAME,
                timestamp: new Date(),
                providerResponse: response,
            };
        }
        catch (err) {
            const providerCode = err?.name || err?.Code || err?.code || err?.$metadata?.httpStatusCode;
            throw new EmailProviderError(`Amazon SES send failed: ${err?.message || String(err)}`, PROVIDER_NAME, {
                retryable: this.isRetryableError(err),
                providerCode: providerCode ? String(providerCode) : undefined,
                context: {
                    status: err?.$metadata?.httpStatusCode,
                    fault: err?.$fault,
                },
            });
        }
    }
    async healthCheck() {
        const start = Date.now();
        try {
            if (!this.initialized || !this.client) {
                await this.initialize();
            }
            await this.client.send(new this.runtime.GetAccountCommand({}));
            return {
                provider: PROVIDER_NAME,
                healthy: true,
                lastCheck: new Date(),
                latencyMs: Date.now() - start,
            };
        }
        catch (err) {
            return {
                provider: PROVIDER_NAME,
                healthy: false,
                lastCheck: new Date(),
                error: err?.message || String(err),
                latencyMs: Date.now() - start,
            };
        }
    }
    async dispose() {
        this.client?.destroy();
        this.client = null;
        this.initialized = false;
        log.debug?.("SesProvider: Disposed");
    }
    isRetryableError(err) {
        if (!(err instanceof Error)) {
            return false;
        }
        const status = err?.$metadata?.httpStatusCode;
        if (status === 429) {
            return true;
        }
        if (typeof status === "number" && status >= 500 && status < 600) {
            return true;
        }
        const name = (err?.name || "").toLowerCase();
        if (name.includes("throttl") ||
            name.includes("timeout") ||
            name.includes("network") ||
            name.includes("requesttimeout")) {
            return true;
        }
        const message = err.message.toLowerCase();
        return (message.includes("timeout") ||
            message.includes("econnrefused") ||
            message.includes("enotfound") ||
            message.includes("network"));
    }
}
export const isConfigured = () => {
    return !!(process.env.EMAIL_SES_ENABLED === "true" &&
        (process.env.EMAIL_SES_REGION ||
            process.env.AWS_REGION ||
            process.env.AWS_DEFAULT_REGION));
};
export const createSesProvider = (config, runtime) => {
    return new SesEmailProvider(config, runtime);
};
//# sourceMappingURL=ses.js.map