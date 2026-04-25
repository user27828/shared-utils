import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { log } from "../../../../utils/index.js";
import { getAttachmentByteLength, getAttachmentContentType, } from "../attachments.js";
import { formatEmailAddress } from "../address.js";
import { EmailProviderError } from "../errors.js";
import { formatCompactLogLine, formatCompactLogList, formatHierarchicalLog, formatCompactLogText, formatCompactLogValue, } from "../logFormat.js";
const PROVIDER_NAME = "_test_";
const MAX_SENT_EMAILS = 500;
export class TestEmailProvider {
    name = PROVIDER_NAME;
    enabled;
    config;
    outputDir;
    initialized = false;
    sentEmails = [];
    constructor(config) {
        this.config = config;
        this.enabled = config.enabled;
        this.outputDir = path.resolve(process.cwd(), config.outputDir || ".data/email/test");
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            log.debug?.(formatHierarchicalLog("TestEmailProvider: Initialized", [
                formatCompactLogLine([
                    ["outputDir", formatCompactLogText(this.outputDir)],
                ]),
            ]));
            this.initialized = true;
        }
        catch (err) {
            throw new EmailProviderError(`Failed to initialize test provider: ${err.message}`, PROVIDER_NAME, { retryable: false });
        }
    }
    async send(message, _options) {
        if (!this.initialized) {
            await this.initialize();
        }
        if (this.config.simulateDelay && this.config.simulateDelay > 0) {
            await new Promise((resolve) => {
                setTimeout(resolve, this.config.simulateDelay);
            });
        }
        if (this.config.simulateFailure) {
            throw new EmailProviderError("Simulated failure for testing", PROVIDER_NAME, { retryable: true });
        }
        const messageId = message.messageId || `<${randomUUID()}@test.local>`;
        const timestamp = new Date();
        const filename = `${timestamp.toISOString().replace(/[:.]/g, "-")}_${randomUUID().slice(0, 8)}.json`;
        const filepath = path.join(this.outputDir, filename);
        const emailData = {
            messageId,
            timestamp: timestamp.toISOString(),
            from: formatEmailAddress(message.from),
            to: message.to.map(formatEmailAddress),
            cc: message.cc?.map(formatEmailAddress),
            bcc: message.bcc?.map(formatEmailAddress),
            replyTo: message.replyTo
                ? formatEmailAddress(message.replyTo)
                : undefined,
            subject: message.subject,
            text: message.text,
            html: message.html,
            attachments: message.attachments?.map((attachment) => ({
                filename: attachment.filename,
                contentType: getAttachmentContentType(attachment),
                size: getAttachmentByteLength(attachment),
            })),
            priority: message.priority,
            headers: message.headers,
        };
        try {
            await fs.writeFile(filepath, JSON.stringify(emailData, null, 2), "utf8");
            this.sentEmails.push(message);
            if (this.sentEmails.length > MAX_SENT_EMAILS) {
                this.sentEmails = this.sentEmails.slice(-MAX_SENT_EMAILS);
            }
            log.info?.(formatHierarchicalLog("TestEmailProvider: Email saved", [
                formatCompactLogLine([
                    ["messageId", formatCompactLogValue(messageId)],
                    ["subject", formatCompactLogText(message.subject)],
                ]),
                formatCompactLogLine([
                    ["to", formatCompactLogList(emailData.to)],
                    ["filepath", formatCompactLogText(filepath)],
                ]),
            ]));
            if (this.config.logToConsole) {
                console.log("\n=== TEST EMAIL ===");
                console.log(`To: ${emailData.to.join(", ")}`);
                console.log(`Subject: ${message.subject}`);
                console.log(`File: ${filepath}`);
                console.log("==================\n");
            }
        }
        catch (err) {
            log.warn?.(formatHierarchicalLog("TestEmailProvider: Failed to write email file", [
                formatCompactLogLine([
                    ["filepath", formatCompactLogText(filepath)],
                    ["error", formatCompactLogText(err.message)],
                ]),
            ]));
            throw new EmailProviderError(`Failed to persist test email: ${err.message}`, PROVIDER_NAME, {
                retryable: false,
                context: { filepath },
            });
        }
        return {
            success: true,
            messageId,
            provider: PROVIDER_NAME,
            timestamp,
            providerResponse: { filepath },
        };
    }
    async healthCheck() {
        const start = Date.now();
        try {
            const testFile = path.join(this.outputDir, ".health-check");
            await fs.writeFile(testFile, Date.now().toString(), "utf8");
            await fs.unlink(testFile);
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
        this.initialized = false;
        this.sentEmails = [];
        log.debug?.("TestEmailProvider: Disposed");
    }
    getSentEmails() {
        return [...this.sentEmails];
    }
    getLastEmail() {
        return this.sentEmails[this.sentEmails.length - 1];
    }
    clearSentEmails() {
        this.sentEmails = [];
    }
    getSentCount() {
        return this.sentEmails.length;
    }
}
export const isConfigured = () => {
    const nodeEnv = process.env.NODE_ENV || "development";
    return nodeEnv !== "production" || process.env.EMAIL_TEST_ENABLED === "true";
};
export const createTestProvider = (config) => {
    return new TestEmailProvider(config);
};
//# sourceMappingURL=_test_.js.map