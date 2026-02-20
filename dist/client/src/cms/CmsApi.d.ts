/**
 * CMS API Interface — shared-utils
 *
 * Abstract interface for CMS operations. The default implementation
 * (`CmsClient`) uses fetch(). Tests or custom transports can provide
 * alternative implementations.
 */
import type { CmsHeadRow, CmsHistoryRow, CmsListResponse, CmsCreateRequest, CmsUpdateRequest, CmsPublicPayload, CmsCollaboratorRow, CmsMetadata } from "../../../utils/src/cms/types.js";
export type CmsAdminListParams = {
    q?: string;
    status?: string;
    post_type?: string;
    locale?: string;
    tag?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: string;
    includeTrash?: boolean;
};
export interface CmsApi {
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
    publicGet(params: {
        postType: string;
        locale: string;
        slug: string;
        unlockToken?: string;
        ifNoneMatch?: string;
        /** If true, request an authenticated draft preview (requires server support). */
        preview?: boolean;
    }): Promise<CmsPublicGetResult>;
    publicUnlock(params: {
        postType: string;
        locale: string;
        slug: string;
        password: string;
    }): Promise<CmsPublicUnlockResult>;
}
export type CmsPublicGetResult = {
    kind: "ok";
    data: CmsPublicPayload;
    etag: string | null;
} | {
    kind: "not_modified";
    etag: string | null;
} | {
    kind: "password_required";
    message: string;
    etag: string | null;
} | {
    kind: "not_found";
    message: string;
} | {
    kind: "error";
    message: string;
    statusCode: number | null;
};
export type CmsPublicUnlockResult = {
    kind: "ok";
    token: string;
    expiresAt: string;
} | {
    kind: "not_found";
    message: string;
} | {
    kind: "not_protected";
    message: string;
} | {
    kind: "invalid_password";
    message: string;
} | {
    kind: "error";
    message: string;
    statusCode: number | null;
};
//# sourceMappingURL=CmsApi.d.ts.map