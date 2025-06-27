/**
 * Node.js integration tests for @user27828/shared-utils
 *
 * This file demonstrates real-world usage patterns in a Node.js environment
 * and can be used by LLM agents to test integration issues.
 */

import { log, turnstile } from "@user27828/shared-utils/utils";

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
    siteKey: "test-key-for-node",
    secretKey: "test-secret-key",
  });

  const options = turnstile.getOptions();
  console.log("Turnstile options set:", options);

  // Test server-side verification (mock)
  console.log("Turnstile utility loaded successfully in Node.js environment");
} catch (error) {
  console.error("Turnstile test failed:", error);
}

console.log("\n✅ Node.js Consumer Test Complete");
