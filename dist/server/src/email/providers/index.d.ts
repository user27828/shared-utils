export type { EmailAddress, EmailAttachmentContentEncoding, EmailAttachment, EmailPriority, EmailMessage, EmailSendResult, ProviderHealthStatus, GmailProviderConfig, ResendProviderConfig, SesProviderConfig, TestProviderConfig, IEmailProvider, ProviderFactory, ProviderConfigCheck, ProviderRegistration, } from "./types.js";
export { TestEmailProvider, isConfigured as isTestProviderConfigured, createTestProvider, } from "./_test_.js";
export { GmailEmailProvider, isConfigured as isGmailProviderConfigured, createGmailProvider, } from "./gmail.js";
export { ResendEmailProvider, isConfigured as isResendProviderConfigured, createResendProvider, } from "./resend.js";
export { SesEmailProvider, isConfigured as isSesProviderConfigured, createSesProvider, } from "./ses.js";
//# sourceMappingURL=index.d.ts.map