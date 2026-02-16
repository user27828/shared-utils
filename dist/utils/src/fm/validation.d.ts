/**
 * FM Validation Utilities — shared-utils
 *
 * Isomorphic helper functions for input validation, parsing, and
 * normalization used throughout the FM system (server + client).
 *
 * These are pure functions with no Supabase or Express dependencies.
 */
/**
 * Check whether a string is a valid v1–v5 UUID.
 *
 * @param value - The string to check
 * @returns true if `value` matches the UUID format
 */
export declare function isUuid(value: string): boolean;
/**
 * Check whether a string is safe for use as a single path segment (UID).
 * Allows alphanumeric characters, hyphens, and underscores only.
 *
 * @param value - The string to check
 * @returns true if `value` is safe for use as a path segment
 */
export declare function isSafeUid(value: string): boolean;
/**
 * Coerce a query-string or JSON value to a boolean.
 * Handles strings ("true", "1", "yes") and numbers. Returns `undefined`
 * when a value cannot be coerced.
 *
 * @param value - The value to coerce (string, boolean, number, null, undefined)
 * @returns A boolean or undefined if the value cannot be coerced
 */
export declare function coerceFmBoolean(value: string | boolean | number | null | undefined): boolean | undefined;
/**
 * Parse, deduplicate, and sort an array of tag strings.
 * - Trims whitespace from each tag
 * - Lowercases all tags
 * - Removes empty strings
 * - Deduplicates
 * - Sorts alphabetically
 *
 * @param tags - Raw tag strings (may contain duplicates, whitespace, etc.)
 * @returns Cleaned, deduplicated, sorted array of tags
 */
export declare function normalizeFmTags(tags: string[]): string[];
/**
 * Extract the file extension from a filename (without the leading dot).
 * Returns an empty string if no extension is present.
 *
 * @param filename - The filename to extract from
 * @returns The lowercase extension without a leading dot (e.g., "jpg")
 */
export declare function extractExtension(filename: string): string;
/**
 * Normalize a MIME type string: trim, lowercase, strip parameters.
 * Example: " Image/PNG ; charset=utf-8 " → "image/png"
 *
 * @param mime - The MIME type string to normalize
 * @returns Normalized MIME type, or empty string if invalid/empty
 */
export declare function normalizeMimeType(mime: string | null | undefined): string;
//# sourceMappingURL=validation.d.ts.map