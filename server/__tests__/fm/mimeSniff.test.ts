/**
 * Unit tests for FM MIME Sniffing
 *
 * Tests: sniffMimeFromHeader
 */
import { describe, it, expect } from "@jest/globals";
import { sniffMimeFromHeader } from "../../src/fm/utils/mimeSniff.js";

describe("sniffMimeFromHeader", () => {
  it("detects PDF", () => {
    const buf = Buffer.from("%PDF-1.4 test content", "ascii");
    expect(sniffMimeFromHeader(buf)).toBe("application/pdf");
  });

  it("detects PNG", () => {
    const buf = Buffer.alloc(64);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    buf[0] = 0x89;
    buf[1] = 0x50;
    buf[2] = 0x4e;
    buf[3] = 0x47;
    buf[4] = 0x0d;
    buf[5] = 0x0a;
    buf[6] = 0x1a;
    buf[7] = 0x0a;
    expect(sniffMimeFromHeader(buf)).toBe("image/png");
  });

  it("detects JPEG", () => {
    const buf = Buffer.alloc(64);
    // JPEG SOI: FF D8 FF
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    expect(sniffMimeFromHeader(buf)).toBe("image/jpeg");
  });

  it("detects GIF87a", () => {
    const buf = Buffer.from("GIF87a" + "\x00".repeat(10), "ascii");
    expect(sniffMimeFromHeader(buf)).toBe("image/gif");
  });

  it("detects GIF89a", () => {
    const buf = Buffer.from("GIF89a" + "\x00".repeat(10), "ascii");
    expect(sniffMimeFromHeader(buf)).toBe("image/gif");
  });

  it("detects WEBP", () => {
    const buf = Buffer.alloc(16);
    // RIFF....WEBP
    buf.write("RIFF", 0, "ascii");
    buf.writeUInt32LE(100, 4); // file size
    buf.write("WEBP", 8, "ascii");
    expect(sniffMimeFromHeader(buf)).toBe("image/webp");
  });

  it("detects WEBM (EBML header)", () => {
    const buf = Buffer.alloc(16);
    buf[0] = 0x1a;
    buf[1] = 0x45;
    buf[2] = 0xdf;
    buf[3] = 0xa3;
    expect(sniffMimeFromHeader(buf)).toBe("video/webm");
  });

  it("detects MP4 (ftyp box)", () => {
    const buf = Buffer.alloc(16);
    buf.writeUInt32BE(32, 0); // box size
    buf.write("ftyp", 4, "ascii");
    buf.write("isom", 8, "ascii"); // brand (not avif)
    expect(sniffMimeFromHeader(buf)).toBe("video/mp4");
  });

  it("detects AVIF (ftyp + avif brand)", () => {
    const buf = Buffer.alloc(16);
    buf.writeUInt32BE(32, 0); // box size
    buf.write("ftyp", 4, "ascii");
    buf.write("avif", 8, "ascii"); // AVIF brand
    expect(sniffMimeFromHeader(buf)).toBe("image/avif");
  });

  it("detects AVIF with avis brand", () => {
    const buf = Buffer.alloc(16);
    buf.writeUInt32BE(32, 0);
    buf.write("ftyp", 4, "ascii");
    buf.write("avis", 8, "ascii"); // AVIF sequence brand
    expect(sniffMimeFromHeader(buf)).toBe("image/avif");
  });

  it("detects SVG with <?xml declaration", () => {
    const svgContent = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const buf = Buffer.from(svgContent, "utf8");
    expect(sniffMimeFromHeader(buf)).toBe("image/svg+xml");
  });

  it("detects SVG with <svg root element", () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';
    const buf = Buffer.from(svgContent, "utf8");
    expect(sniffMimeFromHeader(buf)).toBe("image/svg+xml");
  });

  it("detects SVG with leading whitespace", () => {
    const svgContent = '   \n  <svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const buf = Buffer.from(svgContent, "utf8");
    expect(sniffMimeFromHeader(buf)).toBe("image/svg+xml");
  });

  it("detects SVG with DOCTYPE", () => {
    const svgContent = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"><svg></svg>';
    const buf = Buffer.from(svgContent, "utf8");
    expect(sniffMimeFromHeader(buf)).toBe("image/svg+xml");
  });

  it("returns null for unknown format", () => {
    const buf = Buffer.from("Hello, World! This is a text file.", "utf8");
    expect(sniffMimeFromHeader(buf)).toBeNull();
  });

  it("returns null for empty buffer", () => {
    const buf = Buffer.alloc(0);
    expect(sniffMimeFromHeader(buf)).toBeNull();
  });

  it("returns null for very short buffer (< 4 bytes)", () => {
    const buf = Buffer.from([0x00, 0x01]);
    expect(sniffMimeFromHeader(buf)).toBeNull();
  });
});
