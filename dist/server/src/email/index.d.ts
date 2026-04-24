export { createEmailTemplateRegistry, type EmailTemplateDescriptor, type EmailTemplateRegistry, } from "./registry.js";
export type { EmailAttachmentContentEncoding, EmailAttachmentLike, } from "./attachments.js";
export { getAttachmentContentBase64, getAttachmentContentBuffer, getAttachmentContentType, getAttachmentByteLength, } from "./attachments.js";
export type { MarketingProviderName, ResendMarketingProviderConfig, MailerliteMarketingProviderConfig, SesMarketingProviderConfig, MarketingProviderConfigs, MarketingSettingsInput, ResolvedMarketingSettings, MarketingSyncInput, MarketingSyncResult, MarketingSyncSummary, } from "./marketing.js";
export { resolveMarketingSettings, resolveManagedAudienceKeys, syncMarketingSubscriptions, setMarketingRuntimeOverrides, resetMarketingRuntimeOverrides, } from "./marketing.js";
export type { WebhookEventType, BounceType, WebhookEventBase, BounceEvent, ComplaintEvent, UnsubscribeEvent, DeliveryEvent, OpenEvent, ClickEvent, WebhookEvent, IWebhookHandler, WebhookEventCallback, WebhookEventHandlers, } from "./webhooks/index.js";
export { createWebhookRouter, registerWebhookHandlers, MailerliteWebhookHandler, createMailerliteWebhookHandler, ResendWebhookHandler, createResendWebhookHandler, SesWebhookHandler, createSesWebhookHandler, } from "./webhooks/index.js";
//# sourceMappingURL=index.d.ts.map