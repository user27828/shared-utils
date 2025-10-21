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
 * - With locator: "../shared-utils::locator=agentm.resume%40workspace%3A."
 * - Sibling project: "../my-shared-utils"
 *
 * BEHAVIOR:
 * - No args: Auto-detects environment (dev=enable, build/CI=disable)
 * - --enable: Force enable portal resolutions
 * - --disable: Force disable portal resolutions
 * - --report: Show current portal status without making changes
 * - --status: Alias for --report
 * - --dry-run: Preview changes without applying them
 * - --help: Show this help message
 * - CF_PAGES=1 or CI=1: Always disables portals (unless --enable is explicit)
 *
 * MONOREPO SUPPORT:
 * Works with packages/, apps/, workers/, src/ subdirectories automatically.
 * Each package.json with matching dependencies will be managed.
 *
 */
import fs from "fs";
import path from "path";

/**
 * Parses a portal path to extract the path and locator
 * Format: "path/to/portal::locator=value"
 * @param portalPath - The full portal path with optional locator
 * @returns Object with path and locator properties
 */
function parsePortalPath(portalPath) {
  const locatorIndex = portalPath.indexOf("::");
  if (locatorIndex === -1) {
    return {
      path: portalPath,
      locator: null,
    };
  }

  return {
    path: portalPath.substring(0, locatorIndex),
    locator: portalPath.substring(locatorIndex),
  };
}

/**
 * Builds a complete portal resolution string with optional locator
 * @param path - The portal path
 * @param locator - Optional locator string (e.g., "::locator=...")
 * @returns Complete portal resolution string
 */
function buildPortalResolution(path, locator) {
  return locator ? `portal:${path}${locator}` : `portal:${path}`;
}

function showHelp() {
  console.log(`
📦 Dependency Manager - Portal Resolution Controller

USAGE:
  dependency-manager [OPTIONS]

OPTIONS:
  --enable              Force enable all portal resolutions
  --disable             Force disable all portal resolutions
  --report, --status    Show current portal status without making changes
  --dry-run             Preview changes without applying them
  --help, -h            Show this help message

ENVIRONMENT DETECTION (when no options specified):
  - Development contexts: Enables portals
    • npm_lifecycle_event includes 'dev'
    • NODE_ENV is 'development'
    • Running local dev server
  
  - Production contexts: Disables portals
    • npm_lifecycle_event includes 'build' or 'prepare'
    • CI=1 or CF_PAGES=1 environment variables set
    • wrangler deploy or similar deployment commands

CONFIGURATION:
  Add _portalConfig to your package.json:

  "_portalConfig": {
    "portals": {
      "@user27828/shared-utils": "../shared-utils",
      "@user27828/db-supabase": "../db-supabase::locator=agentm.resume%40workspace%3A."
    },
    "packages": {
      "@user27828/shared-utils": "https://github.com/user27828/shared-utils.git#master",
      "@user27828/db-supabase": "https://github.com/user27828/db-supabase.git#master"
    }
  }

  Portal paths can include optional locators:
  - Basic: "../path-to-package"
  - With locator: "../path-to-package::locator=value"
  - Locators are appended as-is: "::locator=..." is preserved in resolutions

EXAMPLES:
  dependency-manager                 # Auto-detect and update
  dependency-manager --enable        # Enable portals
  dependency-manager --disable       # Disable portals
  dependency-manager --report        # Show current status
  dependency-manager --dry-run       # Preview changes
  dependency-manager --help          # Show this message
`);
}

/**
 * Validates that a portal path exists
 * @param portalPath - The path to validate (without locator)
 * @returns Object with isValid, exists, isSymlink, isBroken properties
 */
function validatePortalPath(portalPath) {
  const result = {
    isValid: true,
    exists: false,
    isSymlink: false,
    isBroken: false,
    message: "",
  };

  try {
    // Check if path exists
    if (fs.existsSync(portalPath)) {
      result.exists = true;

      // Check if it's a symlink
      const stats = fs.lstatSync(portalPath);
      if (stats.isSymbolicLink()) {
        result.isSymlink = true;

        // Check if symlink is broken by trying to read the target
        try {
          fs.statSync(portalPath);
        } catch {
          result.isBroken = true;
          result.isValid = false;
          result.message = "🔗 Broken symlink";
        }
      }

      if (result.isValid) {
        result.message = "✅ Path exists";
      }
    } else {
      result.isValid = false;
      result.message = "❌ Path does not exist";
    }
  } catch (error) {
    result.isValid = false;
    result.message = `❌ Error validating path: ${error.message}`;
  }

  return result;
}

/**
 * Reports the current status of portal configurations
 */
function reportStatus() {
  const portalConfig = getPortalConfig();
  const packageFiles = getRelevantPackageFiles();

  console.log("\n📋 Portal Configuration Status Report\n");

  if (!portalConfig.portals || Object.keys(portalConfig.portals).length === 0) {
    console.log("ℹ️  No portal configuration found\n");
    return;
  }

  console.log("Configured Portals:");
  Object.entries(portalConfig.portals).forEach(([pkg, portalConfig]) => {
    const parsed = parsePortalPath(portalConfig);
    const validation = validatePortalPath(parsed.path);
    const packageVersion = portalConfig.packages?.[pkg] || "N/A";
    console.log(`  📦 ${pkg}`);
    console.log(
      `     Portal:   ${parsed.path}${parsed.locator ? ` (locator: ${parsed.locator})` : ""}`,
    );
    console.log(`     Status:   ${validation.message}`);
    console.log(`     Package:  ${packageVersion}`);
  });

  console.log("\nResolutions in package.json files:");
  packageFiles.forEach((pkgPath) => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const hasResolutions =
      pkg.resolutions && Object.keys(pkg.resolutions).length > 0;

    if (hasResolutions) {
      console.log(`  📄 ${pkgPath}`);
      Object.entries(pkg.resolutions).forEach(([pkgName, resolution]) => {
        const isPortal = resolution.includes("portal:");
        const status = isPortal ? "🔗 portal" : "📦 package";
        console.log(`     ${pkgName}: ${resolution} (${status})`);
      });
    }
  });

  console.log("");
}

function parseArguments() {
  const args = process.argv.slice(2);
  return {
    enable: args.includes("--enable"),
    disable: args.includes("--disable"),
    report: args.includes("--report") || args.includes("--status"),
    dryRun: args.includes("--dry-run"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function detectEnvironment() {
  const args = process.argv.slice(2);
  const flags = parseArguments();

  // Check for explicit command-line arguments first
  if (flags.enable) {
    console.log("🔧 Explicit --enable flag detected");
    return "development";
  }

  if (flags.disable) {
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
      const config = pkg._portalConfig;

      // Support new nested format with portals and packages keys
      if (config.portals && config.packages) {
        return {
          portals: config.portals,
          packages: config.packages,
        };
      }

      // Support old flat format (for backwards compatibility)
      // Filter out special keys like "#comment"
      const filteredConfig = {};
      Object.keys(config).forEach((key) => {
        if (!key.startsWith("#")) {
          filteredConfig[key] = config[key];
        }
      });

      // If it's the old format, convert it to new format
      if (Object.keys(filteredConfig).length > 0) {
        return {
          portals: filteredConfig,
          packages: filteredConfig, // Assume packages are the same as portals in old format
        };
      }
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
  const flags = parseArguments();

  console.log(`🎯 Environment detected: ${env}`);
  console.log(`📦 Portal config:`, portalConfig);

  if (!portalConfig.portals || Object.keys(portalConfig.portals).length === 0) {
    console.log(`ℹ️  No portal configuration - no management needed`);
    return;
  }

  if (packageFiles.length === 0) {
    console.log(`ℹ️  No package.json files found to manage`);
    return;
  }

  if (flags.dryRun) {
    console.log("\n🔍 DRY-RUN MODE - No changes will be applied\n");
  }

  let totalChanges = 0;

  packageFiles.forEach((pkgPath) => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    let hasChanges = false;
    const changes = [];

    Object.keys(portalConfig.portals).forEach((packageName) => {
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

          const portalConfigValue = portalConfig.portals[packageName];
          const parsed = parsePortalPath(portalConfigValue);
          const validation = validatePortalPath(parsed.path);

          if (!pkg.resolutions[packageName]?.includes("portal:")) {
            if (!validation.isValid) {
              console.warn(
                `⚠️  ${pkgPath}: Portal path for ${packageName} is invalid: ${validation.message}`,
              );
              console.warn(`   Path: ${parsed.path}`);
            } else {
              const resolution = buildPortalResolution(
                parsed.path,
                parsed.locator,
              );
              pkg.resolutions[packageName] = resolution;
              const locatorInfo = parsed.locator ? ` (with locator)` : "";
              changes.push(
                `Added ${packageName} → ${resolution}${validation.isSymlink ? " (symlink)" : ""}${locatorInfo}`,
              );
              hasChanges = true;
            }
          }
        } else if (env === "production") {
          // Remove portal from resolutions for production
          // Yarn will fall back to the dependencies entry
          if (pkg.resolutions?.[packageName]?.includes("portal:")) {
            delete pkg.resolutions[packageName];
            changes.push(`Removed ${packageName} from resolutions`);
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
      totalChanges += changes.length;
      console.log(`\n📄 ${pkgPath}:`);
      changes.forEach((change) => {
        console.log(`  ✅ ${change}`);
      });

      if (!flags.dryRun) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      }
    }
  });

  if (flags.dryRun) {
    console.log(`\n📊 DRY-RUN: Would apply ${totalChanges} change(s)`);
  }
}

function verifyProductionDependencies() {
  if (detectEnvironment() !== "production") {
    return;
  }

  const packageFiles = getRelevantPackageFiles();
  const portalConfig = getPortalConfig();

  if (!portalConfig.portals || Object.keys(portalConfig.portals).length === 0) {
    return;
  }

  packageFiles.forEach((pkgPath) => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

    Object.keys(portalConfig.portals).forEach((packageName) => {
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

// Main execution
const flags = parseArguments();

// Handle help flag
if (flags.help) {
  showHelp();
  process.exit(0);
}

// Handle report/status flag
if (flags.report) {
  reportStatus();
  process.exit(0);
}

// Run normal update workflow
updateDependencies();
verifyProductionDependencies();
