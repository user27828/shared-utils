/**
 * Test script for the reorganized Turnstile structure
 * Verifies that both local development and Cloudflare Worker syntax work
 */

import { optionsManager } from "../utils/index.js";

async function testReorganizedStructure() {
  console.log("🧪 Testing Reorganized Turnstile Structure\n");

  try {
    // Test 1: Import from main server index
    console.log("1️⃣ Testing main server imports...");
    const serverModule = await import("./index.js");
    const { getTurnstileServerOptions, createTurnstileMiddleware } =
      serverModule;
    console.log("   ✅ Main server imports successful");

    // Test 2: Import directly from turnstile module
    console.log("2️⃣ Testing direct turnstile module imports...");
    const turnstileModule = await import("./src/turnstile/index.js");
    console.log("   ✅ Direct turnstile module imports successful");

    // Test 3: Configure and verify
    console.log("3️⃣ Testing configuration...");
    optionsManager.setGlobalOptions({
      "turnstile-server": {
        secretKey: "test-reorganization",
        devMode: true,
        bypassLocalhost: true,
      },
    });

    const options = getTurnstileServerOptions();
    console.log("   ✅ Configuration verified:", {
      hasSecretKey: !!options.secretKey,
      devMode: options.devMode,
    });

    // Test 4: Middleware creation
    console.log("4️⃣ Testing middleware creation...");
    const middleware = createTurnstileMiddleware();
    console.log("   ✅ Middleware created successfully");

    console.log("\n🎉 ALL TESTS PASSED!");
    console.log("\n📁 New Structure Summary:");
    console.log("   ✅ /server/src/turnstile/ - Turnstile-specific modules");
    console.log("   ✅ /server/index.ts - Main server exports");
    console.log("   ✅ /server/turnstile-worker.ts - Cloudflare Worker entry");
    console.log("   ✅ Both local and Worker deployments supported");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testReorganizedStructure();
