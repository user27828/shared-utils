/**
 * Unit tests for FM URL utilities
 *
 * Tests: resolveClientUrl, buildCanonicalMediaUrl
 */
import { describe, it, expect } from "@jest/globals";
import { resolveClientUrl, buildCanonicalMediaUrl } from "../../src/fm/utils/url.js";

describe("resolveClientUrl", () => {
  it("returns explicit clientUrl when provided", () => {
    expect(resolveClientUrl({ clientUrl: "https://example.com" })).toBe("https://example.com");
  });

  it("returns origin header when no clientUrl", () => {
    expect(
      resolveClientUrl({
        req: { headers: { origin: "https://origin.test" } },
      })
    ).toBe("https://origin.test");
  });

  it("extracts base URL from referer header", () => {
    expect(
      resolveClientUrl({
        req: { headers: { referer: "https://referer.test/path/page?q=1" } },
      })
    ).toBe("https://referer.test");
  });

  it("falls back to protocol://host from request", () => {
    expect(
      resolveClientUrl({
        req: { secure: true, headers: { host: "secure.test" } },
      })
    ).toBe("https://secure.test");

    expect(
      resolveClientUrl({
        req: { secure: false, headers: { host: "insecure.test" } },
      })
    ).toBe("http://insecure.test");
  });

  it("defaults to http://localhost with no params", () => {
    expect(resolveClientUrl()).toBe("http://localhost");
    expect(resolveClientUrl({})).toBe("http://localhost");
  });

  it("ignores empty origin header", () => {
    expect(
      resolveClientUrl({
        req: { headers: { origin: "" }, secure: false },
      })
    ).toBe("http://localhost");
  });

  it("ignores invalid referer URL", () => {
    expect(
      resolveClientUrl({
        req: { headers: { referer: "not-a-url" } },
      })
    ).toBe("http://localhost");
  });

  it("prefers clientUrl over all header-based resolution", () => {
    expect(
      resolveClientUrl({
        clientUrl: "https://explicit.com",
        req: {
          headers: { origin: "https://origin.test", host: "host.test" },
          secure: true,
        },
      })
    ).toBe("https://explicit.com");
  });
});

describe("buildCanonicalMediaUrl", () => {
  it("builds URL with default /media prefix", () => {
    const result = buildCanonicalMediaUrl({
      uid: "file-123",
      clientUrl: "https://example.com",
    });
    expect(result).toBe("https://example.com/media/file-123");
  });

  it("uses custom path prefix", () => {
    const result = buildCanonicalMediaUrl({
      uid: "file-123",
      clientUrl: "https://example.com",
      pathPrefix: "/assets",
    });
    expect(result).toBe("https://example.com/assets/file-123");
  });

  it("encodes UID in the URL", () => {
    const result = buildCanonicalMediaUrl({
      uid: "file with spaces",
      clientUrl: "https://example.com",
    });
    expect(result).toBe("https://example.com/media/file%20with%20spaces");
  });

  it("strips trailing slashes from base URL", () => {
    const result = buildCanonicalMediaUrl({
      uid: "abc",
      clientUrl: "https://example.com/",
    });
    expect(result).toBe("https://example.com/media/abc");
  });

  it("falls back to request headers for base URL", () => {
    const result = buildCanonicalMediaUrl({
      uid: "abc",
      req: { headers: { origin: "https://origin.test" } },
    });
    expect(result).toBe("https://origin.test/media/abc");
  });
});
