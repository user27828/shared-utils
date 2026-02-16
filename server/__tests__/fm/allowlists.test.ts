/**
 * Unit tests for FM upload policy / allowlists
 *
 * Tests: validateFmUploadInputs, FM_PURPOSE_POLICIES
 */
import { describe, it, expect } from "@jest/globals";
import {
  validateFmUploadInputs,
  FM_PURPOSE_POLICIES,
} from "../../src/fm/policy/allowlists.js";

describe("FM_PURPOSE_POLICIES", () => {
  it("has policies for all expected purposes", () => {
    expect(FM_PURPOSE_POLICIES).toHaveProperty("resume");
    expect(FM_PURPOSE_POLICIES).toHaveProperty("job");
    expect(FM_PURPOSE_POLICIES).toHaveProperty("cms_asset");
    expect(FM_PURPOSE_POLICIES).toHaveProperty("avatar");
    expect(FM_PURPOSE_POLICIES).toHaveProperty("generic");
  });

  it("avatar has smaller max size than default", () => {
    expect(FM_PURPOSE_POLICIES.avatar.maxBytes).toBeLessThan(
      FM_PURPOSE_POLICIES.cms_asset.maxBytes
    );
  });

  it("all policies have non-empty extension and MIME lists", () => {
    for (const [purpose, policy] of Object.entries(FM_PURPOSE_POLICIES)) {
      expect(policy.allowedExtensions.length).toBeGreaterThan(0);
      expect(policy.allowedMimeTypes.length).toBeGreaterThan(0);
      expect(policy.maxBytes).toBeGreaterThan(0);
    }
  });
});

describe("validateFmUploadInputs", () => {
  it("accepts valid resume upload", () => {
    const result = validateFmUploadInputs({
      purpose: "resume",
      originalFilename: "my-resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024 * 1024, // 1 MB
    });
    expect(result.ext).toBe("pdf");
    expect(result.normalizedMimeType).toBe("application/pdf");
    expect(result.effectivePurpose).toBe("resume");
  });

  it("accepts DOCX resume upload", () => {
    const result = validateFmUploadInputs({
      purpose: "resume",
      originalFilename: "resume.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 500_000,
    });
    expect(result.ext).toBe("docx");
  });

  it("accepts CMS image upload", () => {
    const result = validateFmUploadInputs({
      purpose: "cms_asset",
      originalFilename: "photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2 * 1024 * 1024,
    });
    expect(result.ext).toBe("jpg");
    expect(result.normalizedMimeType).toBe("image/jpeg");
  });

  it("accepts avatar upload", () => {
    const result = validateFmUploadInputs({
      purpose: "avatar",
      originalFilename: "me.webp",
      mimeType: "image/webp",
      sizeBytes: 500_000,
    });
    expect(result.ext).toBe("webp");
  });

  it("throws for unsupported purpose", () => {
    expect(() =>
      validateFmUploadInputs({
        purpose: "unknown_purpose" as any,
        originalFilename: "file.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      })
    ).toThrow("Unsupported purpose");
  });

  it("throws for file too large", () => {
    expect(() =>
      validateFmUploadInputs({
        purpose: "avatar",
        originalFilename: "big.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 20 * 1024 * 1024, // 20 MB (avatar max is 10 MB)
      })
    ).toThrow("File too large");
  });

  it("throws for disallowed extension", () => {
    expect(() =>
      validateFmUploadInputs({
        purpose: "resume",
        originalFilename: "malware.exe",
        mimeType: "application/octet-stream",
        sizeBytes: 1024,
      })
    ).toThrow("File extension not allowed");
  });

  it("throws for disallowed MIME type", () => {
    expect(() =>
      validateFmUploadInputs({
        purpose: "avatar",
        originalFilename: "test.jpg",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      })
    ).toThrow("MIME type not allowed");
  });

  it("throws for missing extension", () => {
    expect(() =>
      validateFmUploadInputs({
        purpose: "resume",
        originalFilename: "noextension",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      })
    ).toThrow("File extension not allowed");
  });

  it("throws for invalid sizeBytes", () => {
    expect(() =>
      validateFmUploadInputs({
        purpose: "resume",
        originalFilename: "test.pdf",
        mimeType: "application/pdf",
        sizeBytes: -1,
      })
    ).toThrow("Invalid sizeBytes");

    expect(() =>
      validateFmUploadInputs({
        purpose: "resume",
        originalFilename: "test.pdf",
        mimeType: "application/pdf",
        sizeBytes: NaN,
      })
    ).toThrow("Invalid sizeBytes");
  });

  it("allows MIME type matching by prefix", () => {
    // "text/" prefix is allowed for resume purpose
    const result = validateFmUploadInputs({
      purpose: "resume",
      originalFilename: "notes.txt",
      mimeType: "text/markdown",
      sizeBytes: 1024,
    });
    expect(result.normalizedMimeType).toBe("text/markdown");
  });

  it("normalizes MIME type to lowercase", () => {
    const result = validateFmUploadInputs({
      purpose: "resume",
      originalFilename: "doc.pdf",
      mimeType: "APPLICATION/PDF",
      sizeBytes: 1024,
    });
    expect(result.normalizedMimeType).toBe("application/pdf");
  });

  it("extracts extension from path with directory separators", () => {
    const result = validateFmUploadInputs({
      purpose: "resume",
      originalFilename: "path/to/file.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    expect(result.ext).toBe("pdf");
  });

  it("accepts custom policies override", () => {
    const customPolicies = {
      custom: {
        allowedExtensions: ["xyz"],
        allowedMimeTypes: ["application/xyz"],
        allowedMimePrefixes: [],
        maxBytes: 100,
      },
    };

    const result = validateFmUploadInputs(
      {
        purpose: "custom" as any,
        originalFilename: "file.xyz",
        mimeType: "application/xyz",
        sizeBytes: 50,
      },
      customPolicies
    );
    expect(result.ext).toBe("xyz");
  });
});
