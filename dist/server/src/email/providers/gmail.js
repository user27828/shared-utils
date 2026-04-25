import nodemailer from "nodemailer";
import { log } from "../../../../utils/index.js";
import { getAttachmentContentBuffer, getAttachmentContentType, } from "../attachments.js";
import { extractEmailAddress, formatEmailAddress, normalizeEmailAddressValue, } from "../address.js";
import { EmailProviderError } from "../errors.js";
import { formatCompactLogLine, formatHierarchicalLog, formatCompactLogText, formatCompactLogValue, } from "../logFormat.js";
const PROVIDER_NAME = "gmail";
const GMAIL_SMTP = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
};
const getConfiguredSenderEmail = () => {
    const senderEmail = extractEmailAddress(process.env.EMAIL_DEFAULT_FROM);
    if (!senderEmail) {
        return undefined;
    }
    try {
        return normalizeEmailAddressValue(senderEmail, "EMAIL_DEFAULT_FROM");
    }
    catch {
        return undefined;
    }
};
export class GmailEmailProvider {
    name = PROVIDER_NAME;
    enabled;
    config;
    runtime;
    transporter = null;
    initialized = false;
    constructor(config, runtime = {
        createTransport: nodemailer.createTransport.bind(nodemailer),
    }) {
        this.config = config;
        this.enabled = config.enabled;
        this.runtime = runtime;
    }
    async initialize() {
        if (this.initialized && this.transporter) {
            return;
        }
        try {
            if (this.config.authMode === "oauth2") {
                await this.initializeOAuth2();
            }
            else {
                await this.initializeSMTP();
            }
            await this.transporter.verify();
            log.info?.(formatHierarchicalLog("GmailProvider: Initialized", [
                formatCompactLogLine([
                    ["authMode", formatCompactLogText(this.config.authMode)],
                ]),
            ]));
            this.initialized = true;
        }
        catch (err) {
            this.transporter = null;
            if (err instanceof EmailProviderError) {
                throw err;
            }
            const message = err instanceof Error ? err.message : String(err);
            throw new EmailProviderError(`Failed to initialize Gmail provider: ${message}`, PROVIDER_NAME, {
                retryable: true,
                context: { authMode: this.config.authMode },
            });
        }
    }
    async initializeOAuth2() {
        if (!this.config.oauth2) {
            throw new EmailProviderError("OAuth2 configuration is required for OAuth2 auth mode", PROVIDER_NAME, { retryable: false });
        }
        const { clientId, clientSecret, refreshToken, accessToken } = this.config.oauth2;
        const senderEmail = this.resolveSenderEmail();
        this.transporter = this.runtime.createTransport({
            host: GMAIL_SMTP.host,
            port: GMAIL_SMTP.port,
            secure: GMAIL_SMTP.secure,
            auth: {
                type: "OAuth2",
                user: senderEmail,
                clientId,
                clientSecret,
                refreshToken,
                accessToken,
            },
        });
        log.debug?.("GmailProvider: OAuth2 transporter created");
    }
    async initializeSMTP() {
        if (!this.config.smtp) {
            throw new EmailProviderError("SMTP configuration is required for SMTP auth mode", PROVIDER_NAME, { retryable: false });
        }
        const { user, appPassword } = this.config.smtp;
        this.transporter = this.runtime.createTransport({
            host: GMAIL_SMTP.host,
            port: GMAIL_SMTP.port,
            secure: GMAIL_SMTP.secure,
            auth: {
                user,
                pass: appPassword,
            },
        });
        log.debug?.("GmailProvider: SMTP transporter created");
    }
    resolveSenderEmail() {
        const senderEmail = extractEmailAddress(this.config.senderEmail);
        if (senderEmail) {
            return normalizeEmailAddressValue(senderEmail, "senderEmail");
        }
        throw new EmailProviderError("Gmail OAuth2 mode requires config.senderEmail", PROVIDER_NAME, { retryable: false });
    }
    async send(message, _options) {
        if (!this.initialized || !this.transporter) {
            await this.initialize();
        }
        const mailOptions = this.buildMailOptions(message);
        try {
            const info = await this.transporter.sendMail(mailOptions);
            log.info?.(formatHierarchicalLog("GmailProvider: Email sent", [
                formatCompactLogLine([
                    ["messageId", formatCompactLogValue(info.messageId)],
                    ["subject", formatCompactLogText(message.subject)],
                ]),
            ]));
            return {
                success: true,
                messageId: info.messageId,
                provider: PROVIDER_NAME,
                timestamp: new Date(),
                providerResponse: {
                    accepted: info.accepted,
                    rejected: info.rejected,
                    response: info.response,
                },
            };
        }
        catch (err) {
            log.error?.(formatHierarchicalLog("GmailProvider: Send failed", [
                formatCompactLogLine([
                    [
                        "code",
                        formatCompactLogValue(err.code ? String(err.code) : undefined),
                    ],
                    [
                        "to",
                        `[ ${message.to.map((address) => formatCompactLogText(address.email)).join(", ")} ]`,
                    ],
                ]),
                formatCompactLogLine([["error", formatCompactLogText(err.message)]]),
            ]));
            throw new EmailProviderError(`Gmail send failed: ${err.message}`, PROVIDER_NAME, {
                retryable: this.isRetryableError(err),
                providerCode: err.code,
                context: {
                    responseCode: err.responseCode,
                    command: err.command,
                },
            });
        }
    }
    buildMailOptions(message) {
        const options = {
            from: formatEmailAddress(message.from),
            to: message.to.map(formatEmailAddress),
            subject: message.subject,
            messageId: message.messageId,
        };
        if (message.cc?.length) {
            options.cc = message.cc.map(formatEmailAddress);
        }
        if (message.bcc?.length) {
            options.bcc = message.bcc.map(formatEmailAddress);
        }
        if (message.replyTo) {
            options.replyTo = formatEmailAddress(message.replyTo);
        }
        if (message.text) {
            options.text = message.text;
        }
        if (message.html) {
            options.html = message.html;
        }
        if (message.attachments?.length) {
            options.attachments = message.attachments.map((attachment) => ({
                filename: attachment.filename,
                content: getAttachmentContentBuffer(attachment),
                contentType: getAttachmentContentType(attachment),
                cid: attachment.contentId,
                contentDisposition: attachment.disposition,
            }));
        }
        if (message.priority) {
            options.priority = message.priority;
        }
        if (message.headers) {
            options.headers = message.headers;
        }
        if (message.inReplyTo) {
            options.inReplyTo = message.inReplyTo;
        }
        if (message.references?.length) {
            options.references = message.references.join(" ");
        }
        return options;
    }
    isRetryableError(err) {
        const code = err.code || "";
        const message = (err.message || "").toLowerCase();
        if (code === "EENVELOPE" && message.includes("rate")) {
            return true;
        }
        if (["ECONNECTION", "ECONNRESET", "ETIMEDOUT", "ESOCKET"].includes(code)) {
            return true;
        }
        if (err.responseCode === 429) {
            return true;
        }
        if (err.responseCode >= 500 && err.responseCode < 600) {
            return true;
        }
        return false;
    }
    async healthCheck() {
        const start = Date.now();
        try {
            if (!this.transporter) {
                await this.initialize();
            }
            await this.transporter.verify();
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
                error: err.message,
                latencyMs: Date.now() - start,
            };
        }
    }
    async dispose() {
        if (this.transporter) {
            this.transporter.close();
            this.transporter = null;
        }
        this.initialized = false;
        log.debug?.("GmailProvider: Disposed");
    }
}
export const isConfigured = () => {
    const enabled = process.env.EMAIL_GMAIL_ENABLED === "true";
    if (!enabled) {
        return false;
    }
    const authMode = process.env.EMAIL_GMAIL_AUTH_MODE || "smtp";
    if (authMode === "oauth2") {
        return !!(getConfiguredSenderEmail() &&
            process.env.EMAIL_GMAIL_OAUTH_CLIENT_ID &&
            process.env.EMAIL_GMAIL_OAUTH_CLIENT_SECRET &&
            process.env.EMAIL_GMAIL_OAUTH_REFRESH_TOKEN);
    }
    return !!(process.env.EMAIL_GMAIL_SMTP_USER &&
        process.env.EMAIL_GMAIL_SMTP_APP_PASSWORD);
};
export const createGmailProvider = (config, runtime) => {
    return new GmailEmailProvider(config, runtime);
};
//# sourceMappingURL=gmail.js.map