/**
 * FM MIME Sniffing — shared-utils
 *
 * Pure-function MIME type detection from file header bytes (magic numbers).
 * No filesystem or network I/O — operates on a Buffer that has already been
 * read from storage.
 *
 * Supports:
 *  - application/pdf (PDF)
 *  - image/png, image/jpeg, image/gif, image/webp, image/avif, image/svg+xml
 *  - video/webm, video/mp4
 *
 * Extracted from: db-supabase/server/fm/service/fmService.ts (sniffMimeFromHeader)
 */
/**
 * Detect MIME type from raw file header bytes using magic-number signatures.
 *
 * Callers should provide at least 64 bytes (1024 for SVG detection).
 * Returns null if the format is not recognized.
 */
export declare const sniffMimeFromHeader: (buf: Buffer) => string | null;
//# sourceMappingURL=mimeSniff.d.ts.map