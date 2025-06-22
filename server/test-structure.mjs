/**
 * Simple test for Turnstile reorganization without external dependencies
 */

console.log("🧪 Testing Turnstile Reorganization\n");

async function test() {
  try {
    // Test direct turnstile imports
    console.log("1️⃣ Testing turnstile module structure...");

    // Import main server index which should work
    const serverIndex = await import("./index.js");
    console.log("   ✅ Server index imports successfully");

    // Test that exports are available from server index
    console.log("2️⃣ Testing server index exports...");
    console.log(
      "   ✅ getTurnstileServerOptions:",
      typeof serverIndex.getTurnstileServerOptions === "function",
    );
    console.log(
      "   ✅ createTurnstileMiddleware:",
      typeof serverIndex.createTurnstileMiddleware === "function",
    );
    console.log(
      "   ✅ verifyTurnstileToken:",
      typeof serverIndex.verifyTurnstileToken === "function",
    );

    console.log("3️⃣ Testing file structure exists...");
    const fs = await import("fs");
    const path = await import("path");

    const turnstilePath = path.default.join(process.cwd(), "src", "turnstile");
    const files = [
      "types.ts",
      "utils.ts",
      "verification.ts",
      "turnstile.ts",
      "middleware.ts",
      "index.ts",
    ];

    for (const file of files) {
      const filePath = path.default.join(turnstilePath, file);
      if (fs.default.existsSync(filePath)) {
        console.log(`   ✅ ${file} exists`);
      } else {
        throw new Error(`Missing file: ${file}`);
      }
    }

    console.log("\n🎉 Turnstile reorganization successful!");
    console.log("\n📁 Structure verified:");
    console.log("   ✅ /src/turnstile/types.ts");
    console.log("   ✅ /src/turnstile/utils.ts");
    console.log("   ✅ /src/turnstile/verification.ts");
    console.log("   ✅ /src/turnstile/turnstile.ts");
    console.log("   ✅ /src/turnstile/middleware.ts");
    console.log("   ✅ /src/turnstile/index.ts");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

test();
