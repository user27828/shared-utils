export interface EmailAddress {
    email: string;
    name?: string;
}
export type EmailAttachmentContentEncoding = "utf8" | "base64";
export interface EmailAttachment {
    filename: string;
    content: Buffer | string;
    contentEncoding?: EmailAttachmentContentEncoding;
    contentType?: string;
    disposition?: "attachment" | "inline";
    contentId?: string;
}
export type EmailPriority = "high" | "normal" | "low";
export interface EmailMessage {
    from: EmailAddress;
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    replyTo?: EmailAddress;
    subject: string;
    text?: string;
    html?: string;
    attachments?: EmailAttachment[];
    priority?: EmailPriority;
    headers?: Record<string, string>;
    messageId?: string;
    references?: string[];
    inReplyTo?: string;
}
export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    provider: string;
    timestamp: Date;
    error?: string;
    providerResponse?: any;
}
export interface ProviderHealthStatus {
    provider: string;
    healthy: boolean;
    lastCheck: Date;
    error?: string;
    latencyMs?: number;
}
export interface GmailProviderConfig {
    enabled: boolean;
    authMode: "oauth2" | "smtp";
    senderEmail?: string;
    oauth2?: {
        clientId: string;
        clientSecret: string;
        refreshToken: string;
        accessToken?: string;
    };
    smtp?: {
        user: string;
        appPassword: string;
    };
}
export interface ResendProviderConfig {
    enabled: boolean;
    apiKey: string;
    baseUrl?: string;
}
export interface SesProviderConfig {
    enabled: boolean;
    region: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    configurationSetName?: string;
    fromEmailAddressIdentityArn?: string;
    feedbackForwardingEmailAddress?: string;
    feedbackForwardingEmailAddressIdentityArn?: string;
    endpointId?: string;
    tenantName?: string;
}
export interface TestProviderConfig {
    enabled: boolean;
    outputDir?: string;
    logToConsole?: boolean;
    simulateFailure?: boolean;
    simulateDelay?: number;
}
export interface IEmailProvider {
    readonly name: string;
    readonly enabled: boolean;
    initialize(): Promise<void>;
    send(message: EmailMessage, options?: Record<string, any>): Promise<EmailSendResult>;
    healthCheck(): Promise<ProviderHealthStatus>;
    dispose(): Promise<void>;
}
export type ProviderFactory<TConfig = unknown> = (config: TConfig) => IEmailProvider;
export type ProviderConfigCheck = () => boolean;
export interface ProviderRegistration<TConfig = unknown> {
    factory: ProviderFactory<TConfig>;
    isConfigured: ProviderConfigCheck;
}
//# sourceMappingURL=types.d.ts.map