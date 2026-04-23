import type { EmailTemplateDetail, EmailTemplatePreviewResponse } from "../../../../utils/src/email/types.js";
import { EmailTemplateClient, type EmailTemplateClientConfig } from "../EmailTemplateClient.js";
export interface UseEmailTemplatePreviewOptions {
    templateUid?: string | null;
    initialFixtureUid?: string | null;
    api?: EmailTemplateClient;
    clientConfig?: EmailTemplateClientConfig;
    enabled?: boolean;
}
export interface UseEmailTemplatePreviewResult {
    template: EmailTemplateDetail | null;
    preview: EmailTemplatePreviewResponse | null;
    selectedFixtureUid: string | null;
    setFixtureUid: (fixtureUid: string | null) => void;
    isLoading: boolean;
    isSendingTest: boolean;
    error: Error | null;
    reload: () => void;
    sendTestEmail: () => Promise<void>;
}
export declare const useEmailTemplatePreview: (options?: UseEmailTemplatePreviewOptions) => UseEmailTemplatePreviewResult;
//# sourceMappingURL=useEmailTemplatePreview.d.ts.map