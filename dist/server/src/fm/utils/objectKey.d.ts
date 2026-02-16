/**
 * FM Object Key Utilities — shared-utils
 *
 * Pure functions for building and sanitizing storage object keys.
 * No external dependencies — safe for isomorphic use.
 *
 * Extracted from: db-supabase/server/fm/utils/objectKey.ts
 */
/**
 * Sanitize and normalize a folder path for use in FM object keys.
 *
 * Normalizes slashes, removes `.` and `..` traversals, sanitizes each
 * segment via `safeSegment`, and limits depth to 20 segments.
 *
 * @param folderPath - Raw folder path string (forward or back slashes).
 * @returns A sanitized, forward-slash-delimited folder path (empty string if input is falsy).
 */
export declare const sanitizeFmFolderPath: (folderPath?: string) => string;
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
export declare const buildFmObjectKey: (input: {
    uid: string;
    ext?: string;
    folderPath?: string;
}) => string;
//# sourceMappingURL=objectKey.d.ts.map