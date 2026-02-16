/**
 * FM Validation Utilities — shared-utils
 *
 * Isomorphic helper functions for input validation, parsing, and
 * normalization used throughout the FM system (server + client).
 *
 * These are pure functions with no Supabase or Express dependencies.
 */

// ── UUID detection ────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check whether a string is a valid v1–v5 UUID.
 *
 * @param value - The string to check
 * @returns true if `value` matches the UUID format
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

// ── UID / path-segment safety ─────────────────────────────────────────────

const SAFE_UID_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Check whether a string is safe for use as a single path segment (UID).
 * Allows alphanumeric characters, hyphens, and underscores only.
 *
 * @param value - The string to check
 * @returns true if `value` is safe for use as a path segment
 */
export function isSafeUid(value: string): boolean {
  if (!value || value.length === 0 || value.length > 200) {
    return false;
  }
  return SAFE_UID_RE.test(value);
}

// ── Boolean coercion ──────────────────────────────────────────────────────

/**
 * Coerce a query-string or JSON value to a boolean.
 * Handles strings ("true", "1", "yes") and numbers. Returns `undefined`
 * when a value cannot be coerced.
 *
 * @param value - The value to coerce (string, boolean, number, null, undefined)
 * @returns A boolean or undefined if the value cannot be coerced
 */
export function coerceFmBoolean(
  value: string | boolean | number | null | undefined,
): boolean | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const lower = value.toLowerCase().trim();
  if (lower === "true" || lower === "1" || lower === "yes") {
    return true;
  }
  if (lower === "false" || lower === "0" || lower === "no") {
    return false;
  }
  return undefined;
}

// ── Tag normalization ─────────────────────────────────────────────────────

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
export function normalizeFmTags(tags: string[]): string[] {
  const cleaned = tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  return [...new Set(cleaned)].sort();
}

// ── Extension extraction ──────────────────────────────────────────────────

/**
 * Extract the file extension from a filename (without the leading dot).
 * Returns an empty string if no extension is present.
 *
 * @param filename - The filename to extract from
 * @returns The lowercase extension without a leading dot (e.g., "jpg")
 */
export function extractExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 1 || dot === filename.length - 1) {
    return "";
  }
  return filename.slice(dot + 1).toLowerCase();
}

// ── MIME type normalization ───────────────────────────────────────────────

/**
 * Normalize a MIME type string: trim, lowercase, strip parameters.
 * Example: " Image/PNG ; charset=utf-8 " → "image/png"
 *
 * @param mime - The MIME type string to normalize
 * @returns Normalized MIME type, or empty string if invalid/empty
 */
export function normalizeMimeType(mime: string | null | undefined): string {
  if (!mime) {
    return "";
  }
  const semi = mime.indexOf(";");
  const base = (semi >= 0 ? mime.slice(0, semi) : mime).trim().toLowerCase();
  return base;
}
