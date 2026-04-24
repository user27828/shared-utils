import type { IWebhookHandler, WebhookEvent } from "./types.js";
interface SnsEnvelope {
    Type?: string;
    MessageId?: string;
    TopicArn?: string;
    Subject?: string;
    Message?: string | Record<string, unknown>;
    Timestamp?: string;
    SignatureVersion?: string;
    Signature?: string;
    SigningCertURL?: string;
    SubscribeURL?: string;
    Token?: string;
}
export declare class SesWebhookHandler implements IWebhookHandler {
    readonly provider = "ses";
    private readonly allowedTopicArn?;
    constructor();
    verify(payload: Buffer | string, _headers: Record<string, string>): Promise<boolean>;
    preprocess(payload: unknown): Promise<SnsEnvelope | null>;
    parse(payload: unknown): WebhookEvent[];
}
export declare const createSesWebhookHandler: () => IWebhookHandler;
export {};
//# sourceMappingURL=ses.d.ts.map