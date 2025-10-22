/**
 * Unit tests for Turnstile utility functions
 * @jest-environment node
 */

import { jest } from "@jest/globals";
import { TEST_VALUES } from "../../__tests__/test-configuration.js";
import { isDev } from "../../utils/index.js";

describe("Turnstile Utils", () => {
  let utils;

  beforeAll(async () => {
    utils = await import("../src/turnstile/utils.js");
  });

  describe("isDev (Turnstile integration)", () => {
    test("should return true when devMode option is true", () => {
      expect(isDev({ devMode: true, environment: "server" })).toBe(true);
    });

    test("should return false when devMode option is false", () => {
      expect(isDev({ devMode: false, environment: "server" })).toBe(false);
    });

    test("should return true when DEV_MODE env var is true", () => {
      const env = { DEV_MODE: "true" };
      expect(isDev({ env, environment: "server" })).toBe(true);
    });

    test("should return true when NODE_ENV is development", () => {
      const env = { NODE_ENV: "development" };
      expect(isDev({ env, environment: "server" })).toBe(true);
    });

    test("should return false by default", () => {
      expect(isDev({ environment: "server" })).toBe(false);
    });

    test("should prioritize devMode option over env vars", () => {
      const env = { NODE_ENV: "development" };
      expect(isDev({ devMode: false, env, environment: "server" })).toBe(false);
    });
  });

  describe("isLocalhostRequest", () => {
    const createMockRequest = (headers = {}) => ({
      headers: {
        get: (name) => headers[name] || null,
      },
    });

    test("should detect localhost from Origin header", () => {
      const request = createMockRequest({
        Origin: TEST_VALUES.localhostOrigin,
      });
      expect(utils.isLocalhostRequest(request)).toBe(true);
    });

    test("should detect 127.0.0.1 from Origin header", () => {
      const request = createMockRequest({ Origin: "http://127.0.0.1:3000" });
      expect(utils.isLocalhostRequest(request)).toBe(true);
    });

    test("should detect .local domains from Origin header", () => {
      const request = createMockRequest({ Origin: "http://app.local" });
      expect(utils.isLocalhostRequest(request)).toBe(true);
    });

    test("should detect localhost from Referer header", () => {
      const request = createMockRequest({
        Referer: TEST_VALUES.localhostOrigin + "/page",
      });
      expect(utils.isLocalhostRequest(request)).toBe(true);
    });

    test("should detect localhost from remote IP", () => {
      const request = createMockRequest();
      expect(utils.isLocalhostRequest(request, "127.0.0.1")).toBe(true);
      expect(utils.isLocalhostRequest(request, "::1")).toBe(true);
      expect(utils.isLocalhostRequest(request, "192.168.1.100")).toBe(true);
    });

    test("should return false for production domains", () => {
      const request = createMockRequest({ Origin: "https://example.com" });
      expect(utils.isLocalhostRequest(request)).toBe(false);
    });

    test("should handle invalid URLs gracefully", () => {
      const request = createMockRequest({ Origin: "invalid-url" });
      expect(utils.isLocalhostRequest(request)).toBe(false);
    });
  });

  describe("createMockVerifyResponse", () => {
    test("should create valid mock response", () => {
      const response = utils.createMockVerifyResponse();

      expect(response).toEqual({
        success: true,
        challenge_ts: expect.any(String),
        hostname: TEST_VALUES.hostname,
        action: "dev-mode",
        cdata: "dev-bypass",
      });

      // Verify timestamp is valid ISO string
      expect(new Date(response.challenge_ts).toISOString()).toBe(
        response.challenge_ts,
      );
    });
  });

  describe("getAllowedOrigin", () => {
    const createMockRequest = (origin) => ({
      headers: { get: (name) => (name === "Origin" ? origin : null) },
    });

    test("should return * when no ALLOWED_ORIGINS configured", () => {
      const request = createMockRequest("https://example.com");
      const env = {};
      expect(utils.getAllowedOrigin(request, env)).toBe("*");
    });

    test("should return origin if it matches allowed origins", () => {
      const request = createMockRequest("https://example.com");
      const env = { ALLOWED_ORIGINS: "https://example.com,https://test.com" };
      expect(utils.getAllowedOrigin(request, env)).toBe("https://example.com");
    });

    test("should return first allowed origin if origin does not match", () => {
      const request = createMockRequest("https://evil.com");
      const env = { ALLOWED_ORIGINS: "https://example.com,https://test.com" };
      expect(utils.getAllowedOrigin(request, env)).toBe("https://example.com");
    });

    test("should handle single allowed origin", () => {
      const request = createMockRequest("https://example.com");
      const env = { ALLOWED_ORIGINS: "https://example.com" };
      expect(utils.getAllowedOrigin(request, env)).toBe("https://example.com");
    });
  });
});
