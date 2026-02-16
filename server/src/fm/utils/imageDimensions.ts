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

// ── Buffer reading helpers ───────────────────────────────────────────────

const readUInt32BE = (
  buf: Buffer,
  offset: number,
): number | null => {
  if (offset < 0 || offset + 4 > buf.length) {
    return null;
  }
  return buf.readUInt32BE(offset);
};

const readUInt16LE = (
  buf: Buffer,
  offset: number,
): number | null => {
  if (offset < 0 || offset + 2 > buf.length) {
    return null;
  }
  return buf.readUInt16LE(offset);
};

// ── Format-specific extractors ───────────────────────────────────────────

const extractPngDimensions = (
  buf: Buffer,
): { width: number; height: number } | null => {
  // PNG IHDR chunk stores width/height at offset 16.
  const w = readUInt32BE(buf, 16);
  const h = readUInt32BE(buf, 20);
  if (!w || !h) {
    return null;
  }
  return { width: w, height: h };
};

const extractGifDimensions = (
  buf: Buffer,
): { width: number; height: number } | null => {
  const w = readUInt16LE(buf, 6);
  const h = readUInt16LE(buf, 8);
  if (!w || !h) {
    return null;
  }
  return { width: w, height: h };
};

const extractWebpDimensions = (
  buf: Buffer,
): { width: number; height: number } | null => {
  // WEBP is RIFF container: 'RIFF'....'WEBP' then chunks.
  if (buf.length < 30) {
    return null;
  }
  if (
    buf.slice(0, 4).toString("ascii") !== "RIFF" ||
    buf.slice(8, 12).toString("ascii") !== "WEBP"
  ) {
    return null;
  }

  // Chunks start at offset 12: 4cc + uint32le size + payload
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const fourcc = buf.slice(offset, offset + 4).toString("ascii");
    const size = buf.readUInt32LE(offset + 4);
    const payloadOffset = offset + 8;

    if (fourcc === "VP8X") {
      // VP8X: width-1 (24-bit) at bytes 4..6, height-1 at 7..9 of payload
      if (payloadOffset + 10 <= buf.length) {
        const wMinus1 =
          buf[payloadOffset + 4] |
          (buf[payloadOffset + 5] << 8) |
          (buf[payloadOffset + 6] << 16);
        const hMinus1 =
          buf[payloadOffset + 7] |
          (buf[payloadOffset + 8] << 8) |
          (buf[payloadOffset + 9] << 16);
        return { width: wMinus1 + 1, height: hMinus1 + 1 };
      }
      return null;
    }

    if (fourcc === "VP8L") {
      // VP8L: lossless, signature 0x2f then 14 bits width-1, 14 bits height-1
      if (payloadOffset + 5 <= buf.length && buf[payloadOffset] === 0x2f) {
        const b1 = buf[payloadOffset + 1];
        const b2 = buf[payloadOffset + 2];
        const b3 = buf[payloadOffset + 3];
        const b4 = buf[payloadOffset + 4];
        const wMinus1 = b1 | ((b2 & 0x3f) << 8);
        const hMinus1 =
          ((b2 & 0xc0) >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10);
        return { width: wMinus1 + 1, height: hMinus1 + 1 };
      }
      return null;
    }

    // advance (padded to even size)
    const advance = 8 + size + (size % 2);
    offset += advance;
  }

  return null;
};

const extractJpegDimensions = (
  buf: Buffer,
): { width: number; height: number } | null => {
  // Walk JPEG markers to find SOF0/SOF2.
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 4 < buf.length) {
    // Seek next marker (0xFF)
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    // Skip fill bytes
    while (offset < buf.length && buf[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buf.length) {
      break;
    }
    const marker = buf[offset];
    offset += 1;

    // Standalone markers
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 2 > buf.length) {
      break;
    }
    const segmentLen = buf.readUInt16BE(offset);
    if (segmentLen < 2) {
      return null;
    }
    const segmentStart = offset + 2;

    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    const isSOF =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSOF) {
      if (segmentStart + 7 <= buf.length) {
        const height = buf.readUInt16BE(segmentStart + 1);
        const width = buf.readUInt16BE(segmentStart + 3);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
      return null;
    }

    offset = segmentStart + (segmentLen - 2);
  }

  return null;
};

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Extract image dimensions from a file header buffer.
 *
 * Dispatches to the correct format-specific extractor based on the MIME type.
 * Returns null for unsupported formats or if the dimensions cannot be read.
 *
 * @param input.headerBytes - At least the first ~64 KiB of the file.
 * @param input.mimeType - The detected MIME type (from sniffMimeFromHeader or metadata).
 */
export const extractImageDimensionsFromHeader = (input: {
  headerBytes: Buffer;
  mimeType: string;
}): { width: number; height: number } | null => {
  const mime = (input.mimeType || "").toLowerCase();
  if (mime === "image/png") {
    return extractPngDimensions(input.headerBytes);
  }
  if (mime === "image/gif") {
    return extractGifDimensions(input.headerBytes);
  }
  if (mime === "image/webp") {
    return extractWebpDimensions(input.headerBytes);
  }
  if (mime === "image/jpeg") {
    return extractJpegDimensions(input.headerBytes);
  }
  return null;
};
