import { GetAccountCommand, SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { EmailMessage, EmailSendResult, IEmailProvider, ProviderHealthStatus, SesProviderConfig } from "./types.js";
export interface SesProviderRuntime {
    SESv2Client: typeof SESv2Client;
    SendEmailCommand: typeof SendEmailCommand;
    GetAccountCommand: typeof GetAccountCommand;
}
export declare class SesEmailProvider implements IEmailProvider {
    readonly name = "ses";
    readonly enabled: boolean;
    private config;
    private runtime;
    private client;
    private initialized;
    constructor(config: SesProviderConfig, runtime?: SesProviderRuntime);
    initialize(): Promise<void>;
    send(message: EmailMessage, options?: Record<string, unknown>): Promise<EmailSendResult>;
    healthCheck(): Promise<ProviderHealthStatus>;
    dispose(): Promise<void>;
    private isRetryableError;
}
export declare const isConfigured: () => boolean;
export declare const createSesProvider: (config: SesProviderConfig, runtime?: SesProviderRuntime) => IEmailProvider;
//# sourceMappingURL=ses.d.ts.map