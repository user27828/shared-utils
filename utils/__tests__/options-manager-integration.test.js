/**
 * Test hybrid OptionsManager integration
 * @jest-environment node
 */

import {
  log,
  turnstile,
  OptionsManager,
  optionsManager,
} from "@shared-utils/utils";
import { TEST_VALUES } from "../../__tests__/test-configuration.js";

describe("Hybrid OptionsManager Integration", () => {
  beforeEach(() => {
    // Reset all utilities to clean state
    log.resetOptions && log.resetOptions();
    turnstile.resetOptions();
    optionsManager.resetAllOptions();
  });

  test("should export OptionsManager components", () => {
    expect(OptionsManager).toBeDefined();
    expect(optionsManager).toBeDefined();
    expect(typeof OptionsManager).toBe("function");
    expect(typeof optionsManager.setGlobalOptions).toBe("function");
  });

  test("should allow individual utility configuration", () => {
    // Configure log utility
    log.setOptions({ type: "server" });
    expect(log.getOptions().type).toBe("server");

    // Configure turnstile utility
    turnstile.setOptions({ siteKey: TEST_VALUES.siteKey });
    expect(turnstile.getOptions().siteKey).toBe(TEST_VALUES.siteKey);
  });

  test("should allow cross-utility configuration", () => {
    // Configure both utilities at once
    optionsManager.setGlobalOptions({
      log: { type: "server" },
      turnstile: {
        siteKey: TEST_VALUES.siteKey,
        secretKey: TEST_VALUES.secretKey,
      },
    });

    // Verify log options
    expect(log.getOptions().type).toBe("server");

    // Verify turnstile options
    expect(turnstile.getOptions().siteKey).toBe(TEST_VALUES.siteKey);
    expect(turnstile.getOptions().secretKey).toBe(TEST_VALUES.secretKey);
  });

  test("should preserve existing APIs", () => {
    // Test that existing APIs still work exactly as before

    // Log utility API
    expect(typeof log.info).toBe("function");
    expect(typeof log.error).toBe("function");
    expect(typeof log.setOptions).toBe("function");
    expect(typeof log.getOptions).toBe("function");

    // Turnstile utility API
    expect(typeof turnstile.render).toBe("function");
    expect(typeof turnstile.verify).toBe("function");
    expect(typeof turnstile.setOptions).toBe("function");
    expect(typeof turnstile.getOptions).toBe("function");
    expect(typeof turnstile.resetOptions).toBe("function");
  });

  test("should allow getting all utility options", () => {
    // Set some options on each utility
    turnstile.setOptions({ siteKey: "test-site" });
    log.setOptions({ type: "client" });

    // Get all options
    const allOptions = optionsManager.getAllOptions();

    expect(allOptions.turnstile).toBeDefined();
    expect(allOptions.turnstile.siteKey).toBe("test-site");
    expect(allOptions.log).toBeDefined();
    expect(allOptions.log.type).toBe("client");
  });

  test("should reset all utilities at once", () => {
    // Set some options
    turnstile.setOptions({ siteKey: "test-key" });
    log.setOptions({ type: "client" });

    // Verify they are set
    expect(turnstile.getOptions().siteKey).toBe("test-key");
    expect(log.getOptions().type).toBe("client");

    // Reset all
    optionsManager.resetAllOptions();

    // Verify they are reset (should be undefined for optional values)
    expect(turnstile.getOptions().siteKey).toBeUndefined();
    // Type should go back to auto-detected default (server in Node.js)
    expect(log.getOptions().type).toBe("server");
  });

  test("should list registered utilities", () => {
    const utilities = optionsManager.getRegisteredUtilities();
    expect(utilities).toContain("log");
    expect(utilities).toContain("turnstile");
  });

  test("should provide individual OptionsManager instances", () => {
    const logManager = optionsManager.getManager("log");
    const turnstileManager = optionsManager.getManager("turnstile");

    expect(logManager).toBeDefined();
    expect(turnstileManager).toBeDefined();

    // Test direct manager usage
    logManager.setOptions({ type: "server" });
    expect(log.getOptions().type).toBe("server");

    turnstileManager.setOptions({ siteKey: "manager-key" });
    expect(turnstile.getOptions().siteKey).toBe("manager-key");
  });

  test("should maintain singleton behavior", async () => {
    // Multiple imports should get the same instances
    const utils1 = await import("@shared-utils/utils");
    const utils2 = await import("@shared-utils/utils");

    expect(utils1.log).toBe(utils2.log);
    expect(utils1.turnstile).toBe(utils2.turnstile);
    expect(utils1.optionsManager).toBe(utils2.optionsManager);

    console.log("✅ Hybrid OptionsManager successfully implemented");
    console.log("🔄 All existing APIs preserved");
    console.log("🌐 Cross-utility configuration enabled");
    console.log("🎯 Implementation complete");
  });
});
