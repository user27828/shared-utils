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
export const sniffMimeFromHeader = (buf: Buffer): string | null => {
  // PDF
  if (buf.slice(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  // PNG
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // JPEG
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return "image/jpeg";
  }
  // GIF
  if (
    buf.slice(0, 6).toString("ascii") === "GIF87a" ||
    buf.slice(0, 6).toString("ascii") === "GIF89a"
  ) {
    return "image/gif";
  }
  // WEBP (RIFF....WEBP)
  if (
    buf.length >= 12 &&
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  // WEBM (EBML header)
  if (
    buf.length >= 4 &&
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3
  ) {
    return "video/webm";
  }
  // MP4 (ftyp box typically at offset 4)
  if (buf.length >= 12 && buf.slice(4, 8).toString("ascii") === "ftyp") {
    // Distinguish AVIF (ftyp box with "avif" or "avis" brand) from generic MP4
    const brand = buf.slice(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") {
      return "image/avif";
    }
    return "video/mp4";
  }
  // SVG: detect by XML declaration or <svg root element in the first bytes
  // SVG files are text-based; check for common opening patterns.
  if (buf.length >= 4) {
    const head = buf
      .slice(0, Math.min(buf.length, 1024))
      .toString("utf8");
    if (
      head.trimStart().startsWith("<?xml") ||
      head.trimStart().startsWith("<svg") ||
      head.trimStart().startsWith("<!DOCTYPE svg")
    ) {
      return "image/svg+xml";
    }
  }
  return null;
};
