import type { EmailRenderWarnings } from "../../../../utils/src/email/types.js";
export interface EmailPreviewTabsProps {
    subject: string;
    html: string;
    text: string;
    warnings?: EmailRenderWarnings;
}
declare const EmailPreviewTabs: React.FC<EmailPreviewTabsProps>;
export default EmailPreviewTabs;
//# sourceMappingURL=EmailPreviewTabs.d.ts.map