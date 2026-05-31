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
export type CmsTransferAssetRole = "body_content_reference" | "featured_image" | "og_image" | "attachment";
export interface CmsTransferReferenceLocation {
    kind: CmsTransferAssetRole;
    path: string;
    originalValue?: string | null;
}
export interface CmsTransferPackagedAsset {
    assetId: string;
    role: CmsTransferAssetRole;
    targetFolderPath: string;
    targetFileName: string;
    mimeType: string;
    byteLength: number;
    sha256: string;
    bytesBase64: string;
    referenceLocations: CmsTransferReferenceLocation[];
    sourceFileUid?: string | null;
}
export interface CmsTransferPortableEntry {
    title: string;
    slug: string;
    contentType: string;
    content: string;
    tags: string[];
    options: unknown;
    metadata: unknown;
    publishedAt?: string | null;
    updatedAt?: string | null;
}
export interface CmsTransferPackage {
    schemaVersion: string;
    exportedAt: string;
    sourceEnvironment: string | null;
    sourceCmsUid: string;
    postType: string;
    locale: string;
    cmsEntry: CmsTransferPortableEntry;
    assets: CmsTransferPackagedAsset[];
    hostExtensions: Record<string, unknown>;
    warnings: string[];
}
export type CmsTransferEntryResolutionMode = "update_existing" | "create_copy";
export type CmsTransferAssetResolutionMode = "reuse_existing_asset" | "upload_packaged_asset" | "rename_upload";
export interface CmsTransferEntryResolution {
    mode: CmsTransferEntryResolutionMode;
    slug?: string;
}
export interface CmsTransferAssetResolution {
    assetId: string;
    mode: CmsTransferAssetResolutionMode;
}
export interface CmsTransferPackageSummary {
    schemaVersion?: string;
    sourceCmsUid?: string;
    postType: string;
    locale: string;
    slug: string;
    assetCount?: number;
    warningCount?: number;
}
export interface CmsTransferEntryConflict {
    kind: "entry_slug_conflict";
    existingUid: string;
    existingSlug?: string;
    allowedResolutions: CmsTransferEntryResolutionMode[];
    suggestedCopySlug: string | null;
}
export interface CmsTransferAssetConflict {
    kind?: string;
    assetId: string;
    targetFolderPath: string;
    targetFileName: string;
    sameContent: boolean;
    blocking: boolean;
    allowedResolutions: CmsTransferAssetResolutionMode[];
    existingFileUid?: string | null;
    existingSha256?: string | null;
}
export interface CmsTransferPublicEligibility {
    eligible: boolean;
    warnings: string[];
    reason?: string | null;
    routeKey?: string | null;
}
export interface CmsTransferInspectResult {
    packageSummary: CmsTransferPackageSummary;
    entryConflict: CmsTransferEntryConflict | null;
    assetConflicts: CmsTransferAssetConflict[];
    publicEligibility?: CmsTransferPublicEligibility | null;
    validationErrors: string[];
    warnings: string[];
}
export interface CmsTransferApplyResult {
    row: CmsHeadRow;
    appliedUid: string;
    entryResolution?: Record<string, unknown> | null;
    assetResolutions?: unknown[];
    publicEligibility?: CmsTransferPublicEligibility | null;
    warnings?: string[];
}
export interface CmsTransferDownloadResult {
    fileName: string;
    packageText: string;
    package: CmsTransferPackage | null;
}
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
        entryResolution?: CmsTransferEntryResolution | null;
        assetResolutions?: CmsTransferAssetResolution[];
    }): Promise<CmsTransferApplyResult>;
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