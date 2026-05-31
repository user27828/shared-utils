/**
 * CMS Client — shared-utils
 *
 * Default CmsApi implementation using fetch().
 * Covers the full admin + public surface including trash/restore,
 * history, lock/unlock, and collaborators.
 */
import type { CmsHeadRow, CmsHistoryRow, CmsListResponse, CmsCreateRequest, CmsUpdateRequest, CmsCollaboratorRow, CmsMetadata } from "../../../utils/src/cms/types.js";
import type { CmsApi, CmsAdminListParams, CmsTransferApplyResult, CmsTransferDownloadResult, CmsTransferInspectResult, CmsTransferPackage, CmsPublicGetResult, CmsPublicUnlockResult } from "./CmsApi.js";
export declare class CmsClientError extends Error {
    readonly statusCode?: number;
    readonly code?: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export interface CmsClientConfig {
    /** Base URL for admin endpoints (default: "/api/admin/cms"). */
    adminBaseUrl?: string;
    /** Base URL for public endpoints (default: "/api/public/cms"). */
    publicBaseUrl?: string;
    /** Optional custom fetch implementation (for testing). */
    fetchFn?: typeof fetch;
}
export declare class CmsClient implements CmsApi {
    private adminBaseUrl;
    private publicBaseUrl;
    private fetchFn;
    constructor(config?: CmsClientConfig);
    private request;
    private adminRequest;
    adminList(params?: CmsAdminListParams): Promise<CmsListResponse>;
    adminGet(uid: string): Promise<CmsHeadRow>;
    adminCreate(request: CmsCreateRequest): Promise<CmsHeadRow>;
    adminUpdate(input: {
        uid: string;
        patch: CmsUpdateRequest;
        ifMatch: string;
    }): Promise<CmsHeadRow>;
    adminPublish(input: {
        uid: string;
        ifMatch: string;
        published_at?: string;
    }): Promise<CmsHeadRow>;
    adminTrash(input: {
        uid: string;
        ifMatch: string;
    }): Promise<CmsHeadRow>;
    adminRestore(input: {
        uid: string;
        ifMatch: string;
    }): Promise<CmsHeadRow>;
    adminDeletePermanently(uid: string): Promise<void>;
    adminEmptyTrash(limit?: number): Promise<{
        deletedCount: number;
        failedCount: number;
    }>;
    adminListHistory(uid: string, opts?: {
        limit?: number;
        offset?: number;
        fields?: "summary" | "full";
    }): Promise<{
        items: CmsHistoryRow[];
        totalCount: number;
        limit: number;
        offset: number;
    }>;
    adminRestoreHistory(input: {
        uid: string;
        historyId: number;
        ifMatch: string;
    }): Promise<CmsHeadRow>;
    adminSoftDeleteHistory(input: {
        uid: string;
        historyId: number;
    }): Promise<CmsHistoryRow>;
    adminHardDeleteHistory(input: {
        uid: string;
        historyId: number;
    }): Promise<void>;
    adminUpdateHistoryMeta(input: {
        uid: string;
        historyId: number;
        version?: string | null;
        notes?: string | null;
    }): Promise<CmsHistoryRow>;
    adminUpdateMetadata(input: {
        uid: string;
        metadata: CmsMetadata;
    }): Promise<CmsHeadRow>;
    adminLock(uid: string): Promise<CmsHeadRow>;
    adminUnlock(uid: string): Promise<CmsHeadRow>;
    adminListCollaborators(uid: string): Promise<CmsCollaboratorRow[]>;
    adminReplaceCollaborators(uid: string, collaborators: Array<{
        user_uid: string;
        role: string;
    }>): Promise<CmsCollaboratorRow[]>;
    adminGetTransferPackage(input: {
        uid: string;
        includeAssets?: boolean;
    }): Promise<CmsTransferPackage>;
    adminDownloadTransferPackage(input: {
        uid: string;
        includeAssets?: boolean;
    }): Promise<CmsTransferDownloadResult>;
    adminInspectTransferPackage(input: {
        packageText: string;
    }): Promise<CmsTransferInspectResult>;
    adminApplyTransferPackage(input: {
        package: CmsTransferPackage | string;
        entryResolution?: {
            mode: "update_existing" | "create_copy";
            slug?: string;
        } | null;
        assetResolutions?: Array<{
            assetId: string;
            mode: string;
        }>;
    }): Promise<CmsTransferApplyResult>;
    publicGet(params: {
        postType: string;
        locale: string;
        slug: string;
        unlockToken?: string;
        ifNoneMatch?: string;
        preview?: boolean;
    }): Promise<CmsPublicGetResult>;
    publicUnlock(params: {
        postType: string;
        locale: string;
        slug: string;
        password: string;
    }): Promise<CmsPublicUnlockResult>;
}
//# sourceMappingURL=CmsClient.d.ts.map