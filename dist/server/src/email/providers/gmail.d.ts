import nodemailer from "nodemailer";
import type { EmailMessage, EmailSendResult, GmailProviderConfig, IEmailProvider, ProviderHealthStatus } from "./types.js";
export interface GmailProviderRuntime {
    createTransport: typeof nodemailer.createTransport;
}
export declare class GmailEmailProvider implements IEmailProvider {
    readonly name = "gmail";
    readonly enabled: boolean;
    private config;
    private runtime;
    private transporter;
    private initialized;
    constructor(config: GmailProviderConfig, runtime?: GmailProviderRuntime);
    initialize(): Promise<void>;
    private initializeOAuth2;
    private initializeSMTP;
    private resolveSenderEmail;
    send(message: EmailMessage, _options?: Record<string, any>): Promise<EmailSendResult>;
    private buildMailOptions;
    private isRetryableError;
    healthCheck(): Promise<ProviderHealthStatus>;
    dispose(): Promise<void>;
}
export declare const isConfigured: () => boolean;
export declare const createGmailProvider: (config: GmailProviderConfig, runtime?: GmailProviderRuntime) => IEmailProvider;
//# sourceMappingURL=gmail.d.ts.map