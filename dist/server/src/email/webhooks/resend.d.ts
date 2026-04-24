import type { IWebhookHandler, WebhookEvent } from "./types.js";
export declare class ResendWebhookHandler implements IWebhookHandler {
    readonly provider = "resend";
    private readonly webhookSecret;
    constructor();
    verify(payload: Buffer | string, headers: Record<string, string>): Promise<boolean>;
    parse(payload: unknown): WebhookEvent[];
}
export declare const createResendWebhookHandler: () => IWebhookHandler;
//# sourceMappingURL=resend.d.ts.map