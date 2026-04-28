/**
 * Tests for the Turnstile Worker Factory
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { createTurnstileWorker } from "../src/turnstile/worker-factory.js";

describe("createTurnstileWorker", () => {
  let mockEnv;

  const createMockRequest = ({
    method = "POST",
    origin = "https://example.com",
    body = {},
    jsonError,
  } = {}) => ({
    method,
    headers: {
      get: jest.fn((header) => {
        const headers = {
          origin,
          Origin: origin,
          "CF-Connecting-IP": "203.0.113.10",
          "X-Forwarded-For": "203.0.113.10",
          "X-Real-IP": "203.0.113.10",
        };

        return headers[header] || headers[String(header).toLowerCase()] || null;
      }),
    },
    json: jsonError
      ? jest.fn().mockRejectedValue(jsonError)
      : jest.fn().mockResolvedValue(body),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    mockEnv = {
      TURNSTILE_SECRET_KEY: "test-secret-key",
      ALLOWED_ORIGINS: "https://example.com,https://app.example.com",
    };
  });

  test("should create a worker with default configuration", () => {
    const worker = createTurnstileWorker();
    expect(worker).toBeDefined();
    expect(typeof worker.fetch).toBe("function");
  });

  test("should create a worker with custom configuration", () => {
    const config = {
      allowedOrigins: ["https://custom.com"],
      expectedHostname: "custom.com",
      expectedAction: "contact-form",
    };

    const worker = createTurnstileWorker(config);
    expect(worker).toBeDefined();
    expect(typeof worker.fetch).toBe("function");
  });

  test("should handle OPTIONS request (CORS preflight)", async () => {
    const worker = createTurnstileWorker();
    const optionsRequest = createMockRequest({ method: "OPTIONS" });

    const response = await worker.fetch(optionsRequest, mockEnv);

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://example.com",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS",
    );
  });

  test("should reject disallowed origins", async () => {
    const worker = createTurnstileWorker();
    const request = createMockRequest({ origin: "https://evil.com" });

    const response = await worker.fetch(request, mockEnv);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
  });

  test("should reject non-POST requests", async () => {
    const worker = createTurnstileWorker();
    const getRequest = createMockRequest({ method: "GET" });

    const response = await worker.fetch(getRequest, mockEnv);

    expect(response.status).toBe(405);
    expect(await response.text()).toBe("Method not allowed");
  });

  test("should handle missing token in request body", async () => {
    const worker = createTurnstileWorker();
    const request = createMockRequest({ body: {} });

    const response = await worker.fetch(request, mockEnv);

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData["error-codes"]).toContain("missing-input-response");
  });

  test("should return bad-request for invalid JSON", async () => {
    const worker = createTurnstileWorker();
    const request = createMockRequest({
      jsonError: new Error("Invalid JSON"),
    });

    const response = await worker.fetch(request, mockEnv);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      "error-codes": ["bad-request"],
    });
  });

  test("should handle request with token", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          "error-codes": [],
        }),
    });

    const worker = createTurnstileWorker();
    const request = createMockRequest({
      body: {
        token: "test-token",
        remoteip: "203.0.113.10",
      },
    });

    const response = await worker.fetch(request, mockEnv);

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);

    const verificationRequest = global.fetch.mock.calls[0][1];
    expect(global.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        body: expect.any(URLSearchParams),
      }),
    );
    expect(verificationRequest.body.get("secret")).toBe("test-secret-key");
    expect(verificationRequest.body.get("response")).toBe("test-token");
    expect(verificationRequest.body.get("remoteip")).toBe("203.0.113.10");
  });

  test("should enforce expected action and hostname checks", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          action: "signup",
          hostname: "example.com",
        }),
    });

    const worker = createTurnstileWorker({
      expectedAction: "login",
      expectedHostname: "example.com",
    });
    const request = createMockRequest({
      body: {
        token: "test-token",
      },
    });

    const response = await worker.fetch(request, mockEnv);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        success: false,
        "error-codes": ["action-mismatch"],
      }),
    );
  });

  test("should return verification failures from Cloudflare", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
    });

    const worker = createTurnstileWorker();
    const request = createMockRequest({
      body: {
        token: "test-token",
      },
    });

    const response = await worker.fetch(request, mockEnv);

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData).toEqual({
      success: false,
      "error-codes": ["invalid-input-response"],
    });
  });

  test("should merge configuration with environment variables", async () => {
    const worker = createTurnstileWorker({
      allowedOrigins: ["https://override.com"],
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          "error-codes": [],
        }),
    });

    const request = createMockRequest({
      origin: "https://override.com",
      body: {
        token: "test-token",
      },
    });

    const response = await worker.fetch(request, mockEnv);

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://override.com",
    );
  });
});
