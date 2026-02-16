/**
 * Unit tests for FM Image Dimension Extraction
 *
 * Tests: extractImageDimensionsFromHeader
 */
import { describe, it, expect } from "@jest/globals";
import { extractImageDimensionsFromHeader } from "../../src/fm/utils/imageDimensions.js";

describe("extractImageDimensionsFromHeader", () => {
  describe("PNG", () => {
    it("extracts dimensions from valid PNG header", () => {
      // PNG: signature (8 bytes) + IHDR chunk length (4) + "IHDR" (4) + width (4) + height (4)
      const buf = Buffer.alloc(32);
      // PNG signature
      buf[0] = 0x89;
      buf[1] = 0x50; // P
      buf[2] = 0x4e; // N
      buf[3] = 0x47; // G
      buf[4] = 0x0d;
      buf[5] = 0x0a;
      buf[6] = 0x1a;
      buf[7] = 0x0a;
      // IHDR chunk length
      buf.writeUInt32BE(13, 8);
      // IHDR tag
      buf.write("IHDR", 12, "ascii");
      // Width (800) at offset 16
      buf.writeUInt32BE(800, 16);
      // Height (600) at offset 20
      buf.writeUInt32BE(600, 20);

      const result = extractImageDimensionsFromHeader({
        headerBytes: buf,
        mimeType: "image/png",
      });
      expect(result).toEqual({ width: 800, height: 600 });
    });

    it("returns null if buffer too short for dimensions", () => {
      // Buffer has width at offset 16 but is too short for height at offset 20
      const buf = Buffer.alloc(20); // Has width but not height
      buf[0] = 0x89;
      buf[1] = 0x50;
      buf.writeUInt32BE(100, 16); // width at offset 16

      const result = extractImageDimensionsFromHeader({
        headerBytes: buf,
        mimeType: "image/png",
      });
      // readUInt32BE(20) returns null since offset+4 > buf.length
      expect(result).toBeNull();
    });
  });

  describe("GIF", () => {
    it("extracts dimensions from valid GIF header", () => {
      const buf = Buffer.alloc(16);
      buf.write("GIF89a", 0, "ascii");
      // Width (320) at offset 6 (LE)
      buf.writeUInt16LE(320, 6);
      // Height (240) at offset 8 (LE)
      buf.writeUInt16LE(240, 8);

      const result = extractImageDimensionsFromHeader({
        headerBytes: buf,
        mimeType: "image/gif",
      });
      expect(result).toEqual({ width: 320, height: 240 });
    });

    it("returns null if buffer too short", () => {
      const buf = Buffer.alloc(7); // Too short
      buf.write("GIF89a", 0, "ascii");

      const result = extractImageDimensionsFromHeader({
        headerBytes: buf,
        mimeType: "image/gif",
      });
      expect(result).toBeNull();
    });
  });

  describe("JPEG", () => {
    it("extracts dimensions from JPEG with SOF0 marker", () => {
      // Build minimal JPEG with SOF0 (0xFFC0)
      const buf = Buffer.alloc(64);
      let offset = 0;

      // SOI marker
      buf[offset++] = 0xff;
      buf[offset++] = 0xd8;

      // APP0 marker (skip it)
      buf[offset++] = 0xff;
      buf[offset++] = 0xe0;
      buf.writeUInt16BE(16, offset); // segment length
      offset += 16;

      // SOF0 marker
      buf[offset++] = 0xff;
      buf[offset++] = 0xc0;
      buf.writeUInt16BE(17, offset); // segment length
      offset += 2;
      buf[offset++] = 8; // precision
      buf.writeUInt16BE(480, offset); // height
      offset += 2;
      buf.writeUInt16BE(640, offset); // width
      offset += 2;

      const result = extractImageDimensionsFromHeader({
        headerBytes: buf,
        mimeType: "image/jpeg",
      });
      expect(result).toEqual({ width: 640, height: 480 });
    });

    it("returns null for non-JPEG buffer", () => {
      const buf = Buffer.alloc(64);
      const result = extractImageDimensionsFromHeader({
        headerBytes: buf,
        mimeType: "image/jpeg",
      });
      expect(result).toBeNull();
    });
  });

  describe("WEBP", () => {
    it("extracts dimensions from VP8X WEBP", () => {
      const buf = Buffer.alloc(40);
      // RIFF container
      buf.write("RIFF", 0, "ascii");
      buf.writeUInt32LE(32, 4); // file size
      buf.write("WEBP", 8, "ascii");

      // VP8X chunk at offset 12
      buf.write("VP8X", 12, "ascii");
      buf.writeUInt32LE(10, 16); // chunk size

      // VP8X payload starts at offset 20
      // Width-1 at payload bytes 4-6 (offset 24-26), LE 24-bit
      const widthMinus1 = 1023; // width = 1024
      buf[24] = widthMinus1 & 0xff;
      buf[25] = (widthMinus1 >> 8) & 0xff;
      buf[26] = (widthMinus1 >> 16) & 0xff;

      // Height-1 at payload bytes 7-9 (offset 27-29), LE 24-bit
      const heightMinus1 = 767; // height = 768
      buf[27] = heightMinus1 & 0xff;
      buf[28] = (heightMinus1 >> 8) & 0xff;
      buf[29] = (heightMinus1 >> 16) & 0xff;

      const result = extractImageDimensionsFromHeader({
        headerBytes: buf,
        mimeType: "image/webp",
      });
      expect(result).toEqual({ width: 1024, height: 768 });
    });

    it("returns null for too-short buffer", () => {
      const buf = Buffer.alloc(20);
      buf.write("RIFF", 0, "ascii");
      buf.writeUInt32LE(12, 4);
      buf.write("WEBP", 8, "ascii");

      const result = extractImageDimensionsFromHeader({
        headerBytes: buf,
        mimeType: "image/webp",
      });
      expect(result).toBeNull();
    });
  });

  describe("unsupported types", () => {
    it("returns null for unsupported MIME type", () => {
      const buf = Buffer.alloc(64);
      expect(
        extractImageDimensionsFromHeader({
          headerBytes: buf,
          mimeType: "video/mp4",
        })
      ).toBeNull();
    });

    it("returns null for empty MIME type", () => {
      const buf = Buffer.alloc(64);
      expect(
        extractImageDimensionsFromHeader({
          headerBytes: buf,
          mimeType: "",
        })
      ).toBeNull();
    });

    it("handles case-insensitive MIME types", () => {
      const buf = Buffer.alloc(16);
      buf.write("GIF89a", 0, "ascii");
      buf.writeUInt16LE(100, 6);
      buf.writeUInt16LE(200, 8);

      const result = extractImageDimensionsFromHeader({
        headerBytes: buf,
        mimeType: "IMAGE/GIF",
      });
      expect(result).toEqual({ width: 100, height: 200 });
    });
  });
});
