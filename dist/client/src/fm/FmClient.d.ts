/**
 * FM Client — shared-utils/client/fm
 *
 * Default FmApi implementation using fetch().
 * Covers the full admin surface (upload, CRUD, archive/restore/delete,
 * move, variants, links) plus synchronous URL builders for content
 * delivery and proxy uploads.
 *
 * Follows the same pattern as CmsClient:
 *   - constructor accepts config with base URLs and optional fetchFn
 *   - methods unwrap the `{ success, data, message, code }` envelope
 *   - FmClientError carries statusCode + code for programmatic handling
 */
import type { FmFileRow, FmFileVariantRow, FmFileLinkRow, FmFileListFilters, FmFileListResult, FmFileLinkListResult, FmUploadInitRequest, FmUploadInitResponse, FmUploadFinalizeResponse, FmVariantUploadInitRequest, FmVariantUploadInitResponse, FmVariantUploadFinalizeResponse } from "../../../utils/src/fm/types.js";
import type { FmUploadProgressCallback } from "../../../utils/src/fm/types.js";
import type { FmApi, FmDeleteResult, FmReadUrlResult } from "./FmApi.js";
/**
 * Error thrown by {@link FmClient} when an API call fails.
 * Carries HTTP `statusCode` and optional machine-readable `code`.
 */
export declare class FmClientError extends Error {
    readonly statusCode?: number;
    readonly code?: string;
    constructor(message: string, statusCode?: number, code?: string);
}
/**
 * Configuration for {@link FmClient}.
 * All fields are optional — sensible defaults are applied.
 */
export interface FmClientConfig {
    /** Base URL for admin FM endpoints (default: "/api/fm"). */
    adminBaseUrl?: string;
    /**
     * Base URL for content-streaming URLs (`<img src>`, downloads).
     * When set, {@link FmClient.getContentUrl} uses this instead of
     * `adminBaseUrl`, allowing content delivery to be routed separately
     * from admin CRUD operations (e.g. to a user-scoped or CDN endpoint).
     *
     * Falls back to `adminBaseUrl` when not specified (backward compatible).
     */
    contentBaseUrl?: string;
    /** Base URL for public media endpoints (default: "/media"). */
    publicBaseUrl?: string;
    /** Optional custom fetch implementation (for testing / SSR). */
    fetchFn?: typeof fetch;
}
/**
 * Default {@link FmApi} implementation using `fetch()` (with XHR fallback
 * for upload progress tracking).
 *
 * Handles the full admin surface: upload lifecycle, CRUD, archive/restore,
 * move, variants, links, and synchronous URL builders for content delivery.
 */
export declare class FmClient implements FmApi {
    private adminBaseUrl;
    private contentBaseUrl;
    private publicBaseUrl;
    private fetchFn;
    constructor(config?: FmClientConfig);
    /**
     * Low-level request that parses JSON and throws FmClientError on failure.
     */
    private request;
    /**
     * Admin request with envelope unwrapping.
     * Automatically sets credentials: "include" and Content-Type: "application/json".
     */
    private adminRequest;
    /**
     * Raw-body admin request (for proxy uploads).
     * Does NOT set Content-Type: application/json — caller supplies the body's type.
     */
    private adminRawRequest;
    /**
     * XHR-based raw upload with progress tracking.
     * Used when onUploadProgress is provided (fetch doesn't support upload progress).
     */
    private adminRawRequestXhr;
    uploadInit(input: {
        request: FmUploadInitRequest;
    }): Promise<FmUploadInitResponse>;
    uploadFinalize(input: {
        fileUid: string;
        object: {
            bucket: string;
            objectKey: string;
        };
    }): Promise<FmUploadFinalizeResponse>;
    uploadProxied(input: {
        fileUid: string;
        body: ArrayBuffer | Uint8Array | Blob;
        contentType?: string;
        onUploadProgress?: FmUploadProgressCallback;
    }): Promise<FmUploadFinalizeResponse>;
    variantUploadInit(input: {
        request: FmVariantUploadInitRequest;
    }): Promise<FmVariantUploadInitResponse>;
    variantUploadFinalize(input: {
        variantUid: string;
        object: {
            bucket: string;
            objectKey: string;
        };
    }): Promise<FmVariantUploadFinalizeResponse>;
    variantUploadProxied(input: {
        variantUid: string;
        body: ArrayBuffer | Uint8Array | Blob;
        contentType?: string;
        onUploadProgress?: FmUploadProgressCallback;
    }): Promise<FmVariantUploadFinalizeResponse>;
    listFiles(params?: FmFileListFilters): Promise<FmFileListResult>;
    getFile(fileUid: string): Promise<FmFileRow>;
    patchFile(input: {
        fileUid: string;
        patch: {
            title?: string;
            alt_text?: string;
            tags?: string[];
            is_public?: boolean;
        };
    }): Promise<FmFileRow>;
    archiveFile(fileUid: string): Promise<FmFileRow>;
    restoreFile(fileUid: string): Promise<FmFileRow>;
    deleteFile(input: {
        fileUid: string;
        force?: boolean;
    }): Promise<FmDeleteResult>;
    moveFile(input: {
        fileUid: string;
        toBucket?: string;
        toFolderPath?: string;
    }): Promise<{
        file: FmFileRow;
        variants: FmFileVariantRow[];
    }>;
    getReadUrl(input: {
        fileUid: string;
        variantKind?: string;
        expiresInSeconds?: number;
    }): Promise<FmReadUrlResult>;
    getObjectMetadata(input: {
        fileUid: string;
        variantKind?: string;
    }): Promise<{
        metadata: Record<string, string>;
    }>;
    listVariants(fileUid: string): Promise<{
        items: FmFileVariantRow[];
    }>;
    listLinks(input: {
        fileUid: string;
        limit?: number;
        offset?: number;
    }): Promise<FmFileLinkListResult>;
    createLink(input: {
        fileUid: string;
        linkedEntityType: string;
        linkedEntityUid: string;
        linkedField?: string;
    }): Promise<FmFileLinkRow>;
    deleteLink(input: {
        fileUid: string;
        linkedEntityType: string;
        linkedEntityUid: string;
        linkedField?: string;
    }): Promise<void>;
    getContentUrl(input: {
        fileUid: string;
        download?: boolean;
        variantKind?: string;
    }): string;
    getProxyUploadUrl(fileUid: string): string;
    getVariantProxyUploadUrl(variantUid: string): string;
    getPublicMediaUrl(fileUid: string): string;
}
//# sourceMappingURL=FmClient.d.ts.map