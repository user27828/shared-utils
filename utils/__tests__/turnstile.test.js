/**
 * Tests for Turnstile utility
 * @jest-environment node
 */

import { jest } from "@jest/globals";
import { TEST_VALUES } from "../../__tests__/test-configuration.js";

// Mock fetch globally
global.fetch = jest.fn();

// Mock URLSearchParams
global.URLSearchParams = class URLSearchParams {
  constructor() {
    this.data = {};
  }

  append(key, value) {
    this.data[key] = value;
  }

  toString() {
    return Object.entries(this.data)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
      .join("&");
  }
};

describe("Turnstile Utility", () => {
  let turnstile, Turnstile;

  beforeEach(async () => {
    // Reset modules and mocks
    jest.resetModules();
    jest.clearAllMocks();

    // Mock DOM environment
    global.document = {
      createElement: jest.fn().mockReturnValue({
        setAttribute: jest.fn(),
        style: {},
        onload: null,
        onerror: null,
      }),
      head: {
        appendChild: jest.fn(),
      },
    };

    global.window = {
      location: {
        hostname: TEST_VALUES.hostname,
      },
      turnstile: {
        ready: jest.fn((callback) => {
          // Call callback immediately for test environment
          callback();
        }),
        render: jest.fn().mockReturnValue("widget-123"),
        remove: jest.fn(),
        reset: jest.fn(),
        getResponse: jest.fn().mockReturnValue(TEST_VALUES.token),
        isExpired: jest.fn().mockReturnValue(false),
      },
    };

    // Import after mocking globals
    const module = await import("../dist/src/turnstile.js");
    turnstile = module.default;
    Turnstile = module.Turnstile;

    // Reset singleton state to prevent cross-test pollution
    turnstile.resetOptions();

    // Mock the script loading to be already loaded for tests
    turnstile.scriptLoaded = true;
    turnstile.scriptLoading = false;
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
  });

  describe("Environment Detection", () => {
    it("should detect client environment correctly", () => {
      const instance = new Turnstile();
      const options = instance.getOptions();
      expect(options.environment).toBe("client");
    });
  });

  describe("Configuration", () => {
    it("should set options correctly", () => {
      turnstile.setOptions({
        siteKey: TEST_VALUES.siteKey,
        secretKey: TEST_VALUES.secretKey,
        widget: {
          theme: "dark",
          size: "compact",
        },
      });

      const options = turnstile.getOptions();
      expect(options.siteKey).toBe(TEST_VALUES.siteKey);
      expect(options.secretKey).toBe(TEST_VALUES.secretKey);
      expect(options.widget.theme).toBe("dark");
      expect(options.widget.size).toBe("compact");
    });

    it("should have sensible defaults", () => {
      const options = turnstile.getOptions();
      expect(options.environment).toBe("client");
      expect(options.apiUrl).toBe(TEST_VALUES.cloudflareApiUrl);
      expect(options.scriptUrl).toBe(TEST_VALUES.cloudflareScriptUrl);
      expect(options.widget.theme).toBe("auto");
      expect(options.widget.size).toBe("normal");
    });

    it("should call interceptor when configured", async () => {
      const interceptor = jest.fn();
      turnstile.setOptions({
        siteKey: TEST_VALUES.siteKey,
        interceptor,
      });

      const result = await turnstile.render("#test-container");
      expect(result).toBe("widget-123");

      expect(interceptor).toHaveBeenCalledWith(
        "render-start",
        expect.objectContaining({
          container: "#test-container",
        }),
      );
    });
  });

  describe("Client-side Widget Rendering", () => {
    beforeEach(() => {
      turnstile.setOptions({ siteKey: TEST_VALUES.siteKey });
    });

    it("should render widget successfully", async () => {
      const widgetId = await turnstile.render("#test-container");

      expect(widgetId).toBe(TEST_VALUES.widgetId);
      expect(window.turnstile.render).toHaveBeenCalledWith(
        "#test-container",
        expect.objectContaining({
          sitekey: TEST_VALUES.siteKey,
        }),
      );
    });

    it("should throw error without site key", async () => {
      // Reset options completely and set siteKey to undefined
      turnstile.resetOptions();
      turnstile.setOptions({ siteKey: undefined });

      await expect(turnstile.render("#test-container")).rejects.toThrow(
        TEST_VALUES.errorMessages.siteKeyRequired,
      );
    });

    it("should merge custom options with defaults", async () => {
      await turnstile.render("#test-container", {
        theme: "light",
        callback: jest.fn(),
      });

      expect(window.turnstile.render).toHaveBeenCalledWith(
        "#test-container",
        expect.objectContaining({
          sitekey: TEST_VALUES.siteKey,
          theme: "light",
          size: "normal", // default
          callback: expect.any(Function),
        }),
      );
    });

    it("should get response token", () => {
      const response = turnstile.getResponse();
      expect(response).toBe(TEST_VALUES.token);
      expect(window.turnstile.getResponse).toHaveBeenCalled();
    });

    it("should reset widget", () => {
      turnstile.reset(TEST_VALUES.widgetId);
      expect(window.turnstile.reset).toHaveBeenCalledWith(TEST_VALUES.widgetId);
    });

    it("should remove widget", () => {
      turnstile.remove(TEST_VALUES.widgetId);
      expect(window.turnstile.remove).toHaveBeenCalledWith(
        TEST_VALUES.widgetId,
      );
    });

    it("should check if widget is expired", () => {
      const expired = turnstile.isExpired(TEST_VALUES.widgetId);
      expect(expired).toBe(false);
      expect(window.turnstile.isExpired).toHaveBeenCalledWith(
        TEST_VALUES.widgetId,
      );
    });
  });

  describe("Server-side Token Verification", () => {
    let serverTurnstile, ServerTurnstile;

    beforeEach(async () => {
      // Clear environment mocks to ensure server environment
      delete global.window;
      delete global.document;

      jest.resetModules();

      // Import fresh instance in server environment
      const module = await import("@shared-utils/utils");
      serverTurnstile = module.turnstile;
      ServerTurnstile = module.Turnstile;

      serverTurnstile.resetOptions();
      serverTurnstile.setOptions({ secretKey: TEST_VALUES.secretKey });
    });

    it("should verify token successfully", async () => {
      const mockResponse = {
        success: true,
        challenge_ts: "2024-01-01T00:00:00.000Z",
        hostname: "example.com",
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await serverTurnstile.verify(
        TEST_VALUES.token,
        TEST_VALUES.ipAddress,
      );

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        TEST_VALUES.cloudflareApiUrl,
        expect.objectContaining({
          method: "POST",
          body: expect.any(URLSearchParams),
        }),
      );
    });

    it("should throw error without secret key", async () => {
      // Override the beforeEach setup that sets secretKey for this specific test
      serverTurnstile.resetOptions();

      await expect(serverTurnstile.verify(TEST_VALUES.token)).rejects.toThrow(
        TEST_VALUES.errorMessages.secretKeyRequired,
      );
    });

    it("should handle verification failure", async () => {
      const mockResponse = {
        success: false,
        "error-codes": ["invalid-input-response"],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await serverTurnstile.verify("invalid-token");

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("invalid-input-response");
    });

    it("should handle network errors", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(serverTurnstile.verify(TEST_VALUES.token)).rejects.toThrow(
        "Network error",
      );
    });

    it("should handle HTTP errors", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(serverTurnstile.verify(TEST_VALUES.token)).rejects.toThrow(
        "HTTP error! status: 500",
      );
    });

    it("should include optional parameters in verification", async () => {
      const mockResponse = { success: true };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      await serverTurnstile.verify(TEST_VALUES.token, TEST_VALUES.ipAddress);

      const urlSearchParams = fetch.mock.calls[0][1].body;
      expect(urlSearchParams.data).toEqual({
        secret: TEST_VALUES.secretKey,
        response: TEST_VALUES.token,
        remoteip: TEST_VALUES.ipAddress,
      });
    });
  });

  describe("Singleton Pattern", () => {
    it("should maintain singleton instance", async () => {
      const { default: instance1 } = await import("@shared-utils/utils");
      const { default: instance2 } = await import("@shared-utils/utils");

      expect(instance1).toBe(instance2);
    });

    it("should allow creating new instances of class", () => {
      const instance1 = new Turnstile();
      const instance2 = new Turnstile();

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(Turnstile);
      expect(instance2).toBeInstanceOf(Turnstile);
    });
  });

  describe("Interceptor Functionality", () => {
    it("should call interceptor for all actions", async () => {
      const interceptor = jest.fn();
      turnstile.setOptions({
        siteKey: "test-key",
        secretKey: "test-secret",
        interceptor,
      });

      // Test render action
      await turnstile.render("#test-container");
      expect(interceptor).toHaveBeenCalledWith(
        "render-start",
        expect.any(Object),
      );
      expect(interceptor).toHaveBeenCalledWith(
        "render-success",
        expect.any(Object),
      );

      // Test get response action
      turnstile.getResponse();
      expect(interceptor).toHaveBeenCalledWith(
        "get-response",
        expect.any(Object),
      );

      // Reset to server environment for verification test
      delete global.window;
      delete global.document;
      jest.resetModules();
      const module = await import("@shared-utils/utils");
      const serverTurnstile = module.turnstile;
      serverTurnstile.resetOptions();
      serverTurnstile.setOptions({
        secretKey: "test-secret",
        interceptor,
      });

      // Test verification action
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await serverTurnstile.verify("test-token");
      expect(interceptor).toHaveBeenCalledWith(
        "verify-start",
        expect.any(Object),
      );
      expect(interceptor).toHaveBeenCalledWith(
        "verify-complete",
        expect.any(Object),
      );
    });

    it("should handle interceptor errors gracefully", async () => {
      // Suppress console.error for this test to avoid noise
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const faultyInterceptor = jest.fn(() => {
        throw new Error("Interceptor error");
      });

      turnstile.setOptions({
        siteKey: "test-key",
        interceptor: faultyInterceptor,
      });

      // Should not throw despite interceptor error
      await expect(turnstile.render("#test-container")).resolves.toBe(
        "widget-123",
      );
      expect(faultyInterceptor).toHaveBeenCalled();

      // Verify that console.error was called (but mocked)
      expect(console.error).toHaveBeenCalledWith(
        "Turnstile interceptor error:",
        expect.any(Error),
      );

      // Restore original console.error
      console.error = originalConsoleError;
    });
  });
});
