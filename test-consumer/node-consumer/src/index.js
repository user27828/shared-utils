/**
 * Node.js integration tests for @user27828/shared-utils
 *
 * This file demonstrates real-world usage patterns in a Node.js environment
 * and can be used by LLM agents to test integration issues.
 */

import { log, optionsManager, turnstile } from "@user27828/shared-utils/utils";
import {
  getTurnstileServerOptions,
  verifyTurnstileToken,
} from "@user27828/shared-utils/server";

console.log("🚀 Node.js Consumer Test Starting...");

// Test log utility
console.log("\n📝 Testing Log Utility:");
log.setOptions({
  type: "server",
  showCaller: true,
});

log.info("This is a test log message");
log.warn("This is a warning message");
log.error("This is an error message");

// Test turnstile utility
console.log("\n🔒 Testing Turnstile Utility:");
try {
  turnstile.setOptions({
    siteKey: "test-browser-site-key",
  });

  optionsManager.setGlobalOptions({
    "turnstile-server": {
      secretKey: "test-secret-key",
      expectedAction: "node-consumer-test",
    },
  });

  const browserOptions = turnstile.getOptions();
  const serverOptions = getTurnstileServerOptions();

  console.log("Turnstile browser helper options:", browserOptions);
  console.log("Turnstile server options:", serverOptions);
  console.log(
    "verifyTurnstileToken export available:",
    typeof verifyTurnstileToken === "function",
  );

  console.log("Turnstile packages loaded successfully in Node.js environment");
} catch (error) {
  console.error("Turnstile test failed:", error);
}

console.log("\n✅ Node.js Consumer Test Complete");
