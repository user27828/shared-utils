import type { CmsPublicPayload } from "../../../../utils/src/cms/types.js";
import type { CmsApi } from "../CmsApi.js";
export interface UseCmsPublicOptions {
    postType: string;
    locale: string;
    slug: string;
    unlockToken?: string;
    /** If true, request an authenticated draft preview (requires server support). */
    preview?: boolean;
    /** Provide a custom CmsApi instance. Defaults to a new CmsClient(). */
    api?: CmsApi;
    /** Set to false to disable auto-fetching. Default: true. */
    enabled?: boolean;
}
export interface UseCmsPublicResult {
    data: CmsPublicPayload | null;
    isLoading: boolean;
    error: Error | null;
    /** True when the server indicates the content is password-protected. */
    requiresPassword: boolean;
    /** Current ETag for conditional requests. */
    etag: string | null;
    /** Force a refetch. */
    reload: () => void;
}
export declare const useCmsPublic: (params: UseCmsPublicOptions) => UseCmsPublicResult;
//# sourceMappingURL=useCmsPublic.d.ts.map