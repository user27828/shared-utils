import type { CmsPublicPayload } from "../../../../utils/src/cms/types.js";
import type { CmsApi } from "../CmsApi.js";
export interface UseCmsPublicOptions {
    postType: string;
    locale: string;
    slug: string;
    unlockToken?: string;
    /** Provide a custom CmsApi instance. Defaults to a new CmsClient(). */
    api?: CmsApi;
    /** Set to false to disable auto-fetching. Default: true. */
    enabled?: boolean;
}
export interface UseCmsPublicResult {
    data: CmsPublicPayload | null;
    isLoading: boolean;
    error: Error | null;
    reload: () => void;
}
export declare const useCmsPublic: (params: UseCmsPublicOptions) => UseCmsPublicResult;
//# sourceMappingURL=useCmsPublic.d.ts.map