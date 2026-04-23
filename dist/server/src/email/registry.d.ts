import type { EmailPreviewFixture, EmailTemplateCategory, EmailTemplateDetail, EmailTemplateSummary } from "../../../utils/src/email/types.js";
export interface EmailTemplateDescriptor<TProps = Record<string, unknown>> {
    uid: string;
    name: string;
    category: EmailTemplateCategory;
    description: string;
    sendScenarios: string[];
    tags?: string[];
    from?: {
        email: string;
        name?: string;
    } | null;
    replyTo?: {
        email: string;
        name?: string;
    } | null;
    previewFixtures: EmailPreviewFixture<TProps>[];
    buildSubject(props: TProps): string;
    buildText?(props: TProps): string;
    component: unknown;
}
export interface EmailTemplateRegistry {
    list(): EmailTemplateSummary[];
    get(uid: string): EmailTemplateDescriptor<Record<string, unknown>>;
    has(uid: string): boolean;
    getDetail(uid: string): EmailTemplateDetail;
}
export declare const createEmailTemplateRegistry: (descriptors: EmailTemplateDescriptor[]) => EmailTemplateRegistry;
//# sourceMappingURL=registry.d.ts.map