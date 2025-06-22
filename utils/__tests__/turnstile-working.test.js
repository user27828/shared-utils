/**
 * Turnstile utility tests - ES Module version
 * @jest-environment node
 */

import { turnstile, Turnstile } from "@shared-utils/utils";
import { TEST_VALUES } from "../../__tests__/test-configuration.js";

describe("Turnstile Utility - Basic Tests", () => {
  beforeEach(() => {
    // Reset singleton state between tests to avoid cross-test pollution
    turnstile.resetOptions();
  });

  test("should be properly exported", () => {
    expect(turnstile).toBeDefined();
    expect(Turnstile).toBeDefined();
    expect(typeof turnstile.setOptions).toBe("function");
    expect(typeof turnstile.getOptions).toBe("function");
  });

  test("should detect server environment in Node.js", () => {
    const options = turnstile.getOptions();
    expect(options.environment).toBe("server");
  });

  test("should have all expected methods", () => {
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

  test("should allow setting and getting options", () => {
    turnstile.setOptions({
      siteKey: TEST_VALUES.siteKey,
      secretKey: TEST_VALUES.secretKey,
    });

    const options = turnstile.getOptions();
    expect(options.siteKey).toBe(TEST_VALUES.siteKey);
    expect(options.secretKey).toBe(TEST_VALUES.secretKey);
  });

  test("should create new instances of Turnstile class", () => {
    const instance1 = new Turnstile();
    const instance2 = new Turnstile();

    expect(instance1).toBeInstanceOf(Turnstile);
    expect(instance2).toBeInstanceOf(Turnstile);
    expect(instance1).not.toBe(instance2);
  });

  test("should require secret key for verification", async () => {
    // Reset options
    turnstile.setOptions({ secretKey: undefined });

    await expect(turnstile.verify("test-token")).rejects.toThrow(
      "Secret key is required",
    );
  });

  test("should require site key for rendering", async () => {
    // Set to client environment to test site key validation
    turnstile.setOptions({
      environment: "client",
      siteKey: undefined,
    });

    await expect(turnstile.render("#container")).rejects.toThrow(
      "Site key is required",
    );
  });

  test("should throw errors for client-only methods in server environment", () => {
    expect(() => turnstile.getResponse()).toThrow(
      "Getting response is only available on client-side",
    );
  });
});
