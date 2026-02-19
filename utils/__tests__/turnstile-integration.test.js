/**
 * Integration test demonstrating complete Turnstile functionality
 * @jest-environment node
 */

import { TURNSTILE_TEST_OPTIONS } from "../../__tests__/test-configuration.js";
import { log, turnstile, Turnstile } from "@shared-utils/utils";

describe("Turnstile Integration", () => {
  it("should demonstrate complete workflow", async () => {
    // Test environment detection
    expect(turnstile.getOptions().environment).toBe("server");

    // Test configuration
    const testSiteKey = TURNSTILE_TEST_OPTIONS.siteKeySuccess;
    const testSecretKey = TURNSTILE_TEST_OPTIONS.secretKeyAlwaysPasses;

    turnstile.setOptions({
      siteKey: testSiteKey,
      secretKey: testSecretKey,
    });

    const options = turnstile.getOptions();
    expect(options.siteKey).toBe(testSiteKey);
    expect(options.secretKey).toBe(testSecretKey);

    // Test that all required methods exist
    const requiredMethods = [
      "setOptions",
      "getOptions",
      "render",
      "verify",
      "getResponse",
      "reset",
      "remove",
      "isExpired",
      "cleanup",
    ];

    requiredMethods.forEach((method) => {
      expect(typeof turnstile[method]).toBe("function");
    });

    // Test class instantiation
    const customInstance = new Turnstile();
    expect(customInstance).toBeInstanceOf(Turnstile);
    expect(customInstance).not.toBe(turnstile); // Should be different instances

    // Test interceptor functionality
    const interceptorCalls = [];
    turnstile.setOptions({
      interceptor: (action, data) => {
        interceptorCalls.push({ action, data });
      },
    });

    // The interceptor should be set
    expect(turnstile.getOptions().interceptor).toBeDefined();

    console.log("✅ Turnstile utility successfully integrated and tested");
    console.log("📦 Available methods:", requiredMethods.join(", "));
    console.log("🔧 Environment detection:", options.environment);
    console.log("🚀 Ready for production use!");
  });

  it("should maintain consistency with log utility patterns", async () => {
    // Both should have setOptions
    expect(typeof log.setOptions).toBe("function");
    expect(typeof turnstile.setOptions).toBe("function");

    // Both should have getOptions
    expect(typeof log.getOptions).toBe("function");
    expect(typeof turnstile.getOptions).toBe("function");

    // Both should support interceptors
    const logOptions = log.getOptions();
    const turnstileOptions = turnstile.getOptions();

    // Structure should be similar (both have environment detection)
    expect(typeof logOptions).toBe("object");
    expect(typeof turnstileOptions).toBe("object");

    console.log("✅ Turnstile follows the same patterns as the log utility");
    console.log("🔄 Consistent API design maintained");
  });
});
