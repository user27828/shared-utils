/**
 * FM Object Metadata Utilities — shared-utils
 *
 * Build S3-compatible `x-amz-meta-*` metadata dictionaries for FM files.
 * All values are URI-encoded for safe HTTP header transmission.
 *
 * Extracted from: db-supabase/server/fm/utils/objectMetadata.ts
 */
import type { FmPurpose, FmFileRow } from "../../../../utils/src/fm/types.js";

const MAX_VALUE_LEN = 512;

const encodeValue = (value: string): string => {
  const encoded = encodeURIComponent(String(value || "").trim());
  if (!encoded) {
    return "";
  }
  return encoded.length > MAX_VALUE_LEN
    ? encoded.slice(0, MAX_VALUE_LEN)
    : encoded;
};

const cleanKey = (key: string): string => {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

/** Sanitize a raw metadata dict: clean keys, filter empty values. */
const sanitizeMetaDict = (
  meta: Record<string, string>,
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    const kk = cleanKey(k);
    if (!kk) {
      continue;
    }
    const vv = String(v || "").trim();
    if (!vv) {
      continue;
    }
    out[kk] = vv;
  }
  return out;
};

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
export const buildFmObjectMetadataForInit = (input: {
  fileUid: string;
  purpose: FmPurpose;
  originalFilename: string;
  visibility: "public" | "private";
  mimeType?: string;
}): Record<string, string> => {
  const meta: Record<string, string> = {};

  meta["fm-uid"] = encodeValue(input.fileUid);
  meta["fm-purpose"] = encodeValue(input.purpose);
  meta["fm-original-filename"] = encodeValue(input.originalFilename);
  meta["fm-visibility"] = encodeValue(input.visibility);
  if (input.mimeType) {
    meta["fm-mime-type"] = encodeValue(input.mimeType);
  }

  return sanitizeMetaDict(meta);
};

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
export const buildFmObjectMetadataForExistingFile = (input: {
  file: Pick<
    FmFileRow,
    "uid" | "original_filename" | "is_public" | "mime_type"
  >;
}): Record<string, string> => {
  const meta: Record<string, string> = {};

  meta["fm-uid"] = encodeValue(input.file.uid);
  meta["fm-original-filename"] = encodeValue(input.file.original_filename);
  meta["fm-visibility"] = encodeValue(
    input.file.is_public ? "public" : "private",
  );
  if (input.file.mime_type) {
    meta["fm-mime-type"] = encodeValue(input.file.mime_type);
  }

  return sanitizeMetaDict(meta);
};
