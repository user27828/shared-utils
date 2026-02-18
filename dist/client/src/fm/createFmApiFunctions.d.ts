/**
 * createFmApiFunctions — Standalone Function Adapter
 *
 * Wraps an `FmApi` (or `FmClient`) instance into a bag of standalone
 * functions matching the legacy `db-supabase/client/fm/api` signatures.
 *
 * This enables gradual migration: consuming apps (e.g. CKEditor integration
 * in the admin panel) can switch from the old standalone imports to
 * `createFmApiFunctions(client)` without changing their call sites.
 *
 * Usage:
 *   import { FmClient, createFmApiFunctions } from "@user27828/shared-utils/fm/client";
 *   const client = new FmClient({ adminBaseUrl: "/api/admin/fm" });
 *   const {
 *     fmUploadInitApi,
 *     fmUploadFinalizeApi,
 *     fmGetContentUrl,
 *     ...
 *   } = createFmApiFunctions(client);
 */
import type { FmApi } from "./FmApi.js";
import type { FmFileRow, FmFileVariantRow, FmFileLinkRow, FmFileListResult, FmFileLinkListResult, FmUploadInitRequest, FmUploadInitResponse, FmUploadFinalizeResponse, FmVariantUploadInitRequest, FmVariantUploadInitResponse, FmVariantUploadFinalizeResponse } from "../../../utils/src/fm/types.js";
import type { FmReadUrlResult, FmDeleteResult } from "./FmApi.js";
/**
 * Bag of standalone functions that wrap an {@link FmApi} instance.
 *
 * Provides backward-compatible signatures matching the legacy
 * `db-supabase/client/fm/api` module for gradual migration.
 */
export interface FmApiFunctions {
    fmUploadInitApi: (input: {
        request: FmUploadInitRequest;
    }) => Promise<FmUploadInitResponse>;
    fmUploadFinalizeApi: (input: {
        fileUid: string;
        object: {
            bucket: string;
            objectKey: string;
        };
    }) => Promise<FmUploadFinalizeResponse>;
    fmUploadProxiedApi: (input: {
        fileUid: string;
        body: ArrayBuffer | Uint8Array | Blob;
        contentType?: string;
    }) => Promise<FmUploadFinalizeResponse>;
    fmVariantUploadInitApi: (input: {
        request: FmVariantUploadInitRequest;
    }) => Promise<FmVariantUploadInitResponse>;
    fmVariantUploadFinalizeApi: (input: {
        variantUid: string;
        object: {
            bucket: string;
            objectKey: string;
        };
    }) => Promise<FmVariantUploadFinalizeResponse>;
    fmVariantUploadProxiedApi: (input: {
        variantUid: string;
        body: ArrayBuffer | Uint8Array | Blob;
        contentType?: string;
    }) => Promise<FmVariantUploadFinalizeResponse>;
    fmGetFileApi: (input: {
        fileUid: string;
    }) => Promise<FmFileRow>;
    fmPatchFileApi: (input: {
        fileUid: string;
        patch: {
            title?: string;
            alt_text?: string;
            tags?: string[];
            is_public?: boolean;
        };
    }) => Promise<FmFileRow>;
    fmArchiveFileApi: (input: {
        fileUid: string;
    }) => Promise<FmFileRow>;
    fmRestoreFileApi: (input: {
        fileUid: string;
    }) => Promise<FmFileRow>;
    fmDeleteFileApi: (input: {
        fileUid: string;
        force?: boolean;
    }) => Promise<FmDeleteResult>;
    fmMoveFileApi: (input: {
        fileUid: string;
        toBucket?: string;
        toFolderPath?: string;
    }) => Promise<{
        file: FmFileRow;
        variants: FmFileVariantRow[];
    }>;
    fmListLinksApi: (input: {
        fileUid: string;
        limit?: number;
        offset?: number;
    }) => Promise<FmFileLinkListResult>;
    fmCreateLinkApi: (input: {
        fileUid: string;
        linkedEntityType: string;
        linkedEntityUid: string;
        linkedField?: string;
    }) => Promise<FmFileLinkRow>;
    fmDeleteLinkApi: (input: {
        fileUid: string;
        linkedEntityType: string;
        linkedEntityUid: string;
        linkedField?: string;
    }) => Promise<void>;
    fmListVariantsApi: (input: {
        fileUid: string;
    }) => Promise<{
        items: FmFileVariantRow[];
    }>;
    fmGetReadUrlApi: (input: {
        fileUid: string;
        variantKind?: string;
        expiresInSeconds?: number;
    }) => Promise<FmReadUrlResult>;
    fmGetObjectMetadataApi: (input: {
        fileUid: string;
        variantKind?: string;
    }) => Promise<{
        metadata: Record<string, string>;
    }>;
    fmListFilesApi: (params?: Record<string, unknown>) => Promise<FmFileListResult>;
    fmGetContentUrl: (input: {
        fileUid: string;
        download?: boolean;
        variantKind?: string;
        variantWidth?: number;
    }) => string;
    fmGetProxyUploadUrl: (input: {
        fileUid: string;
    }) => string;
    fmGetVariantProxyUploadUrl: (input: {
        variantUid: string;
    }) => string;
    fmGetPublicMediaUrl: (input: {
        fileUid: string;
    }) => string;
}
/**
 * Create a bag of standalone functions that delegate to an FmApi instance.
 *
 * Signatures are backward-compatible with the legacy `db-supabase/client/fm/api`
 * module, so consuming code can switch with minimal changes.
 */
export declare function createFmApiFunctions(api: FmApi): FmApiFunctions;
//# sourceMappingURL=createFmApiFunctions.d.ts.map