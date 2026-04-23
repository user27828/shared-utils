import type { EmailTemplateSummary } from "../../../../utils/src/email/types.js";
export interface EmailTemplateListPageProps {
    templates: EmailTemplateSummary[];
    isLoading?: boolean;
    error?: Error | string | null;
    onOpenTemplate: (template: EmailTemplateSummary) => void;
}
declare const EmailTemplateListPage: React.FC<EmailTemplateListPageProps>;
export default EmailTemplateListPage;
//# sourceMappingURL=EmailTemplateListPage.d.ts.map