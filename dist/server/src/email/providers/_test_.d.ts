import type { EmailMessage, EmailSendResult, IEmailProvider, ProviderHealthStatus, TestProviderConfig } from "./types.js";
export declare class TestEmailProvider implements IEmailProvider {
    readonly name = "_test_";
    readonly enabled: boolean;
    private config;
    private outputDir;
    private initialized;
    private sentEmails;
    constructor(config: TestProviderConfig);
    initialize(): Promise<void>;
    send(message: EmailMessage, _options?: Record<string, any>): Promise<EmailSendResult>;
    healthCheck(): Promise<ProviderHealthStatus>;
    dispose(): Promise<void>;
    getSentEmails(): EmailMessage[];
    getLastEmail(): EmailMessage | undefined;
    clearSentEmails(): void;
    getSentCount(): number;
}
export declare const isConfigured: () => boolean;
export declare const createTestProvider: (config: TestProviderConfig) => IEmailProvider;
//# sourceMappingURL=_test_.d.ts.map