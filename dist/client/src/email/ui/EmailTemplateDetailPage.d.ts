import type { EmailTemplateDetail, EmailTemplatePreviewResponse } from "../../../../utils/src/email/types.js";
export interface EmailTemplateDetailPageProps {
    template: EmailTemplateDetail | null;
    preview: EmailTemplatePreviewResponse | null;
    selectedFixtureUid: string | null;
    isLoading?: boolean;
    isSendingTest?: boolean;
    error?: Error | string | null;
    onBack?: () => void;
    onFixtureChange: (fixtureUid: string | null) => void;
    onSendTestEmail?: () => void;
}
declare const EmailTemplateDetailPage: React.FC<EmailTemplateDetailPageProps>;
export default EmailTemplateDetailPage;
//# sourceMappingURL=EmailTemplateDetailPage.d.ts.map