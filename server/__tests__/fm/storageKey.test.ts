/**
 * Unit tests for FM Storage Key utilities
 *
 * Tests: encodeFmStorageKey, decodeFmStorageKey, tryDecodeFmStorageKey
 */
import { describe, it, expect } from "@jest/globals";
import {
  encodeFmStorageKey,
  decodeFmStorageKey,
  tryDecodeFmStorageKey,
} from "../../src/fm/utils/storageKey.js";

describe("encodeFmStorageKey", () => {
  it("encodes a valid bucket + objectKey", () => {
    expect(encodeFmStorageKey({ bucket: "cms", objectKey: "folder/file.png" })).toBe(
      "cms/folder/file.png"
    );
  });

  it("encodes simple objectKey without folder", () => {
    expect(encodeFmStorageKey({ bucket: "uploads", objectKey: "abc.jpg" })).toBe(
      "uploads/abc.jpg"
    );
  });

  it("throws on empty bucket", () => {
    expect(() => encodeFmStorageKey({ bucket: "", objectKey: "file.png" })).toThrow(
      "Invalid bucket"
    );
  });

  it("throws on bucket with slash", () => {
    expect(() =>
      encodeFmStorageKey({ bucket: "my/bucket", objectKey: "file.png" })
    ).toThrow("must not contain slashes");
  });

  it("throws on bucket with backslash", () => {
    expect(() =>
      encodeFmStorageKey({ bucket: "my\\bucket", objectKey: "file.png" })
    ).toThrow("must not contain slashes");
  });

  it("throws on bucket with path traversal", () => {
    expect(() =>
      encodeFmStorageKey({ bucket: "a..b", objectKey: "file.png" })
    ).toThrow("Invalid bucket");
  });

  it("throws on empty objectKey", () => {
    expect(() => encodeFmStorageKey({ bucket: "cms", objectKey: "" })).toThrow(
      "Invalid objectKey"
    );
  });

  it("throws on absolute objectKey", () => {
    expect(() =>
      encodeFmStorageKey({ bucket: "cms", objectKey: "/etc/passwd" })
    ).toThrow("must be relative");
  });
});

describe("decodeFmStorageKey", () => {
  it("decodes a valid storage key", () => {
    const result = decodeFmStorageKey("cms/folder/file.png");
    expect(result).toEqual({ bucket: "cms", objectKey: "folder/file.png" });
  });

  it("decodes a simple key (no subfolder)", () => {
    const result = decodeFmStorageKey("uploads/file.jpg");
    expect(result).toEqual({ bucket: "uploads", objectKey: "file.jpg" });
  });

  it("decodes key with deeply nested objectKey", () => {
    const result = decodeFmStorageKey("cms/a/b/c/d.png");
    expect(result).toEqual({ bucket: "cms", objectKey: "a/b/c/d.png" });
  });

  it("throws on empty string", () => {
    expect(() => decodeFmStorageKey("")).toThrow("Invalid storageKey");
  });

  it("throws on null-ish input", () => {
    expect(() => decodeFmStorageKey(null as any)).toThrow("Invalid storageKey");
    expect(() => decodeFmStorageKey(undefined as any)).toThrow("Invalid storageKey");
  });

  it("throws on key without slash", () => {
    expect(() => decodeFmStorageKey("nobucket")).toThrow("Invalid storageKey format");
  });

  it("throws on key with only trailing slash", () => {
    expect(() => decodeFmStorageKey("bucket/")).toThrow("Invalid storageKey format");
  });

  it("throws on key starting with slash", () => {
    expect(() => decodeFmStorageKey("/objectKey")).toThrow("Invalid storageKey format");
  });
});

describe("tryDecodeFmStorageKey", () => {
  it("returns decoded ref for valid key", () => {
    const result = tryDecodeFmStorageKey("cms/file.png");
    expect(result).toEqual({ bucket: "cms", objectKey: "file.png" });
  });

  it("returns null for invalid key", () => {
    expect(tryDecodeFmStorageKey("")).toBeNull();
    expect(tryDecodeFmStorageKey("noslash")).toBeNull();
    expect(tryDecodeFmStorageKey("bucket/")).toBeNull();
  });

  it("returns null for null-ish input", () => {
    expect(tryDecodeFmStorageKey(null as any)).toBeNull();
    expect(tryDecodeFmStorageKey(undefined as any)).toBeNull();
  });
});
