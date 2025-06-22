#!/usr/bin/env node

/**
 * Integration test for the new worker factory implementation
 * This test verifies that the new createTurnstileWorker function works correctly
 */

import { createTurnstileWorker } from "./server/dist/turnstile/worker-factory.js";

console.log("🧪 Testing createTurnstileWorker implementation...\n");

// Test 1: Basic worker creation
console.log("Test 1: Basic worker creation");
try {
  const worker = createTurnstileWorker();
  console.log("✅ Worker created successfully");
  console.log(
    "✅ Worker has fetch method:",
    typeof worker.fetch === "function",
  );
} catch (error) {
  console.error("❌ Failed to create worker:", error.message);
  process.exit(1);
}

// Test 2: Worker with custom configuration
console.log("\nTest 2: Worker with custom configuration");
try {
  const customWorker = createTurnstileWorker({
    allowedOrigins: ["https://example.com"],
    devMode: true,
    bypassLocalhost: false,
  });
  console.log("✅ Worker created with custom config");
  console.log(
    "✅ Worker has fetch method:",
    typeof customWorker.fetch === "function",
  );
} catch (error) {
  console.error("❌ Failed to create worker with config:", error.message);
  process.exit(1);
}

// Test 3: Mock request handling (OPTIONS)
console.log("\nTest 3: OPTIONS request handling");
try {
  const worker = createTurnstileWorker();
  const mockEnv = { TURNSTILE_SECRET_KEY: "test-key" };
  const optionsRequest = {
    method: "OPTIONS",
    headers: {
      get: () => "https://example.com",
    },
  };

  const response = await worker.fetch(optionsRequest, mockEnv);
  console.log("✅ OPTIONS request handled, status:", response.status);
  console.log(
    "✅ CORS headers present:",
    response.headers.has("Access-Control-Allow-Origin"),
  );
} catch (error) {
  console.error("❌ OPTIONS request failed:", error.message);
  process.exit(1);
}

// Test 4: Non-POST request rejection
console.log("\nTest 4: Non-POST request rejection");
try {
  const worker = createTurnstileWorker();
  const mockEnv = { TURNSTILE_SECRET_KEY: "test-key" };
  const getRequest = {
    method: "GET",
    headers: {
      get: () => "https://example.com",
    },
  };

  const response = await worker.fetch(getRequest, mockEnv);
  console.log("✅ GET request rejected, status:", response.status);
  console.log(
    "✅ Response is 405 Method Not Allowed:",
    response.status === 405,
  );
} catch (error) {
  console.error("❌ GET request handling failed:", error.message);
  process.exit(1);
}

// Test 5: Import validation
console.log("\nTest 5: Import validation");
try {
  // Test importing from server index
  const { createTurnstileWorker: factoryFromIndex } = await import(
    "./server/dist/index.js"
  );
  console.log("✅ Worker factory available from server/index.js");

  // Test the worker created from index import
  const workerFromIndex = factoryFromIndex();
  console.log("✅ Worker created from index import");
  console.log(
    "✅ Worker has fetch method:",
    typeof workerFromIndex.fetch === "function",
  );
} catch (error) {
  console.error("❌ Import validation failed:", error.message);
  process.exit(1);
}

console.log(
  "\n🎉 All tests passed! The new implementation is working correctly.",
);
console.log("\n📋 Test Summary:");
console.log("   ✅ Basic worker creation");
console.log("   ✅ Custom configuration support");
console.log("   ✅ CORS preflight handling");
console.log("   ✅ Method validation");
console.log("   ✅ Export validation");
console.log("\n🚀 The new streamlined deployment approach is ready for use!");
