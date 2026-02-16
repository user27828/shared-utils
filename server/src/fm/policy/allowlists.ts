/**
 * FM Upload Policy — shared-utils
 *
 * Per-purpose upload validation rules (allowed extensions, MIME types, max size).
 * Pure functions with no external dependencies.
 *
 * Extracted from: db-supabase/server/fm/policy/allowlists.ts
 */
import { z } from "zod";
import type { FmPurpose } from "../../../../utils/src/fm/types.js";

// ── Policy type ───────────────────────────────────────────────────────────

/**
 * Per-purpose upload policy defining allowed file types and size limits.
 * See {@link FM_PURPOSE_POLICIES} for the default policy map.
 */
export interface FmPurposePolicy {
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  allowedMimePrefixes: string[];
  maxBytes: number;
}

// ── Default policies ──────────────────────────────────────────────────────

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Per-purpose upload validation policies.
 *
 * Maps each `FmPurpose` to its allowed file extensions, MIME types,
 * MIME prefixes, and maximum byte size. Consuming apps can wrap or
 * override these at the Express layer for looser rules.
 */
export const FM_PURPOSE_POLICIES: Record<FmPurpose, FmPurposePolicy> = {
  resume: {
    allowedExtensions: ["pdf", "doc", "docx", "txt"],
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/octet-stream",
    ],
    allowedMimePrefixes: ["text/"],
    maxBytes: DEFAULT_MAX_BYTES,
  },
  job: {
    allowedExtensions: ["pdf", "doc", "docx", "txt"],
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/octet-stream",
    ],
    allowedMimePrefixes: ["text/"],
    maxBytes: DEFAULT_MAX_BYTES,
  },
  cms_asset: {
    allowedExtensions: [
      // images
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "avif",
      // docs
      "pdf",
      "doc",
      "docx",
      "txt",
      // videos
      "mp4",
      "webm",
      "ogg",
    ],
    allowedMimeTypes: [
      // images
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/avif",
      // docs
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      // videos
      "video/mp4",
      "video/webm",
      "video/ogg",
      // common uploads from browsers/tools
      "application/octet-stream",
    ],
    allowedMimePrefixes: ["image/", "video/"],
    maxBytes: DEFAULT_MAX_BYTES,
  },
  avatar: {
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "avif"],
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "application/octet-stream",
    ],
    allowedMimePrefixes: ["image/"],
    maxBytes: 10 * 1024 * 1024, // 10 MB
  },
  generic: {
    allowedExtensions: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "avif",
      "pdf",
      "txt",
    ],
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/avif",
      "application/pdf",
      "text/plain",
      "application/octet-stream",
    ],
    allowedMimePrefixes: ["image/", "text/"],
    maxBytes: DEFAULT_MAX_BYTES,
  },
};

// ── Validation ────────────────────────────────────────────────────────────

/** Zod schema for the result of {@link validateFmUploadInputs}. */
export const FmUploadValidationResultSchema = z
  .object({
    ext: z.string().min(1),
    normalizedMimeType: z.string().min(1),
    effectivePurpose: z.string().min(1),
  })
  .strict();

export type FmUploadValidationResult = z.infer<
  typeof FmUploadValidationResultSchema
>;

/**
 * Extract the lowercase file extension from a filename or path.
 *
 * Handles paths with directory separators by isolating the basename first.
 * Returns an empty string if no extension is found.
 *
 * @param filename - The filename or path to extract the extension from.
 * @returns The lowercase extension without the leading dot, or empty string.
 */
const extractExtensionLower = (filename: string): string => {
  const base = filename.split("/").pop() || filename;
  const dot = base.lastIndexOf(".");
  if (dot === -1 || dot === base.length - 1) {
    return "";
  }
  return base.slice(dot + 1).toLowerCase();
};

/**
 * Validate file upload inputs against the purpose-specific policy.
 *
 * Checks file size, extension, and MIME type against the policy defined
 * in `FM_PURPOSE_POLICIES` for the given purpose. Returns normalized
 * validation results on success.
 *
 * @param input - The upload inputs to validate.
 * @param input.purpose - The file's intended purpose (determines which policy applies).
 * @param input.originalFilename - The user's original filename (used to extract extension).
 * @param input.mimeType - The declared MIME type of the upload.
 * @param input.sizeBytes - The file size in bytes.
 * @param policies - Optional custom policy map (defaults to FM_PURPOSE_POLICIES).
 * @returns Normalized extension, MIME type, and effective purpose.
 * @throws If the purpose is unsupported, size is invalid/too large, extension is disallowed, or MIME type is disallowed.
 */
export const validateFmUploadInputs = (
  input: {
    purpose: FmPurpose;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  },
  policies: Record<string, FmPurposePolicy> = FM_PURPOSE_POLICIES,
): FmUploadValidationResult => {
  const policy = policies[input.purpose];
  if (!policy) {
    throw new Error("Unsupported purpose");
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes < 0) {
    throw new Error("Invalid sizeBytes");
  }
  if (input.sizeBytes > policy.maxBytes) {
    throw new Error("File too large");
  }

  const ext = extractExtensionLower(input.originalFilename);
  if (!ext || !policy.allowedExtensions.includes(ext)) {
    throw new Error("File extension not allowed");
  }

  const mimeType = (input.mimeType || "").toLowerCase().trim();
  const mimeAllowed =
    policy.allowedMimeTypes.includes(mimeType) ||
    policy.allowedMimePrefixes.some((p) => mimeType.startsWith(p));

  if (!mimeAllowed) {
    throw new Error("MIME type not allowed");
  }

  return {
    ext,
    normalizedMimeType: mimeType,
    effectivePurpose: input.purpose,
  };
};
