/**
 * Unit tests for FM Object Metadata utilities
 *
 * Tests: buildFmObjectMetadataForInit, buildFmObjectMetadataForExistingFile
 */
import { describe, it, expect } from "@jest/globals";
import {
  buildFmObjectMetadataForInit,
  buildFmObjectMetadataForExistingFile,
} from "../../src/fm/utils/objectMetadata.js";

describe("buildFmObjectMetadataForInit", () => {
  it("builds metadata with all required fields", () => {
    const result = buildFmObjectMetadataForInit({
      fileUid: "file-123",
      purpose: "cms_asset",
      originalFilename: "photo.jpg",
      visibility: "public",
    });

    expect(result["fm-uid"]).toBe("file-123");
    expect(result["fm-purpose"]).toBe("cms_asset");
    expect(result["fm-original-filename"]).toBe("photo.jpg");
    expect(result["fm-visibility"]).toBe("public");
    expect(result["fm-mime-type"]).toBeUndefined();
  });

  it("includes mime type when provided", () => {
    const result = buildFmObjectMetadataForInit({
      fileUid: "file-123",
      purpose: "avatar",
      originalFilename: "avatar.png",
      visibility: "private",
      mimeType: "image/png",
    });

    expect(result["fm-mime-type"]).toBe("image%2Fpng");
  });

  it("URI-encodes values with special characters", () => {
    const result = buildFmObjectMetadataForInit({
      fileUid: "file-123",
      purpose: "resume",
      originalFilename: "My Resume (2024).pdf",
      visibility: "private",
    });

    expect(decodeURIComponent(result["fm-original-filename"])).toBe(
      "My Resume (2024).pdf"
    );
  });

  it("filters out empty values", () => {
    const result = buildFmObjectMetadataForInit({
      fileUid: "file-123",
      purpose: "generic",
      originalFilename: "test.txt",
      visibility: "public",
      mimeType: "",
    });

    expect(result["fm-mime-type"]).toBeUndefined();
  });

  it("sanitizes and lowercases keys", () => {
    const result = buildFmObjectMetadataForInit({
      fileUid: "id",
      purpose: "generic",
      originalFilename: "f.txt",
      visibility: "public",
    });

    // All keys should be lowercase and contain only [a-z0-9-]
    for (const key of Object.keys(result)) {
      expect(key).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("buildFmObjectMetadataForExistingFile", () => {
  it("builds metadata from existing file row", () => {
    const result = buildFmObjectMetadataForExistingFile({
      file: {
        uid: "existing-123",
        original_filename: "document.pdf",
        is_public: true,
        mime_type: "application/pdf",
      },
    });

    expect(result["fm-uid"]).toBe("existing-123");
    expect(decodeURIComponent(result["fm-original-filename"])).toBe("document.pdf");
    expect(result["fm-visibility"]).toBe("public");
    expect(decodeURIComponent(result["fm-mime-type"])).toBe("application/pdf");
  });

  it("sets visibility to private when is_public is false", () => {
    const result = buildFmObjectMetadataForExistingFile({
      file: {
        uid: "private-123",
        original_filename: "secret.pdf",
        is_public: false,
        mime_type: "application/pdf",
      },
    });

    expect(result["fm-visibility"]).toBe("private");
  });

  it("omits mime_type when null", () => {
    const result = buildFmObjectMetadataForExistingFile({
      file: {
        uid: "no-mime",
        original_filename: "unknown",
        is_public: true,
        mime_type: null as any,
      },
    });

    expect(result["fm-mime-type"]).toBeUndefined();
  });
});
