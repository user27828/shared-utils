/**
 * FM Object Metadata Utilities — shared-utils
 *
 * Build S3-compatible `x-amz-meta-*` metadata dictionaries for FM files.
 * All values are URI-encoded for safe HTTP header transmission.
 *
 * Extracted from: db-supabase/server/fm/utils/objectMetadata.ts
 */
import type { FmPurpose, FmFileRow } from "../../../../utils/src/fm/types.js";
/**
 * Build storage-provider metadata headers for a newly uploaded FM file.
 *
 * All values are URI-encoded for safe transmission via HTTP headers
 * (required for S3-compatible providers). Keys are lowercased and prefixed
 * with `fm-`.
 *
 * @param input - Metadata source values.
 * @param input.fileUid - The file's unique identifier.
 * @param input.purpose - The file's purpose category (e.g. "resume", "avatar").
 * @param input.originalFilename - The user's original upload filename.
 * @param input.visibility - File visibility setting.
 * @param input.mimeType - Optional MIME type to include in metadata.
 * @returns A key-value map of sanitized metadata entries.
 */
export declare const buildFmObjectMetadataForInit: (input: {
    fileUid: string;
    purpose: FmPurpose;
    originalFilename: string;
    visibility: "public" | "private";
    mimeType?: string;
}) => Record<string, string>;
/**
 * Build storage-provider metadata headers from an existing FM file row.
 *
 * Useful when re-uploading or migrating a file's storage object
 * while preserving its metadata. Derives visibility from `is_public`.
 *
 * @param input - Input containing the file record.
 * @param input.file - Relevant fields from the existing file row.
 * @returns A key-value map of sanitized metadata entries.
 */
export declare const buildFmObjectMetadataForExistingFile: (input: {
    file: Pick<FmFileRow, "uid" | "original_filename" | "is_public" | "mime_type">;
}) => Record<string, string>;
//# sourceMappingURL=objectMetadata.d.ts.map