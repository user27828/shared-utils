import type { EmailMessage, EmailSendResult, IEmailProvider, ProviderHealthStatus, ResendProviderConfig } from "./types.js";
export declare class ResendEmailProvider implements IEmailProvider {
    readonly name = "resend";
    readonly enabled: boolean;
    private config;
    private initialized;
    constructor(config: ResendProviderConfig);
    initialize(): Promise<void>;
    send(message: EmailMessage, options?: Record<string, unknown>): Promise<EmailSendResult>;
    healthCheck(): Promise<ProviderHealthStatus>;
    dispose(): Promise<void>;
    private getBaseUrl;
    private isRetryableNetworkError;
    private isRetryableResponse;
}
export declare const isConfigured: () => boolean;
export declare const createResendProvider: (config: ResendProviderConfig) => IEmailProvider;
//# sourceMappingURL=resend.d.ts.map