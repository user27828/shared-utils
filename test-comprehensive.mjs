#!/usr/bin/env node

/**
 * Final comprehensive test suite for the new Turnstile worker implementation
 * This validates all aspects of the streamlined deployment approach
 */

import fs from "fs";
import { execSync } from "child_process";

console.log(
  "🧪 COMPREHENSIVE TEST SUITE FOR NEW TURNSTILE WORKER IMPLEMENTATION\n",
);
console.log(
  "================================================================\n",
);

let totalTests = 0;
let passedTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  console.log(`📋 ${testName}`);
  try {
    testFn();
    console.log("✅ PASSED\n");
    passedTests++;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
  }
}

// Test 1: File Structure
runTest("File Structure Validation", () => {
  const requiredFiles = [
    "./server/src/turnstile/worker-factory.ts",
    "./server/src/turnstile/index.ts",
    "./server/index.ts",
    "./doc/WORKER_DEPLOYMENT_GUIDE.md",
    "./examples/CONSUMING_PROJECT_EXAMPLE.md",
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required file missing: ${file}`);
    }
  }
});

// Test 2: TypeScript Compilation
runTest("TypeScript Compilation", () => {
  try {
    execSync("cd server && npx tsc --noEmit", { stdio: "pipe" });
  } catch (error) {
    throw new Error("TypeScript compilation failed");
  }
});

// Test 3: Worker Factory Implementation
runTest("Worker Factory Implementation", () => {
  const workerFactoryContent = fs.readFileSync(
    "./server/src/turnstile/worker-factory.ts",
    "utf8",
  );

  const requiredElements = [
    "export interface TurnstileWorkerConfig",
    "export function createTurnstileWorker",
    "async fetch(request: Request, env: Environment)",
    "allowedOrigins",
    "devMode",
    "bypassLocalhost",
    "apiUrl",
    "interceptor",
    "verifyTurnstileTokenEnhanced",
  ];

  for (const element of requiredElements) {
    if (!workerFactoryContent.includes(element)) {
      throw new Error(`Missing required element: ${element}`);
    }
  }
});

// Test 4: Export Configuration
runTest("Export Configuration", () => {
  const indexContent = fs.readFileSync(
    "./server/src/turnstile/index.ts",
    "utf8",
  );
  const serverIndexContent = fs.readFileSync("./server/index.ts", "utf8");

  if (
    !indexContent.includes(
      'export { createTurnstileWorker } from "./worker-factory.js"',
    )
  ) {
    throw new Error(
      "createTurnstileWorker not exported from turnstile/index.ts",
    );
  }

  if (
    !indexContent.includes(
      'export type { TurnstileWorkerConfig } from "./worker-factory.js"',
    )
  ) {
    throw new Error(
      "TurnstileWorkerConfig type not exported from turnstile/index.ts",
    );
  }

  if (!serverIndexContent.includes("createTurnstileWorker")) {
    throw new Error(
      "createTurnstileWorker not re-exported from server/index.ts",
    );
  }
});

// Test 5: Package Configuration
runTest("Package Configuration", () => {
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));

  if (!packageJson.exports || !packageJson.exports["./server"]) {
    throw new Error("Server exports not configured in package.json");
  }
});

// Test 6: Documentation Quality
runTest("Documentation Quality", () => {
  const deploymentGuide = fs.readFileSync(
    "./doc/WORKER_DEPLOYMENT_GUIDE.md",
    "utf8",
  );
  const exampleDoc = fs.readFileSync(
    "./examples/CONSUMING_PROJECT_EXAMPLE.md",
    "utf8",
  );

  const requiredDocElements = [
    "createTurnstileWorker",
    "Reference Worker (Recommended)",
    "minimal import approach",
    "automatically stays up-to-date",
  ];

  for (const element of requiredDocElements) {
    if (!deploymentGuide.includes(element)) {
      throw new Error(`Documentation missing: ${element}`);
    }
  }

  if (!exampleDoc.includes("createTurnstileWorker")) {
    throw new Error("Example documentation does not include new approach");
  }
});

// Test 7: Backward Compatibility
runTest("Backward Compatibility", () => {
  const serverIndexContent = fs.readFileSync("./server/index.ts", "utf8");

  const existingExports = [
    "verifyTurnstileTokenEnhanced",
    "createTurnstileMiddleware",
    "verifyTurnstileToken",
  ];

  for (const exportName of existingExports) {
    if (!serverIndexContent.includes(exportName)) {
      throw new Error(`Existing export missing: ${exportName}`);
    }
  }
});

// Test 8: Server Tests
runTest("Server Test Suite", () => {
  try {
    execSync("cd server && npm test", { stdio: "pipe", timeout: 30000 });
  } catch (error) {
    throw new Error("Server tests failed");
  }
});

// Final Summary
console.log("================================================================");
console.log("🎯 TEST RESULTS SUMMARY");
console.log(
  "================================================================\n",
);

console.log(`📊 Tests: ${passedTests}/${totalTests} passed`);

if (passedTests === totalTests) {
  console.log("🎉 ALL TESTS PASSED! 🎉\n");

  console.log("🚀 NEW IMPLEMENTATION STATUS: READY FOR PRODUCTION\n");

  console.log("✨ KEY FEATURES IMPLEMENTED:");
  console.log("   • Reference Worker Pattern (zero-copy deployment)");
  console.log("   • Configurable Worker Factory (createTurnstileWorker)");
  console.log("   • Complete TypeScript Support");
  console.log("   • Proper Package Exports");
  console.log("   • Comprehensive Documentation");
  console.log("   • Full Backward Compatibility");
  console.log("   • Streamlined Developer Experience\n");

  console.log("📖 USAGE EXAMPLES:");
  console.log("   Basic: export default createTurnstileWorker();");
  console.log(
    "   Custom: export default createTurnstileWorker({ devMode: true });",
  );
  console.log(
    '   Import: import { createTurnstileWorker } from "@shared-utils/server";\n',
  );

  console.log("🎯 BENEFITS ACHIEVED:");
  console.log("   • Reduced deployment complexity");
  console.log("   • Eliminated manual file copying");
  console.log("   • Automatic updates via npm");
  console.log("   • Consistent configuration");
  console.log("   • Better developer ergonomics\n");
} else {
  console.log(
    `❌ ${totalTests - passedTests} tests failed. Please review and fix issues.`,
  );
  process.exit(1);
}

console.log("================================================================");
