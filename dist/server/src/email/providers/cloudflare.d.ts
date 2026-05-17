import { requestWithTimeout } from "../requestTimeout.js";
import type { CloudflareProviderConfig, EmailMessage, EmailSendResult, IEmailProvider, ProviderHealthStatus } from "./types.js";
interface CloudflareProviderRuntime {
    fetch: typeof fetch;
    requestWithTimeout: typeof requestWithTimeout;
}
export declare class CloudflareEmailProvider implements IEmailProvider {
    readonly name = "cloudflare";
    readonly enabled: boolean;
    private config;
    private runtime;
    private initialized;
    constructor(config: CloudflareProviderConfig, runtime?: CloudflareProviderRuntime);
    initialize(): Promise<void>;
    send(message: EmailMessage, _options?: Record<string, unknown>): Promise<EmailSendResult>;
    healthCheck(): Promise<ProviderHealthStatus>;
    dispose(): Promise<void>;
    private executeRequest;
    private buildPayload;
    private buildAttachmentPayload;
    private buildHeaders;
    private createApiError;
    private getResponseMessageId;
    private getBaseUrl;
    private getSendUrl;
    private getHealthCheckUrl;
    private getRequestHeaders;
    private getRequiredConfigValue;
    private isRetryableNetworkError;
    private isRetryableResponse;
}
export declare const isConfigured: () => boolean;
export declare const createCloudflareProvider: (config: CloudflareProviderConfig) => IEmailProvider;
export {};
//# sourceMappingURL=cloudflare.d.ts.map