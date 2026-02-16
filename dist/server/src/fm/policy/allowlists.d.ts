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
/**
 * Per-purpose upload validation policies.
 *
 * Maps each `FmPurpose` to its allowed file extensions, MIME types,
 * MIME prefixes, and maximum byte size. Consuming apps can wrap or
 * override these at the Express layer for looser rules.
 */
export declare const FM_PURPOSE_POLICIES: Record<FmPurpose, FmPurposePolicy>;
/** Zod schema for the result of {@link validateFmUploadInputs}. */
export declare const FmUploadValidationResultSchema: z.ZodObject<{
    ext: z.ZodString;
    normalizedMimeType: z.ZodString;
    effectivePurpose: z.ZodString;
}, z.core.$strict>;
export type FmUploadValidationResult = z.infer<typeof FmUploadValidationResultSchema>;
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
export declare const validateFmUploadInputs: (input: {
    purpose: FmPurpose;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
}, policies?: Record<string, FmPurposePolicy>) => FmUploadValidationResult;
//# sourceMappingURL=allowlists.d.ts.map