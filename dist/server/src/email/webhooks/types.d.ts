export type WebhookEventType = "bounce" | "complaint" | "unsubscribe" | "delivered" | "opened" | "clicked" | "spam_report";
export type BounceType = "hard" | "soft" | "undetermined";
export interface WebhookEventBase {
    type: WebhookEventType;
    timestamp: Date;
    email: string;
    provider: string;
    messageId?: string;
    raw?: unknown;
}
export interface BounceEvent extends WebhookEventBase {
    type: "bounce";
    bounceType: BounceType;
    reason?: string;
    errorCode?: string;
}
export interface ComplaintEvent extends WebhookEventBase {
    type: "complaint" | "spam_report";
    feedbackType?: string;
}
export interface UnsubscribeEvent extends WebhookEventBase {
    type: "unsubscribe";
    method?: string;
}
export interface DeliveryEvent extends WebhookEventBase {
    type: "delivered";
    smtpResponse?: string;
}
export interface OpenEvent extends WebhookEventBase {
    type: "opened";
    userAgent?: string;
    ipAddress?: string;
}
export interface ClickEvent extends WebhookEventBase {
    type: "clicked";
    url?: string;
    userAgent?: string;
    ipAddress?: string;
}
export type WebhookEvent = BounceEvent | ComplaintEvent | UnsubscribeEvent | DeliveryEvent | OpenEvent | ClickEvent;
export interface IWebhookHandler {
    readonly provider: string;
    verify(payload: Buffer | string, headers: Record<string, string>): boolean | Promise<boolean>;
    preprocess?(payload: unknown, headers: Record<string, string>): unknown | Promise<unknown>;
    parse(payload: unknown): WebhookEvent[];
}
export type WebhookEventCallback = (event: WebhookEvent) => Promise<void>;
export interface WebhookEventHandlers {
    bounce?: WebhookEventCallback;
    complaint?: WebhookEventCallback;
    unsubscribe?: WebhookEventCallback;
    delivered?: WebhookEventCallback;
    opened?: WebhookEventCallback;
    clicked?: WebhookEventCallback;
    spam_report?: WebhookEventCallback;
}
//# sourceMappingURL=types.d.ts.map