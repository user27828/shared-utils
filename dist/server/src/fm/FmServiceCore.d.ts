import type { FmFileRow, FmFileVariantRow, FmFileLinkRow, FmObjectRef, FmUploadInitRequest, FmUploadInitResponse, FmUploadFinalizeResponse, FmVariantUploadInitRequest, FmVariantUploadInitResponse, FmVariantUploadFinalizeResponse, FmFileListFilters, FmFileListResult, FmFileLinkInsert, FmFileLinkListFilters, FmFileLinkListResult, FmWriteEvent } from "../../../utils/src/fm/types.js";
import type { FmConnector } from "./FmConnector.js";
import type { FmServerConfig } from "./config.js";
import type { FmStorageAdapter } from "./storage/FmStorageAdapter.js";
/**
 * Configuration for FmServiceCore.
 *
 * Constructed from FmServerConfig plus injected dependencies.
 */
export interface FmServiceCoreConfig {
    /** Parsed FM server configuration. */
    config: FmServerConfig;
    /** DB connector (implements FmConnector interface). */
    connector: FmConnector;
    /** Object storage adapter. */
    storage: FmStorageAdapter;
    /**
     * Optional post-write hook. Called after successful mutations
     * (uploads, deletes, moves, archive/restore, variant uploads).
     * Invoked best-effort: errors are caught and logged, never propagated.
     */
    onWrite?: (event: FmWriteEvent) => void | Promise<void>;
}
/**
 * Database-agnostic FM service core.
 *
 * Orchestrates uploads (direct + proxied), variant management, archive/restore,
 * delete, move, link management, URL resolution, and content streaming.
 * Delegates persistence to an {@link FmConnector} and object I/O to an
 * {@link FmStorageAdapter}.
 */
export declare class FmServiceCore {
    private readonly cfg;
    readonly connector: FmConnector;
    private readonly storage;
    private readonly onWrite?;
    constructor(init: FmServiceCoreConfig);
    /** The underlying FmConnector. */
    getConnector(): FmConnector;
    /** The underlying FmStorageAdapter. */
    getStorage(): FmStorageAdapter;
    /** The parsed FmServerConfig. */
    getConfig(): FmServerConfig;
    private emitWrite;
    uploadInit(input: {
        request: FmUploadInitRequest;
        ownerUserUid?: string | null;
        createdBy?: string | null;
    }): Promise<FmUploadInitResponse>;
    /**
     * Finalize a file upload after the client has written the object.
     *
     * Verifies the uploaded object exists in storage, confirms the object
     * reference matches the init record, performs MIME sniffing + image
     * dimension extraction, computes SHA-256 (local storage), and updates
     * the `fm_files` row with the finalized metadata.
     *
     * @param input.request - Finalize request containing file UID and object ref.
     * @returns The finalized file row.
     * @throws {FmNotFoundError} If the file or uploaded object is not found.
     * @throws {FmValidationError} If the finalize object ref does not match init.
     * @throws {FmStorageError} If the storage adapter lacks headObject capability.
     */
    uploadFinalize(input: {
        request: unknown;
    }): Promise<FmUploadFinalizeResponse>;
    /**
     * Proxied upload: write the request body to storage and finalize in one step.
     *
     * Used when the client cannot upload directly (no presigned URL support).
     * Writes the body via the storage adapter, then delegates to
     * {@link uploadFinalize} for verification and metadata updates.
     *
     * @param input.fileUid - UID of the file (from uploadInit).
     * @param input.body - Raw file bytes.
     * @param input.contentType - Optional MIME type override.
     * @returns The finalized file row.
     * @throws {FmNotFoundError} If the file record is not found.
     * @throws {FmValidationError} If the body exceeds the declared size or file is archived.
     * @throws {FmStorageError} If the storage adapter lacks writeObject/headObject capability.
     */
    uploadWriteAndFinalize(input: {
        fileUid: string;
        body: Uint8Array | Buffer;
        contentType?: string;
    }): Promise<FmUploadFinalizeResponse>;
    /**
     * Initiate a variant upload for an existing file.
     *
     * Creates a variant record in the database, resolves the storage path
     * relative to the parent file, and returns either a presigned PUT URL
     * or signals proxied mode.
     *
     * @param input.request - Variant upload init request (parent UID, kind, dimensions, etc.).
     * @returns Variant init response with variant UID, upload mode, object ref, and optional presigned URL.
     * @throws {FmNotFoundError} If the parent file is not found.
     * @throws {FmValidationError} If the parent file is archived or purpose mismatches.
     * @throws {FmPolicyError} If the variant violates upload policy.
     */
    variantUploadInit(input: {
        request: FmVariantUploadInitRequest;
    }): Promise<FmVariantUploadInitResponse>;
    /**
     * Finalize a variant upload after the client has written the object.
     *
     * Verifies the uploaded object exists, performs MIME sniffing and image
     * dimension validation (with tolerance), and updates the variant row.
     *
     * @param input.request - Finalize request containing variant UID and object ref.
     * @returns The finalized variant row.
     * @throws {FmNotFoundError} If the variant or uploaded object is not found.
     * @throws {FmValidationError} If object ref mismatches or dimensions exceed tolerance.
     * @throws {FmStorageError} If the storage adapter lacks headObject capability.
     */
    variantUploadFinalize(input: {
        request: unknown;
    }): Promise<FmVariantUploadFinalizeResponse>;
    /**
     * Proxied variant upload: write the body to storage and finalize in one step.
     *
     * @param input.variantUid - UID of the variant (from variantUploadInit).
     * @param input.body - Raw variant bytes.
     * @param input.contentType - Optional MIME type override.
     * @returns The finalized variant row.
     * @throws {FmNotFoundError} If the variant record is not found.
     * @throws {FmValidationError} If the body exceeds the declared size.
     * @throws {FmStorageError} If the storage adapter lacks writeObject capability.
     */
    variantUploadWriteAndFinalize(input: {
        variantUid: string;
        body: Uint8Array | Buffer;
        contentType?: string;
    }): Promise<FmVariantUploadFinalizeResponse>;
    /**
     * Read storage-level metadata for a file or one of its variants.
     *
     * For S3 objects this returns the custom metadata headers; for local
     * storage it checks file existence and size.
     *
     * @param input.fileUid - File UID to look up.
     * @param input.variantKind - Optional variant kind ("thumb", "web", "preview").
     * @returns The metadata key-value pairs from the storage object.
     * @throws {FmNotFoundError} If the file or storage object is not found.
     * @throws {FmStorageError} If the storage adapter lacks headObject capability.
     */
    getStorageObjectMetadata(input: {
        fileUid: string;
        variantKind?: string;
    }): Promise<{
        metadata: Record<string, string>;
    }>;
    /**
     * Resolve a read URL for a file (with optional variant).
     *
     * URL resolution strategy:
     * 1. Public files: direct S3 public URL (if supported) or canonical `/media/:uid` URL.
     * 2. Private files: presigned GET URL (if supported) or canonical URL as fallback.
     *
     * @param input.fileUid - File UID to resolve.
     * @param input.variantKind - Optional variant kind to resolve instead of the main file.
     * @param input.req - Express-like request for building canonical URLs.
     * @param input.expiresInSeconds - TTL override for presigned URLs.
     * @returns Object with `url`, `kind` ("public" | "signed" | "canonical"), and optional `expiresAtIso`.
     * @throws {FmNotFoundError} If the file is not found.
     */
    resolveReadUrl(input: {
        fileUid: string;
        variantKind?: string;
        req?: any;
        expiresInSeconds?: number;
    }): Promise<{
        url: string;
        kind: "public" | "signed" | "canonical";
        expiresAtIso?: string;
    }>;
    /**
     * Resolve content access information for a file (with optional variant).
     *
     * Returns the info needed for Express routers to stream content. Does not
     * perform the actual streaming (that's route-layer responsibility).
     */
    resolveContentAccess(input: {
        fileUid: string;
        variantKind?: string;
    }): Promise<{
        provider: "local" | "s3";
        ref: FmObjectRef;
        file: FmFileRow;
        absPath?: string;
        redirectUrl?: string;
        contentType?: string;
    }>;
    /**
     * List files with pagination, filtering, and sorting.
     *
     * @param params - Filter, sort, and pagination parameters.
     * @returns Paginated file listing result.
     */
    listFiles(params: FmFileListFilters): Promise<FmFileListResult>;
    /**
     * Get a single file by its UID.
     *
     * @param uid - The file UID.
     * @returns The file row, or `null` if not found.
     */
    getFileByUid(uid: string): Promise<FmFileRow | null>;
    /**
     * Soft-archive a file by setting its `archived_at` timestamp.
     *
     * No-op if the file is already archived.
     *
     * @param input.fileUid - File UID to archive.
     * @param input.userUid - UID of the user performing the action.
     * @returns The updated file row.
     * @throws {FmNotFoundError} If the file is not found.
     */
    archiveFile(input: {
        fileUid: string;
        userUid?: string;
    }): Promise<FmFileRow>;
    /**
     * Restore an archived file by clearing its `archived_at` timestamp.
     *
     * No-op if the file is not archived.
     *
     * @param input.fileUid - File UID to restore.
     * @param input.userUid - UID of the user performing the action.
     * @returns The updated file row.
     * @throws {FmNotFoundError} If the file is not found.
     */
    restoreFile(input: {
        fileUid: string;
        userUid?: string;
    }): Promise<FmFileRow>;
    /**
     * Delete a file (soft-archive or hard delete).
     *
     * If the file has active links and `force` is not set, the file is
     * soft-archived instead. Hard deletion (`force: true`) requires
     * `isAdmin: true` and removes the file, all variants, and all
     * storage objects permanently.
     *
     * @param input.fileUid - File UID to delete.
     * @param input.force - Hard-delete even if links exist (requires admin).
     * @param input.isAdmin - Whether the caller has admin privileges.
     * @param input.userUid - UID of the user performing the action.
     * @returns A discriminated union: `{ action: "archived" }` or `{ action: "deleted" }`.
     * @throws {FmNotFoundError} If the file is not found.
     * @throws {FmAuthorizationError} If `force` is set without `isAdmin`.
     * @throws {FmStorageError} If storage adapter lacks deleteObject capability.
     */
    deleteFile(input: {
        fileUid: string;
        force?: boolean;
        isAdmin?: boolean;
        userUid?: string;
    }): Promise<FmDeleteOutcome>;
    /**
     * Move a file (and its variants) to a different bucket or folder.
     *
     * Copies objects to the destination, updates DB storage keys, then
     * best-effort deletes old objects. If cleanup fails, metadata already
     * points at the new location.
     *
     * @param input.fileUid - File UID to move.
     * @param input.toBucket - Destination bucket (must be in allowed presets).
     * @param input.toFolderPath - Destination folder path.
     * @param input.userUid - UID of the user performing the action.
     * @returns The updated file and variant rows.
     * @throws {FmNotFoundError} If the file is not found.
     * @throws {FmValidationError} If the file is archived.
     * @throws {FmPolicyError} If the destination bucket is not allowed.
     * @throws {FmStorageError} If storage lacks copy/delete capabilities.
     */
    moveFile(input: {
        fileUid: string;
        toBucket?: string;
        toFolderPath?: string;
        userUid?: string;
    }): Promise<{
        file: FmFileRow;
        variants: FmFileVariantRow[];
    }>;
    createLink(input: FmFileLinkInsert): Promise<FmFileLinkRow>;
    /**
     * Delete a link between a file and an external entity.
     *
     * @param input.fileUid - File UID.
     * @param input.linkedEntityType - Entity type.
     * @param input.linkedEntityUid - Entity UID.
     */
    deleteLink(input: {
        fileUid: string;
        linkedEntityType: string;
        linkedEntityUid: string;
    }): Promise<void>;
    /**
     * List links for a file with optional pagination.
     *
     * @param fileUid - File UID.
     * @param params - Optional filter and pagination parameters.
     * @returns Paginated link listing result.
     */
    listLinksForFile(fileUid: string, params?: FmFileLinkListFilters): Promise<FmFileLinkListResult>;
    /**
     * Patch file metadata (title, alt_text, tags, is_public).
     *
     * Business rules:
     * - Local storage forces is_public=true (no presigned URLs for local files)
     * - Tags are normalized (trimmed, deduplicated)
     * - Only whitelisted fields are updateable
     */
    patchFile(input: {
        fileUid: string;
        patch: {
            title?: string;
            alt_text?: string;
            tags?: string[];
            is_public?: boolean;
        };
    }): Promise<FmFileRow>;
    /**
     * List all variants for a file.
     *
     * @param fileUid - File UID.
     * @returns Array of variant rows.
     */
    listVariantsForFile(fileUid: string): Promise<FmFileVariantRow[]>;
}
/**
 * Discriminated union describing the result of a delete operation.
 *
 * - `"archived"`: file was soft-archived because active links exist (and `force` was not set).
 * - `"deleted"`: file and all variants were permanently removed from storage and DB.
 */
export type FmDeleteOutcome = {
    action: "archived";
    file: FmFileRow;
    linkCount: number;
} | {
    action: "deleted";
    fileUid: string;
    deletedObjects: number;
};
//# sourceMappingURL=FmServiceCore.d.ts.map