import type { FmFileListResult, FmFilesOrderBy } from "../../../../utils/src/fm/types.js";
import type { FmApi } from "../FmApi.js";
/** Parameters for the {@link useFmListFiles} hook. */
export interface UseFmListFilesParams {
    /** Full-text search on title, alt_text, original_filename, uid. */
    search?: string;
    /** Page size limit (default: 25). */
    limit?: number;
    /** Page offset. */
    offset?: number;
    /** Include archived files. */
    includeArchived?: boolean;
    /** Filter by public visibility. */
    isPublic?: boolean;
    /** Sort column. */
    orderBy?: FmFilesOrderBy;
    /** Sort direction. */
    orderDirection?: "asc" | "desc";
    /** Scope to files owned by a specific user. */
    ownerUserUid?: string;
    /**
     * Include `variants` array on each file row in the response.
     * Avoids per-file API calls for variant data (e.g. image-size picker).
     */
    includeVariants?: boolean;
    /** Set to false to disable auto-fetching. Default: true. */
    enabled?: boolean;
    /** Optional FmApi implementation. Falls back to defaultFmClient. */
    api?: FmApi;
}
/** Return value of the {@link useFmListFiles} hook. */
export interface UseFmListFilesResult {
    items: FmFileListResult["items"];
    totalCount: number;
    limit: number;
    offset: number;
    isLoading: boolean;
    error: string | null;
    /** Re-fetch the current page. */
    reload: () => Promise<void>;
}
/**
 * React hook for paginated FM file listing with search, filtering, and sorting.
 *
 * Auto-fetches on mount and whenever inputs change. Supply `enabled: false`
 * to defer the initial fetch. Uses the provided `api` or falls back to
 * a module-level default {@link FmClient}.
 */
export declare const useFmListFiles: (params?: UseFmListFilesParams) => UseFmListFilesResult;
//# sourceMappingURL=useFmListFiles.d.ts.map