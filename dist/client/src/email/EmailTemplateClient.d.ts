import type { EmailTemplateDetail, EmailTemplatePreviewRequest, EmailTemplatePreviewResponse, EmailTemplateSummary } from "../../../utils/src/email/types.js";
export declare class EmailTemplateClientError extends Error {
    readonly statusCode?: number;
    constructor(message: string, statusCode?: number);
}
export interface EmailTemplateClientConfig {
    baseUrl?: string;
    fetchFn?: typeof fetch;
}
export declare class EmailTemplateClient {
    private readonly baseUrl;
    private readonly fetchFn;
    constructor(config?: EmailTemplateClientConfig);
    private request;
    listTemplates(): Promise<EmailTemplateSummary[]>;
    getTemplate(templateUid: string): Promise<EmailTemplateDetail>;
    previewTemplate(templateUid: string, body: EmailTemplatePreviewRequest): Promise<EmailTemplatePreviewResponse>;
    sendTestEmail(templateUid: string, fixtureUid?: string): Promise<void>;
}
//# sourceMappingURL=EmailTemplateClient.d.ts.map