/**
 * Unit tests for FM Object Key utilities
 *
 * Tests: sanitizeFmFolderPath, buildFmObjectKey
 */
import { describe, it, expect } from "@jest/globals";
import { sanitizeFmFolderPath, buildFmObjectKey } from "../../src/fm/utils/objectKey.js";

describe("sanitizeFmFolderPath", () => {
  it("returns empty string for falsy input", () => {
    expect(sanitizeFmFolderPath(undefined)).toBe("");
    expect(sanitizeFmFolderPath("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitizeFmFolderPath("   ")).toBe("");
  });

  it("sanitizes a simple folder name", () => {
    expect(sanitizeFmFolderPath("uploads")).toBe("uploads");
  });

  it("preserves nested paths", () => {
    expect(sanitizeFmFolderPath("folder/subfolder")).toBe("folder/subfolder");
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(sanitizeFmFolderPath("folder\\subfolder")).toBe("folder/subfolder");
  });

  it("strips path traversal sequences (..)", () => {
    expect(sanitizeFmFolderPath("../../../etc")).toBe("etc");
    expect(sanitizeFmFolderPath("folder/../other")).toBe("folder/other");
  });

  it("strips dot segments (.)", () => {
    expect(sanitizeFmFolderPath("./folder/./sub")).toBe("folder/sub");
  });

  it("replaces non-alphanumeric characters with hyphens", () => {
    expect(sanitizeFmFolderPath("Hello World!")).toBe("Hello-World");
  });

  it("collapses consecutive hyphens", () => {
    expect(sanitizeFmFolderPath("a---b")).toBe("a-b");
  });

  it("strips leading/trailing hyphens and underscores from segments", () => {
    expect(sanitizeFmFolderPath("-test-")).toBe("test");
    expect(sanitizeFmFolderPath("_test_")).toBe("test");
  });

  it("limits depth to 20 segments", () => {
    const deepPath = Array(25).fill("a").join("/");
    const result = sanitizeFmFolderPath(deepPath);
    expect(result.split("/").length).toBe(20);
  });

  it("filters empty segments from double slashes", () => {
    expect(sanitizeFmFolderPath("a//b///c")).toBe("a/b/c");
  });

  it("handles mixed traversal and special characters", () => {
    const result = sanitizeFmFolderPath("../folder with spaces/sub!dir/../file");
    // '..' removed, spaces become hyphens, '!' becomes hyphen
    expect(result).toBe("folder-with-spaces/sub-dir/file");
  });
});

describe("buildFmObjectKey", () => {
  it("builds key from uid only", () => {
    expect(buildFmObjectKey({ uid: "abc-123" })).toBe("abc-123");
  });

  it("builds key from uid + extension", () => {
    expect(buildFmObjectKey({ uid: "abc-123", ext: "png" })).toBe("abc-123.png");
  });

  it("normalizes extension to lowercase", () => {
    expect(buildFmObjectKey({ uid: "abc", ext: "PNG" })).toBe("abc.png");
  });

  it("trims whitespace from extension", () => {
    expect(buildFmObjectKey({ uid: "abc", ext: " pdf " })).toBe("abc.pdf");
  });

  it("builds key with folder path", () => {
    expect(
      buildFmObjectKey({ uid: "abc", ext: "jpg", folderPath: "uploads/images" })
    ).toBe("uploads/images/abc.jpg");
  });

  it("sanitizes folder path in the key", () => {
    expect(
      buildFmObjectKey({ uid: "abc", ext: "jpg", folderPath: "../hack" })
    ).toBe("hack/abc.jpg");
  });

  it("handles empty extension gracefully", () => {
    expect(buildFmObjectKey({ uid: "abc", ext: "" })).toBe("abc");
    expect(buildFmObjectKey({ uid: "abc", ext: "   " })).toBe("abc");
  });

  it("handles empty folder path", () => {
    expect(buildFmObjectKey({ uid: "abc", ext: "txt", folderPath: "" })).toBe("abc.txt");
  });
});
