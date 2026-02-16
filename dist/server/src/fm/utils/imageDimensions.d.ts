/**
 * FM Image Dimension Extraction — shared-utils
 *
 * Pure-function image dimension extraction from file header bytes.
 * Supports PNG, JPEG, GIF, and WEBP formats.
 *
 * No filesystem or network I/O — operates on a Buffer that has already been
 * read from storage. Callers should provide at least 64 KiB of header bytes
 * for reliable JPEG SOF marker detection.
 *
 * Extracted from: db-supabase/server/fm/service/fmService.ts
 */
/**
 * Extract image dimensions from a file header buffer.
 *
 * Dispatches to the correct format-specific extractor based on the MIME type.
 * Returns null for unsupported formats or if the dimensions cannot be read.
 *
 * @param input.headerBytes - At least the first ~64 KiB of the file.
 * @param input.mimeType - The detected MIME type (from sniffMimeFromHeader or metadata).
 */
export declare const extractImageDimensionsFromHeader: (input: {
    headerBytes: Buffer;
    mimeType: string;
}) => {
    width: number;
    height: number;
} | null;
//# sourceMappingURL=imageDimensions.d.ts.map