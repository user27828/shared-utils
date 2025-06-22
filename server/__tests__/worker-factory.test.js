/**
 * Tests for the Turnstile Worker Factory
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { createTurnstileWorker } from "../src/turnstile/worker-factory.js";

describe("createTurnstileWorker", () => {
  let mockEnv;
  let mockRequest;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock environment
    mockEnv = {
      TURNSTILE_SECRET_KEY: "test-secret-key",
      DEV_MODE: "false",
      NODE_ENV: "production",
      ALLOWED_ORIGINS: "https://example.com,https://app.example.com",
    };

    // Mock request
    mockRequest = {
      method: "POST",
      headers: {
        get: jest.fn((header) => {
          const headers = {
            "CF-Connecting-IP": "192.168.1.1",
            "X-Forwarded-For": "192.168.1.1",
            "X-Real-IP": "192.168.1.1",
            Origin: "https://example.com",
          };
          return headers[header] || null;
        }),
      },
      json: jest.fn(),
    };

    // Mock global fetch
    global.fetch = jest.fn();
  });

  test("should create a worker with default configuration", () => {
    const worker = createTurnstileWorker();
    expect(worker).toBeDefined();
    expect(typeof worker.fetch).toBe("function");
  });

  test("should create a worker with custom configuration", () => {
    const config = {
      allowedOrigins: ["https://custom.com"],
      devMode: true,
      bypassLocalhost: false,
    };

    const worker = createTurnstileWorker(config);
    expect(worker).toBeDefined();
    expect(typeof worker.fetch).toBe("function");
  });

  test("should handle OPTIONS request (CORS preflight)", async () => {
    const worker = createTurnstileWorker();
    const optionsRequest = { ...mockRequest, method: "OPTIONS" };

    const response = await worker.fetch(optionsRequest, mockEnv);

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS",
    );
  });

  test("should reject non-POST requests", async () => {
    const worker = createTurnstileWorker();
    const getRequest = { ...mockRequest, method: "GET" };

    const response = await worker.fetch(getRequest, mockEnv);

    expect(response.status).toBe(405);
    expect(await response.text()).toBe("Method not allowed");
  });

  test("should handle missing token in request body", async () => {
    const worker = createTurnstileWorker();
    mockRequest.json.mockResolvedValue({
      /* no token */
    });

    const response = await worker.fetch(mockRequest, mockEnv);

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData["error-codes"]).toContain("missing-input-response");
  });

  test("should handle request with token", async () => {
    // Mock the Turnstile API response
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          "error-codes": [],
        }),
    });

    const worker = createTurnstileWorker();
    mockRequest.json.mockResolvedValue({
      token: "test-token",
      remoteip: "192.168.1.1",
    });

    const response = await worker.fetch(mockRequest, mockEnv);

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
  });

  test("should use custom interceptor for error logging", async () => {
    const mockInterceptor = jest.fn();
    const worker = createTurnstileWorker({
      interceptor: mockInterceptor,
    });

    // Force an error by providing invalid JSON
    mockRequest.json.mockRejectedValue(new Error("Invalid JSON"));

    const response = await worker.fetch(mockRequest, mockEnv);

    expect(response.status).toBe(500);
    expect(mockInterceptor).toHaveBeenCalledWith("error", {
      error: "Invalid JSON",
    });
  });

  test("should handle dev mode configuration", async () => {
    const worker = createTurnstileWorker({
      devMode: true,
    });

    mockRequest.json.mockResolvedValue({
      token: "test-token",
    });

    // In dev mode, it should bypass real verification
    const response = await worker.fetch(mockRequest, mockEnv);

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
  });

  test("should merge configuration with environment variables", async () => {
    const worker = createTurnstileWorker({
      allowedOrigins: ["https://override.com"],
    });

    mockRequest.json.mockResolvedValue({
      token: "test-token",
    });

    // Mock successful Turnstile API response
    global.fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          "error-codes": [],
        }),
    });

    const response = await worker.fetch(mockRequest, mockEnv);

    expect(response.status).toBe(200);
    // The custom allowedOrigins should override the environment variable
  });
});
