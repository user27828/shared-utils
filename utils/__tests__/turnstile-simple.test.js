/**
 * Simple Turnstile tests
 * @jest-environment node
 */

import { TEST_VALUES } from "../../__tests__/test-configuration.js";
import turnstile, { Turnstile } from "../src/turnstile.js";
import { turnstile as sharedUtilsTurnstile } from "@shared-utils/utils";

describe("Turnstile Utility - Basic Tests", () => {
  it("should be importable from the utils package", () => {
    expect(turnstile).toBeDefined();
    expect(Turnstile).toBeDefined();
    expect(typeof turnstile.setOptions).toBe("function");
    expect(typeof new Turnstile().detectEnvironment).toBe("function");
  });

  it("should have correct default options", () => {
    const options = sharedUtilsTurnstile.getOptions();
    expect(options.environment).toBe("server"); // Should detect server in Node.js
    expect(options.apiUrl).toBe(TEST_VALUES.cloudflareApiUrl);
    expect(options.scriptUrl).toBe(TEST_VALUES.cloudflareScriptUrl);
  });

  it("should allow setting options", () => {
    sharedUtilsTurnstile.setOptions({
      siteKey: TEST_VALUES.siteKey,
      secretKey: TEST_VALUES.secretKey,
    });

    const options = sharedUtilsTurnstile.getOptions();
    expect(options.siteKey).toBe(TEST_VALUES.siteKey);
    expect(options.secretKey).toBe(TEST_VALUES.secretKey);
  });

  it("should create new instances of Turnstile class", async () => {
    const { Turnstile } = await import("@shared-utils/utils");

    const instance1 = new Turnstile();
    const instance2 = new Turnstile();

    expect(instance1).toBeInstanceOf(Turnstile);
    expect(instance2).toBeInstanceOf(Turnstile);
    expect(instance1).not.toBe(instance2);
  });

  it("should have all expected methods", async () => {
    const { turnstile } = await import("@shared-utils/utils");

    const expectedMethods = [
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

    expectedMethods.forEach((method) => {
      expect(typeof turnstile[method]).toBe("function");
    });
  });
});
