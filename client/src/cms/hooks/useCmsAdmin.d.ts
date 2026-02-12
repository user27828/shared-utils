import type { CmsHeadRow } from "../../../../utils/src/cms/types.js";
import type { CmsApi, CmsAdminListParams } from "../CmsApi.js";
export interface UseCmsAdminOptions extends CmsAdminListParams {
    /** Provide a custom CmsApi instance. Defaults to a new CmsClient(). */
    api?: CmsApi;
    /** Set to false to disable auto-fetching. Default: true. */
    enabled?: boolean;
}
export interface UseCmsAdminResult {
    items: CmsHeadRow[];
    totalCount: number;
    limit: number;
    offset: number;
    isLoading: boolean;
    error: Error | null;
    reload: () => void;
}
export declare const useCmsAdmin: (params?: UseCmsAdminOptions) => UseCmsAdminResult;
//# sourceMappingURL=useCmsAdmin.d.ts.map