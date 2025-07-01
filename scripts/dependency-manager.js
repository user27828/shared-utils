#!/usr/bin/env node

/**
 * Dependency Manager Script
 * This script handles automatic add/remove of portal: references in consuming
 * projects's package.json file(s) based on the environment.
 * This specifically addresses Cloudflare Workers failing when portal: references exist
 *
 * USAGE IN CONSUMING PROJECTS:
 *
 * Option A - Automatic detection (recommended for build/dev workflows):
 * "scripts": {
 *   "dev": "dependency-manager && yarn dev",
 *   "build": "dependency-manager && yarn build",
 *   "cf:deploy": "dependency-manager && wrangler deploy"
 * }
 *
 * Option B - Explicit control:
 * "scripts": {
 *   "enable:portal": "dependency-manager --enable",
 *   "disable:portal": "dependency-manager --disable",
 *   "dev": "yarn enable:portal && yarn dev",
 *   "build": "yarn disable:portal && yarn build"
 * }
 *
 * CONFIGURATION:
 * Configure portal paths in your package.json:
 * {
 *   "name": "my-consuming-project",
 *   "dependencies": {
 *     "@user27828/shared-utils": "https://github.com/user27828/shared-utils.git#master"
 *   },
 *   "_portalConfig": {
 *     "@user27828/shared-utils": "../path/to/shared-utils",
 *     "other-package": "/absolute/path/to/package"
 *   }
 * }
 *
 * PORTAL PATH EXAMPLES:
 * - Relative: "../shared-utils" (most common for local dev)
 * - Relative deep: "../../libs/shared-utils"
 * - Absolute: "/home/user/projects/shared-utils"
 * - Sibling project: "../my-shared-utils"
 *
 * BEHAVIOR:
 * - No args: Auto-detects environment (dev=enable, build/CI=disable)
 * - --enable: Force enable portal resolutions
 * - --disable: Force disable portal resolutions
 * - CF_PAGES=1 or CI=1: Always disables portals (unless --enable is explicit)
 *
 * MONOREPO SUPPORT:
 * Works with packages/, apps/, workers/, src/ subdirectories automatically.
 * Each package.json with matching dependencies will be managed.
 *
 */
import fs from "fs";
import path from "path";

function detectEnvironment() {
  const args = process.argv.slice(2);

  // Check for explicit command-line arguments first
  if (args.includes("--enable")) {
    console.log("🔧 Explicit --enable flag detected");
    return "development";
  }

  if (args.includes("--disable")) {
    console.log("🔧 Explicit --disable flag detected");
    return "production";
  }

  // Check CI/deployment environments
  if (
    process.env.CI ||
    process.env.CLOUDFLARE_PAGES ||
    process.env.CF_PAGES === "1"
  ) {
    return "production";
  }

  // Get the lifecycle event (works for both npm and yarn)
  const lifecycleEvent = process.env.npm_lifecycle_event;
  const command = args.join(" ");

  // Check if we're using Yarn (for better context)
  const isYarn =
    process.env.npm_execpath?.includes("yarn") ||
    process.env.npm_config_user_agent?.includes("yarn") ||
    fs.existsSync("yarn.lock");

  console.log(`📦 Package manager: ${isYarn ? "Yarn" : "npm"}`);
  console.log(`🔧 Lifecycle event: ${lifecycleEvent || "none"}`);

  // Production/deployment scenarios
  if (
    lifecycleEvent?.includes("build") ||
    lifecycleEvent?.includes("prepare") ||
    lifecycleEvent?.includes("postinstall") ||
    command.includes("wrangler") ||
    command.includes("deploy") ||
    command.includes("cf:")
  ) {
    return "production";
  }

  // Development scenarios
  if (
    lifecycleEvent?.includes("dev") ||
    command.includes("dev") ||
    command.includes("test:consumer")
  ) {
    return "development";
  }

  // Yarn workspace-specific detection
  if (
    isYarn &&
    (command.includes("workspace") || lifecycleEvent?.includes("workspace"))
  ) {
    return "development";
  }

  // Default based on NODE_ENV
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function getPortalConfig() {
  // Try package.json _portalConfig
  if (fs.existsSync("./package.json")) {
    const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
    if (pkg._portalConfig) {
      return pkg._portalConfig;
    }
  }

  // No portal config found - return empty object
  console.log(
    "ℹ️  No _portalConfig found in package.json - no portal management needed",
  );
  return {};
}

function getRelevantPackageFiles() {
  // For consuming projects, look for package.json files that might need portal management
  const potentialPaths = [
    "./package.json", // Main project package.json
    "./packages/*/package.json", // Monorepo packages
    "./apps/*/package.json", // Apps in monorepo
    "./workers/*/package.json", // Cloudflare workers
    "./src/*/package.json", // Source packages
  ];

  const existingPaths = [];

  // Check direct paths
  potentialPaths.forEach((pathPattern) => {
    if (pathPattern.includes("*")) {
      // Handle glob patterns
      const basePath = pathPattern.split("*")[0];
      if (fs.existsSync(basePath.slice(0, -1))) {
        // Remove trailing slash
        const dirs = fs
          .readdirSync(basePath.slice(0, -1), { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => pathPattern.replace("*", dirent.name))
          .filter((pkgPath) => fs.existsSync(pkgPath));
        existingPaths.push(...dirs);
      }
    } else if (fs.existsSync(pathPattern)) {
      existingPaths.push(pathPattern);
    }
  });

  return existingPaths;
}

function updateDependencies() {
  const env = detectEnvironment();
  const portalConfig = getPortalConfig();
  const packageFiles = getRelevantPackageFiles();

  console.log(`🎯 Environment detected: ${env}`);
  console.log(`📦 Portal config:`, portalConfig);

  if (Object.keys(portalConfig).length === 0) {
    console.log(`ℹ️  No portal configuration - no management needed`);
    return;
  }

  if (packageFiles.length === 0) {
    console.log(`ℹ️  No package.json files found to manage`);
    return;
  }

  packageFiles.forEach((pkgPath) => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    let hasChanges = false;

    Object.keys(portalConfig).forEach((packageName) => {
      // Check if package exists in any dependency type
      const hasPackage =
        pkg.dependencies?.[packageName] ||
        pkg.devDependencies?.[packageName] ||
        pkg.peerDependencies?.[packageName];

      if (hasPackage) {
        if (env === "development") {
          // Add portal to resolutions for development
          if (!pkg.resolutions) {
            pkg.resolutions = {};
          }

          const portalPath = portalConfig[packageName];
          if (!pkg.resolutions[packageName]?.includes("portal:")) {
            pkg.resolutions[packageName] = `portal:${portalPath}`;
            console.log(
              `✅ ${pkgPath}: Added ${packageName} → portal:${portalPath} to resolutions`,
            );
            hasChanges = true;
          }
        } else if (env === "production") {
          // Remove portal from resolutions for production
          if (pkg.resolutions?.[packageName]?.includes("portal:")) {
            delete pkg.resolutions[packageName];
            console.log(
              `✅ ${pkgPath}: Removed ${packageName} from resolutions`,
            );
            hasChanges = true;

            // Clean up empty resolutions object
            if (Object.keys(pkg.resolutions).length === 0) {
              delete pkg.resolutions;
            }
          }
        }
      }
    });

    if (hasChanges) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    }
  });
}

function verifyProductionDependencies() {
  if (detectEnvironment() !== "production") {
    return;
  }

  const packageFiles = getRelevantPackageFiles();
  const portalConfig = getPortalConfig();

  if (Object.keys(portalConfig).length === 0) {
    return;
  }

  packageFiles.forEach((pkgPath) => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

    Object.keys(portalConfig).forEach((packageName) => {
      // Check resolutions for portal references
      const resolution = pkg.resolutions?.[packageName];
      if (resolution?.includes("portal:")) {
        throw new Error(
          `❌ Portal resolution detected in production build: ${packageName} in ${pkgPath}`,
        );
      }
    });
  });

  console.log("✅ All dependencies verified for production");
}

updateDependencies();
verifyProductionDependencies();
