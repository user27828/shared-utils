/**
 * Unit tests for Turnstile utility functions
 * @jest-environment node
 */

import { jest } from "@jest/globals";

describe("Turnstile Utils", () => {
  let utils;

  beforeAll(async () => {
    utils = await import("../src/turnstile/utils.js");
  });

  describe("getAllowedOrigin", () => {
    const createMockRequest = (origin) => ({
      headers: {
        get: (name) => {
          return name.toLowerCase() === "origin" ? origin : null;
        },
      },
    });

    test("should return null when no origin header is present", () => {
      const request = createMockRequest(null);
      const env = { TURNSTILE_SECRET_KEY: "secret" };
      expect(utils.getAllowedOrigin(request, env)).toBeNull();
    });

    test("should return null when no ALLOWED_ORIGINS configured", () => {
      const request = createMockRequest("https://example.com");
      const env = { TURNSTILE_SECRET_KEY: "secret" };
      expect(utils.getAllowedOrigin(request, env)).toBeNull();
    });

    test("should return origin if it matches allowed origins", () => {
      const request = createMockRequest("https://example.com");
      const env = {
        TURNSTILE_SECRET_KEY: "secret",
        ALLOWED_ORIGINS: "https://example.com,https://test.com",
      };
      expect(utils.getAllowedOrigin(request, env)).toBe("https://example.com");
    });

    test("should support wildcard origins", () => {
      const request = createMockRequest("https://example.com");
      const env = {
        TURNSTILE_SECRET_KEY: "secret",
        ALLOWED_ORIGINS: "*",
      };
      expect(utils.getAllowedOrigin(request, env)).toBe("https://example.com");
    });

    test("should return null when origin does not match", () => {
      const request = createMockRequest("https://evil.com");
      const env = {
        TURNSTILE_SECRET_KEY: "secret",
        ALLOWED_ORIGINS: "https://example.com,https://test.com",
      };
      expect(utils.getAllowedOrigin(request, env)).toBeNull();
    });
  });
});
