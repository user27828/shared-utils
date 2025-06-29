#!/usr/bin/env node

/**
 * Standalone test runner for server-side tests
 */

import { runServerTests } from "./tests/server-integration-tests.js";

console.log("🚀 Starting Server Test Runner...\n");

try {
  const results = await runServerTests();

  console.log("\n=== FINAL TEST RESULTS ===");
  console.log(
    `📊 Summary: ${results.summary.passed}/${results.summary.total} tests passed`,
  );
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⏭️  Skipped: ${results.summary.skipped}`);

  if (results.summary.failed > 0) {
    console.log("\n❌ Failed Tests:");
    Object.entries(results.tests)
      .filter(([, test]) => test.status === "failed")
      .forEach(([name, test]) => {
        console.log(`  - ${name}: ${test.error || "Unknown error"}`);
      });
  }

  console.log("\n📋 Full results available at: http://localhost:3002/test");
  process.exit(results.summary.failed > 0 ? 1 : 0);
} catch (error) {
  console.error("💥 Test runner failed:", error);
  process.exit(1);
}
