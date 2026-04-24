import type { IWebhookHandler, WebhookEvent } from "./types.js";
export declare class MailerliteWebhookHandler implements IWebhookHandler {
    readonly provider = "mailerlite";
    private readonly webhookSecret;
    constructor();
    verify(payload: Buffer | string, headers: Record<string, string>): boolean;
    parse(payload: unknown): WebhookEvent[];
    private parseEvent;
    private parseBounceEvent;
    private parseComplaintEvent;
    private parseUnsubscribeEvent;
    private parseDeliveryEvent;
    private parseOpenEvent;
    private parseClickEvent;
}
export declare const createMailerliteWebhookHandler: () => IWebhookHandler;
//# sourceMappingURL=mailerlite.d.ts.map