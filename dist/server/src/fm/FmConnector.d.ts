/**
 * FM Connector Interface — shared-utils
 *
 * The "port" that database-specific adapters (db-supabase, db-postgres, etc.)
 * must implement. FmServiceCore depends only on this interface, making the
 * core storage-agnostic.
 *
 * Connectors are responsible for:
 * - Table-level persistence and query translation
 * - Returning data shaped as FmFileRow / FmFileVariantRow / FmFileLinkRow
 *
 * Connectors must NOT:
 * - Perform MIME sniffing, SHA-256 hashing, or dimension extraction (service responsibility)
 * - Enforce upload policies (policy module responsibility)
 * - Handle storage object operations (storage adapter responsibility)
 */
import type { FmFileRow, FmFileVariantRow, FmFileLinkRow, FmFileInsert, FmFilePatch, FmVariantInsert, FmVariantPatch, FmFileLinkInsert, FmFileListFilters, FmFileListResult, FmFileLinkListFilters, FmFileLinkListResult } from "../../../utils/src/fm/types.js";
/**
 * Database connector interface for the FM subsystem.
 *
 * Implementations provide table-level CRUD for fm_files, fm_file_variants,
 * and fm_file_links. FmServiceCore depends only on this contract, keeping
 * the core storage-agnostic.
 */
export interface FmConnector {
    /** Get a single file row by UID. */
    getFileByUid(uid: string): Promise<FmFileRow | null>;
    /** Insert a new file row. Returns the inserted row. */
    insertFile(row: FmFileInsert): Promise<FmFileRow>;
    /**
     * Update a file row by UID. Returns the updated row, or null if not found.
     * The connector should automatically set `updated_at` to the current timestamp.
     */
    updateFileByUid(uid: string, patch: FmFilePatch): Promise<FmFileRow | null>;
    /** Permanently delete a file row by UID. */
    deleteFileByUid(uid: string): Promise<void>;
    /**
     * List files with filtering, search, and pagination.
     * Connectors MUST sanitize the `search` field against injection.
     */
    listFiles(params: FmFileListFilters): Promise<FmFileListResult>;
    /** Get a single variant row by UID. */
    getVariantByUid(uid: string): Promise<FmFileVariantRow | null>;
    /** List all variants for a parent file UID. */
    listVariantsForFile(fileUid: string): Promise<FmFileVariantRow[]>;
    /** Insert a new variant row. Returns the inserted row. */
    insertVariant(row: FmVariantInsert): Promise<FmFileVariantRow>;
    /**
     * Update a variant row by UID. Returns the updated row, or null if not found.
     */
    updateVariantByUid(uid: string, patch: FmVariantPatch): Promise<FmFileVariantRow | null>;
    /** Permanently delete all variant rows for a parent file UID. */
    deleteVariantsForFile(fileUid: string): Promise<void>;
    /**
     * Count the number of links pointing to a file UID.
     * Used for delete safety checks (refuse delete if links > 0).
     */
    countLinksForFile(fileUid: string): Promise<number>;
    /** Insert a new file link row. Returns the inserted row. */
    createLink(row: FmFileLinkInsert): Promise<FmFileLinkRow>;
    /**
     * Delete a file link by composite key (file_uid + entity type + entity uid).
     * When linkedField is provided, only the link with that specific field is
     * deleted; otherwise all matching rows are removed.
     */
    deleteLink(params: {
        fileUid: string;
        linkedEntityType: string;
        linkedEntityUid: string;
        linkedField?: string;
    }): Promise<void>;
    /**
     * List file links with filtering and pagination.
     * The core service passes filters that connectors should apply.
     */
    listLinksForFile(fileUid: string, params?: FmFileLinkListFilters): Promise<FmFileLinkListResult>;
}
/**
 * Optional: Transactional connector. If implemented, FmServiceCore uses
 * transactions for multi-step operations (e.g., delete file + delete variants + delete storage).
 */
export interface FmConnectorWithTransaction extends FmConnector {
    /**
     * Execute a function within a database transaction.
     * The connector should roll back on error.
     */
    withTransaction<T>(fn: (txConnector: FmConnector) => Promise<T>): Promise<T>;
}
/** Type guard: check if a connector supports transactions. */
export declare function hasTransaction(connector: FmConnector): connector is FmConnectorWithTransaction;
/**
 * Optional: Batch delete for variants by UIDs. More efficient than iterating
 * one-by-one in connectors that support bulk operations.
 */
export interface FmConnectorWithBatchVariantDelete extends FmConnector {
    /** Delete multiple variant rows by their UIDs. */
    deleteVariantsByUids(uids: string[]): Promise<void>;
}
/** Type guard: check if a connector supports batch variant deletes. */
export declare function hasBatchVariantDelete(connector: FmConnector): connector is FmConnectorWithBatchVariantDelete;
/**
 * Optional: Batch variant listing for a set of parent file UIDs.
 *
 * Connectors can implement this to avoid N+1 variant queries for file
 * listings that request `includeVariants: true`.
 */
export interface FmConnectorWithBatchVariantList extends FmConnector {
    /** List variant rows for multiple parent file UIDs in one call. */
    listVariantsForFiles(fileUids: string[]): Promise<FmFileVariantRow[]>;
}
/** Type guard: check if a connector supports batch variant listing. */
export declare function hasBatchVariantList(connector: FmConnector): connector is FmConnectorWithBatchVariantList;
/**
 * Optional: Entity-centric link queries.  Enables features like
 * "list all FM files referenced by a CMS post" or "remove all links
 * for a deleted entity" without knowing the file UIDs up-front.
 */
export interface FmConnectorWithEntityLinks extends FmConnector {
    /**
     * List all file-link rows for a given entity (e.g., all FM files
     * referenced by CMS post `uid`).
     */
    listLinksForEntity(linkedEntityType: string, linkedEntityUid: string): Promise<FmFileLinkRow[]>;
    /**
     * Delete all file-link rows for a given entity.
     * Used when a CMS post is permanently deleted.
     */
    deleteLinksForEntity(linkedEntityType: string, linkedEntityUid: string): Promise<void>;
}
/** Type guard: check if a connector supports entity-centric link queries. */
export declare function hasEntityLinks(connector: FmConnector): connector is FmConnectorWithEntityLinks;
/**
 * Optional: file-centric bulk link deletion. Enables hard-delete flows to
 * remove all `fm_file_links` rows that point at a file before deleting it.
 */
export interface FmConnectorWithFileLinkDelete extends FmConnector {
    /** Delete all file-link rows for a file UID. */
    deleteLinksForFile(fileUid: string): Promise<void>;
}
/** Type guard: check if a connector supports file-centric link deletion. */
export declare function hasFileLinkDelete(connector: FmConnector): connector is FmConnectorWithFileLinkDelete;
//# sourceMappingURL=FmConnector.d.ts.map