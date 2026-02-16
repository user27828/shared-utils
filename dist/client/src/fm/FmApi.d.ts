/**
 * FM API Interface — shared-utils/client/fm
 *
 * Abstract interface for File Manager client operations.
 * The default implementation (`FmClient`) uses fetch().
 * Tests or custom transports can provide alternative implementations.
 *
 * Follows the same pattern as CmsApi — every async method matches an
 * admin-router endpoint; synchronous URL builders produce href strings.
 */
import type { FmFileRow, FmFileVariantRow, FmFileLinkRow, FmFileListFilters, FmFileListResult, FmFileLinkListResult, FmUploadInitRequest, FmUploadInitResponse, FmUploadFinalizeResponse, FmVariantUploadInitRequest, FmVariantUploadInitResponse, FmVariantUploadFinalizeResponse, FmUploadProgressCallback } from "../../../utils/src/fm/types.js";
/**
 * Result of `resolveReadUrl` — the URL kind indicates how the caller
 * should consume it (direct link, signed temporary URL, or canonical path).
 */
export interface FmReadUrlResult {
    url: string;
    kind: "public" | "signed" | "canonical";
    expiresAtIso?: string;
}
/**
 * Discriminated union for delete outcomes.
 * Soft-delete returns the archived file; hard-delete returns the deleted UID.
 */
export type FmDeleteResult = {
    action: "archived";
    file: FmFileRow;
    linkCount: number;
} | {
    action: "deleted";
    fileUid: string;
    deletedObjects: number;
};
/**
 * Abstract interface for all File Manager client operations.
 *
 * Every async method corresponds to an admin-router endpoint;
 * synchronous URL builders produce href strings for `<img>` / `<a>` usage.
 * The default implementation is {@link FmClient}.
 */
export interface FmApi {
    /** Begin a new file upload (returns presigned PUT or proxy instructions). */
    uploadInit(input: {
        request: FmUploadInitRequest;
    }): Promise<FmUploadInitResponse>;
    /** Finalize a direct (S3) upload after the client PUT completes. */
    uploadFinalize(input: {
        fileUid: string;
        object: {
            bucket: string;
            objectKey: string;
        };
    }): Promise<FmUploadFinalizeResponse>;
    /** Upload file bytes through the server proxy (no client-side S3 access). */
    uploadProxied(input: {
        fileUid: string;
        body: ArrayBuffer | Uint8Array | Blob;
        contentType?: string;
        /** Optional progress callback (requires XHR-capable environment). */
        onUploadProgress?: FmUploadProgressCallback;
    }): Promise<FmUploadFinalizeResponse>;
    /** Begin a variant (thumb/preview/web) upload. */
    variantUploadInit(input: {
        request: FmVariantUploadInitRequest;
    }): Promise<FmVariantUploadInitResponse>;
    /** Finalize a direct variant upload. */
    variantUploadFinalize(input: {
        variantUid: string;
        object: {
            bucket: string;
            objectKey: string;
        };
    }): Promise<FmVariantUploadFinalizeResponse>;
    /** Upload variant bytes through the server proxy. */
    variantUploadProxied(input: {
        variantUid: string;
        body: ArrayBuffer | Uint8Array | Blob;
        contentType?: string;
        /** Optional progress callback (requires XHR-capable environment). */
        onUploadProgress?: FmUploadProgressCallback;
    }): Promise<FmVariantUploadFinalizeResponse>;
    /** List files with pagination, search, and filtering. */
    listFiles(params?: FmFileListFilters): Promise<FmFileListResult>;
    /** Get a single file by UID. */
    getFile(fileUid: string): Promise<FmFileRow>;
    /** Patch mutable fields on a file. */
    patchFile(input: {
        fileUid: string;
        patch: {
            title?: string;
            alt_text?: string;
            tags?: string[];
            is_public?: boolean;
        };
    }): Promise<FmFileRow>;
    /** Soft-archive a file (sets archived_at). */
    archiveFile(fileUid: string): Promise<FmFileRow>;
    /** Restore an archived file. */
    restoreFile(fileUid: string): Promise<FmFileRow>;
    /**
     * Delete a file. Without `force`, linked files are archived instead.
     * With `force`, the file and all storage objects are permanently removed.
     */
    deleteFile(input: {
        fileUid: string;
        force?: boolean;
    }): Promise<FmDeleteResult>;
    /** Move a file to a different bucket and/or folder path. */
    moveFile(input: {
        fileUid: string;
        toBucket?: string;
        toFolderPath?: string;
    }): Promise<{
        file: FmFileRow;
        variants: FmFileVariantRow[];
    }>;
    /** Resolve a read URL (public, signed, or canonical) for a file. */
    getReadUrl(input: {
        fileUid: string;
        variantKind?: string;
        expiresInSeconds?: number;
    }): Promise<FmReadUrlResult>;
    /** Get storage-level metadata for a file or variant. */
    getObjectMetadata(input: {
        fileUid: string;
        variantKind?: string;
    }): Promise<{
        metadata: Record<string, string>;
    }>;
    /** List all variants for a file. */
    listVariants(fileUid: string): Promise<{
        items: FmFileVariantRow[];
    }>;
    /** List entity links for a file. */
    listLinks(input: {
        fileUid: string;
        limit?: number;
        offset?: number;
    }): Promise<FmFileLinkListResult>;
    /** Create a link between a file and an entity. */
    createLink(input: {
        fileUid: string;
        linkedEntityType: string;
        linkedEntityUid: string;
        linkedField?: string;
    }): Promise<FmFileLinkRow>;
    /** Delete a specific file–entity link. */
    deleteLink(input: {
        fileUid: string;
        linkedEntityType: string;
        linkedEntityUid: string;
        linkedField?: string;
    }): Promise<void>;
    /**
     * Build a content URL for authenticated `<img src>` usage, previews,
     * and downloads.
     *
     * Produces short URLs: `{contentBaseUrl}/{fileUid}?v=thumb&dl=1`
     *
     * Uses `contentBaseUrl` when configured, otherwise falls back to
     * `adminBaseUrl`. This allows the calling application to decouple
     * content delivery from admin CRUD routes (e.g. serve content from
     * a user-scoped or CDN endpoint).
     */
    getContentUrl(input: {
        fileUid: string;
        download?: boolean;
        variantKind?: string;
    }): string;
    /**
     * Build the proxy-upload URL for a file (used by upload-proxied flow).
     */
    getProxyUploadUrl(fileUid: string): string;
    /**
     * Build the proxy-upload URL for a variant.
     */
    getVariantProxyUploadUrl(variantUid: string): string;
    /**
     * Build a public media URL (unauthenticated, cacheable).
     * Only works for files with `is_public: true`.
     */
    getPublicMediaUrl(fileUid: string): string;
}
//# sourceMappingURL=FmApi.d.ts.map