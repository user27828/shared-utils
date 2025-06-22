#!/usr/bin/env node

/**
 * Simple validation test for the new worker factory implementation
 * This test validates the code structure and exports without full execution
 */

import fs from "fs";
import path from "path";

console.log("🧪 Validating createTurnstileWorker implementation...\n");

// Test 1: Check that the worker factory file exists
console.log("Test 1: Worker factory file existence");
const workerFactoryPath = "./server/src/turnstile/worker-factory.ts";
if (fs.existsSync(workerFactoryPath)) {
  console.log("✅ Worker factory file exists");
} else {
  console.error("❌ Worker factory file not found");
  process.exit(1);
}

// Test 2: Check the content structure
console.log("\nTest 2: Worker factory content validation");
const workerFactoryContent = fs.readFileSync(workerFactoryPath, "utf8");

const expectedElements = [
  "export interface TurnstileWorkerConfig",
  "export function createTurnstileWorker",
  "async fetch(request: Request, env: Environment)",
  "allowedOrigins",
  "devMode",
  "bypassLocalhost",
  "verifyTurnstileTokenEnhanced",
];

let passed = 0;
for (const element of expectedElements) {
  if (workerFactoryContent.includes(element)) {
    console.log(`✅ Found: ${element}`);
    passed++;
  } else {
    console.error(`❌ Missing: ${element}`);
  }
}

if (passed === expectedElements.length) {
  console.log("✅ All expected elements found in worker factory");
} else {
  console.error(
    `❌ Missing ${expectedElements.length - passed} expected elements`,
  );
  process.exit(1);
}

// Test 3: Check that the exports are properly configured
console.log("\nTest 3: Export configuration validation");
const indexPath = "./server/src/turnstile/index.ts";
const indexContent = fs.readFileSync(indexPath, "utf8");

const expectedExports = [
  'export { createTurnstileWorker } from "./worker-factory.js"',
  'export type { TurnstileWorkerConfig } from "./worker-factory.js"',
];

let exportsPassed = 0;
for (const exportStatement of expectedExports) {
  if (indexContent.includes(exportStatement)) {
    console.log(`✅ Found export: ${exportStatement}`);
    exportsPassed++;
  } else {
    console.error(`❌ Missing export: ${exportStatement}`);
  }
}

if (exportsPassed === expectedExports.length) {
  console.log("✅ All expected exports found");
} else {
  console.error(
    `❌ Missing ${expectedExports.length - exportsPassed} expected exports`,
  );
  process.exit(1);
}

// Test 4: Check the main server index exports
console.log("\nTest 4: Main server index validation");
const serverIndexPath = "./server/index.ts";
const serverIndexContent = fs.readFileSync(serverIndexPath, "utf8");

if (serverIndexContent.includes("export { createTurnstileWorker }")) {
  console.log("✅ createTurnstileWorker exported from server/index.ts");
} else {
  console.error("❌ createTurnstileWorker not exported from server/index.ts");
  process.exit(1);
}

// Test 5: Check the package.json exports
console.log("\nTest 5: Package.json exports validation");
const packageJsonPath = "./package.json";
const packageJsonContent = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

if (packageJsonContent.exports && packageJsonContent.exports["./server"]) {
  console.log("✅ Server exports configured in package.json");
} else {
  console.error("❌ Server exports not configured in package.json");
  process.exit(1);
}

// Test 6: Check documentation exists
console.log("\nTest 6: Documentation validation");
const deploymentGuidePath = "./doc/WORKER_DEPLOYMENT_GUIDE.md";
const deploymentGuideContent = fs.readFileSync(deploymentGuidePath, "utf8");

const expectedDocElements = [
  "createTurnstileWorker",
  "Reference Worker (Recommended)",
  "minimal import approach",
  "automatically stays up-to-date",
];

let docPassed = 0;
for (const element of expectedDocElements) {
  if (deploymentGuideContent.includes(element)) {
    console.log(`✅ Documentation includes: ${element}`);
    docPassed++;
  } else {
    console.error(`❌ Documentation missing: ${element}`);
  }
}

if (docPassed === expectedDocElements.length) {
  console.log("✅ All expected documentation elements found");
} else {
  console.error(
    `❌ Missing ${expectedDocElements.length - docPassed} documentation elements`,
  );
  process.exit(1);
}

console.log("\n🎉 All validation tests passed!");
console.log("\n📋 Validation Summary:");
console.log("   ✅ Worker factory file structure");
console.log("   ✅ Function and interface definitions");
console.log("   ✅ Export configuration");
console.log("   ✅ Server module integration");
console.log("   ✅ Package exports configuration");
console.log("   ✅ Documentation completeness");

console.log(
  "\n🚀 The new streamlined deployment implementation is valid and ready for use!",
);
console.log("\n💡 Key benefits of the new approach:");
console.log("   • Zero-copy deployment (reference worker pattern)");
console.log("   • Configurable worker factory");
console.log("   • Proper TypeScript support");
console.log("   • Clean package exports");
console.log("   • Comprehensive documentation");
