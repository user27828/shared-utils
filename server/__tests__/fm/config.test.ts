/**
 * Unit tests for FM Server Configuration
 *
 * Tests: parseFmServerConfig, assertValidFmServerConfig,
 *        resolveFmLocalUploadRootAbsPath, getFmUploadPathPresetsFromConfig
 */
import { describe, it, expect } from "@jest/globals";
import {
  parseFmServerConfig,
  assertValidFmServerConfig,
  resolveFmLocalUploadRootAbsPath,
  getFmUploadPathPresetsFromConfig,
} from "../../src/fm/config.js";

describe("parseFmServerConfig", () => {
  it("defaults to local provider when no env set", () => {
    const config = parseFmServerConfig({});
    expect(config.provider).toBe("local");
  });

  it("parses provider from FM_STORAGE_PROVIDER", () => {
    const config = parseFmServerConfig({ FM_STORAGE_PROVIDER: "s3" });
    expect(config.provider).toBe("s3");
  });

  it("parses data root and upload root paths", () => {
    const config = parseFmServerConfig({
      DATA_ROOT_PATH: "/data",
      FM_UPLOAD_ROOT_PATH: "/data/uploads",
    });
    expect(config.dataRootPath).toBe("/data");
    expect(config.uploadRootPath).toBe("/data/uploads");
  });

  it("parses S3 configuration", () => {
    const config = parseFmServerConfig({
      FM_STORAGE_PROVIDER: "s3",
      S3_ENDPOINT: "https://s3.example.com",
      S3_REGION: "us-east-1",
      S3_ACCESS_KEY_ID: "AK123",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_PUBLIC_BASE_URL: "https://cdn.example.com",
    });
    expect(config.s3Endpoint).toBe("https://s3.example.com");
    expect(config.s3Region).toBe("us-east-1");
    expect(config.s3AccessKeyId).toBe("AK123");
    expect(config.s3SecretAccessKey).toBe("secret");
    expect(config.s3PublicBaseUrl).toBe("https://cdn.example.com");
  });

  it("parses signedUrlTtlSeconds as positive integer", () => {
    const config = parseFmServerConfig({ FM_SIGNED_URL_TTL_SECS: "600" });
    expect(config.signedUrlTtlSeconds).toBe(600);
  });

  it("ignores non-positive signedUrlTtlSeconds", () => {
    expect(parseFmServerConfig({ FM_SIGNED_URL_TTL_SECS: "0" }).signedUrlTtlSeconds).toBeUndefined();
    expect(parseFmServerConfig({ FM_SIGNED_URL_TTL_SECS: "-1" }).signedUrlTtlSeconds).toBeUndefined();
    expect(parseFmServerConfig({ FM_SIGNED_URL_TTL_SECS: "abc" }).signedUrlTtlSeconds).toBeUndefined();
  });

  it("parses upload path presets from JSON string", () => {
    const presets = JSON.stringify([
      { relativePath: "images", name: "Images" },
      { relativePath: "docs" },
    ]);
    const config = parseFmServerConfig({ FM_UPLOAD_PATH_PRESETS: presets });
    expect(config.uploadPathPresets).toEqual([
      { relativePath: "images", name: "Images" },
      { relativePath: "docs", name: undefined },
    ]);
  });

  it("parses upload path presets from array directly", () => {
    const presets = [{ relativePath: "media", name: "Media" }];
    const config = parseFmServerConfig({ FM_UPLOAD_PATH_PRESETS: presets as any });
    expect(config.uploadPathPresets).toEqual([{ relativePath: "media", name: "Media" }]);
  });

  it("handles malformed JSON in presets gracefully", () => {
    const config = parseFmServerConfig({ FM_UPLOAD_PATH_PRESETS: "not-json" });
    expect(config.uploadPathPresets).toBeUndefined();
  });

  it("parses clientUrl from CLIENT_URL", () => {
    const config = parseFmServerConfig({ CLIENT_URL: "https://my-app.com" });
    expect(config.clientUrl).toBe("https://my-app.com");
  });

  it("returns undefined for missing optional fields", () => {
    const config = parseFmServerConfig({});
    expect(config.dataRootPath).toBeUndefined();
    expect(config.uploadRootPath).toBeUndefined();
    expect(config.s3Endpoint).toBeUndefined();
    expect(config.clientUrl).toBeUndefined();
  });
});

describe("assertValidFmServerConfig", () => {
  it("passes for local provider with dataRootPath", () => {
    expect(() =>
      assertValidFmServerConfig({
        provider: "local",
        dataRootPath: "/data",
      })
    ).not.toThrow();
  });

  it("passes for local provider with uploadRootPath (absolute)", () => {
    expect(() =>
      assertValidFmServerConfig({
        provider: "local",
        uploadRootPath: "/custom/uploads",
      })
    ).not.toThrow();
  });

  it("throws for local provider with no paths", () => {
    expect(() =>
      assertValidFmServerConfig({ provider: "local" })
    ).toThrow("DATA_ROOT_PATH or FM_UPLOAD_ROOT_PATH");
  });

  it("throws for local provider with relative uploadRootPath but no dataRootPath", () => {
    expect(() =>
      assertValidFmServerConfig({
        provider: "local",
        uploadRootPath: "relative/path",
      })
    ).toThrow("FM_UPLOAD_ROOT_PATH is relative but DATA_ROOT_PATH is not set");
  });

  it("passes for s3 provider with required fields", () => {
    expect(() =>
      assertValidFmServerConfig({
        provider: "s3",
        s3Endpoint: "https://s3.test",
        s3AccessKeyId: "key",
        s3SecretAccessKey: "secret",
      })
    ).not.toThrow();
  });

  it("throws for s3 provider missing endpoint", () => {
    expect(() =>
      assertValidFmServerConfig({
        provider: "s3",
        s3AccessKeyId: "key",
        s3SecretAccessKey: "secret",
      })
    ).toThrow("S3_ENDPOINT");
  });

  it("throws for s3 provider missing access key", () => {
    expect(() =>
      assertValidFmServerConfig({
        provider: "s3",
        s3Endpoint: "https://s3.test",
        s3SecretAccessKey: "secret",
      })
    ).toThrow("S3_ACCESS_KEY_ID");
  });

  it("throws for s3 provider missing secret key", () => {
    expect(() =>
      assertValidFmServerConfig({
        provider: "s3",
        s3Endpoint: "https://s3.test",
        s3AccessKeyId: "key",
      })
    ).toThrow("S3_SECRET_ACCESS_KEY");
  });
});

describe("resolveFmLocalUploadRootAbsPath", () => {
  it("defaults to {dataRoot}/uploads when no uploadRootPath", () => {
    const result = resolveFmLocalUploadRootAbsPath({
      provider: "local",
      dataRootPath: "/app/data",
    });
    expect(result).toBe("/app/data/uploads");
  });

  it("uses absolute uploadRootPath as-is", () => {
    const result = resolveFmLocalUploadRootAbsPath({
      provider: "local",
      uploadRootPath: "/custom/uploads",
    });
    expect(result).toBe("/custom/uploads");
  });

  it("resolves relative uploadRootPath against dataRootPath", () => {
    const result = resolveFmLocalUploadRootAbsPath({
      provider: "local",
      dataRootPath: "/app/data",
      uploadRootPath: "custom",
    });
    expect(result).toBe("/app/data/custom");
  });

  it("throws for non-local provider", () => {
    expect(() =>
      resolveFmLocalUploadRootAbsPath({
        provider: "s3",
        s3Endpoint: "https://s3.test",
        s3AccessKeyId: "key",
        s3SecretAccessKey: "secret",
      })
    ).toThrow("non-local provider");
  });

  it("throws for relative uploadRootPath without dataRootPath", () => {
    expect(() =>
      resolveFmLocalUploadRootAbsPath({
        provider: "local",
        uploadRootPath: "relative/path",
      })
    ).toThrow();
  });
});

describe("getFmUploadPathPresetsFromConfig", () => {
  it("returns empty array when no presets configured", () => {
    const result = getFmUploadPathPresetsFromConfig({ provider: "local" });
    expect(result).toEqual([]);
  });

  it("returns sanitized presets", () => {
    const result = getFmUploadPathPresetsFromConfig({
      provider: "local",
      uploadPathPresets: [
        { relativePath: "images", name: "Images" },
        { relativePath: "docs" },
      ],
    });
    expect(result).toEqual([
      { relativePath: "images", name: "Images" },
      { relativePath: "docs", name: "docs" },
    ]);
  });

  it("filters out presets with slashes", () => {
    const result = getFmUploadPathPresetsFromConfig({
      provider: "local",
      uploadPathPresets: [
        { relativePath: "valid" },
        { relativePath: "invalid/path" },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe("valid");
  });

  it("filters out presets with path traversal", () => {
    const result = getFmUploadPathPresetsFromConfig({
      provider: "local",
      uploadPathPresets: [
        { relativePath: ".." },
        { relativePath: "valid" },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe("valid");
  });

  it("filters out presets with backslashes", () => {
    const result = getFmUploadPathPresetsFromConfig({
      provider: "local",
      uploadPathPresets: [
        { relativePath: "back\\slash" },
        { relativePath: "ok" },
      ],
    });
    expect(result).toHaveLength(1);
  });

  it("filters out presets with empty relativePath", () => {
    const result = getFmUploadPathPresetsFromConfig({
      provider: "local",
      uploadPathPresets: [
        { relativePath: "" },
        { relativePath: "   " },
        { relativePath: "valid" },
      ],
    });
    expect(result).toHaveLength(1);
  });
});
