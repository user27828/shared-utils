import type { EmailTemplateSummary } from "../../../../utils/src/email/types.js";
import { EmailTemplateClient, type EmailTemplateClientConfig } from "../EmailTemplateClient.js";
export interface UseEmailTemplatesOptions {
    api?: EmailTemplateClient;
    clientConfig?: EmailTemplateClientConfig;
    enabled?: boolean;
}
export interface UseEmailTemplatesResult {
    templates: EmailTemplateSummary[];
    isLoading: boolean;
    error: Error | null;
    reload: () => void;
}
export declare const useEmailTemplates: (options?: UseEmailTemplatesOptions) => UseEmailTemplatesResult;
//# sourceMappingURL=useEmailTemplates.d.ts.map