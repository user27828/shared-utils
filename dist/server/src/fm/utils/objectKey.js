/**
 * FM Object Key Utilities — shared-utils
 *
 * Pure functions for building and sanitizing storage object keys.
 * No external dependencies — safe for isomorphic use.
 *
 * Extracted from: db-supabase/server/fm/utils/objectKey.ts
 */
/**
 * Sanitize a single path segment for use in FM object keys.
 *
 * Replaces all characters outside `[a-zA-Z0-9_-]` with hyphens,
 * collapses consecutive hyphens, and strips leading/trailing hyphens and underscores.
 *
 * @param seg - Raw path segment.
 * @returns A cleaned, filesystem-safe segment string.
 */
const safeSegment = (seg) => {
    const s = (seg || "").trim();
    const cleaned = s.replace(/[^a-zA-Z0-9_-]/g, "-");
    return cleaned.replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "");
};
/**
 * Sanitize and normalize a folder path for use in FM object keys.
 *
 * Normalizes slashes, removes `.` and `..` traversals, sanitizes each
 * segment via `safeSegment`, and limits depth to 20 segments.
 *
 * @param folderPath - Raw folder path string (forward or back slashes).
 * @returns A sanitized, forward-slash-delimited folder path (empty string if input is falsy).
 */
export const sanitizeFmFolderPath = (folderPath) => {
    if (!folderPath) {
        return "";
    }
    const normalized = folderPath
        .replace(/\\/g, "/")
        .split("/")
        .filter((s) => s && s !== "." && s !== "..")
        .map(safeSegment)
        .filter(Boolean)
        .slice(0, 20)
        .join("/");
    return normalized;
};
/**
 * Build a complete FM storage object key from a UID, optional extension, and optional folder path.
 *
 * The result is a relative path like `folder/sub/uid.ext` or just `uid.ext`
 * when no folder is specified.
 *
 * @param input - Key components.
 * @param input.uid - The file's unique identifier (used as the filename stem).
 * @param input.ext - File extension without leading dot (e.g. "png", "pdf").
 * @param input.folderPath - Optional folder path prefix (sanitized internally).
 * @returns A relative object key suitable for storage backends.
 */
export const buildFmObjectKey = (input) => {
    const folder = sanitizeFmFolderPath(input.folderPath);
    const ext = (input.ext || "").trim().toLowerCase();
    const filename = ext ? `${input.uid}.${ext}` : input.uid;
    return folder ? `${folder}/${filename}` : filename;
};
//# sourceMappingURL=objectKey.js.map