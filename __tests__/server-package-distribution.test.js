/**
 * Server Package Distribution Tests
 * Tests that verify the server package is properly included and consumable
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const os = require("os");

describe("Server Package Distribution", () => {
  const projectRoot = path.resolve(__dirname, "..");
  const serverDistPath = path.join(projectRoot, "dist", "server");

  beforeAll(() => {
    // Ensure packages are built before running tests
    expect(fs.existsSync(serverDistPath)).toBe(true);
  });

  describe("Package Structure", () => {
    it("should have dist/server directory with required files", () => {
      expect(fs.existsSync(serverDistPath)).toBe(true);

      const requiredFiles = [
        "index.js",
        "index.d.ts",
        "turnstile-worker.js",
        "turnstile-worker.d.ts",
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(serverDistPath, file);
        expect(fs.existsSync(filePath)).toBe(true);
      }

      // Check src directory structure
      const srcPath = path.join(serverDistPath, "src", "turnstile");
      expect(fs.existsSync(srcPath)).toBe(true);
    });

    it("should include dist in root package files array", () => {
      const packageJsonPath = path.join(projectRoot, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      expect(packageJson.files).toContain("dist/**/*");
    });

    it("should have proper ./server export configuration", () => {
      const packageJsonPath = path.join(projectRoot, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports["./server"]).toBeDefined();

      const serverExport = packageJson.exports["./server"];
      expect(serverExport.types).toBe("./dist/server/index.d.ts");
      expect(serverExport.import).toBe("./dist/server/index.js");
      expect(serverExport.default).toBe("./dist/server/index.js");

      // Verify these files exist
      const typesPath = path.join(projectRoot, serverExport.types);
      const importPath = path.join(projectRoot, serverExport.import);

      expect(fs.existsSync(typesPath)).toBe(true);
      expect(fs.existsSync(importPath)).toBe(true);
    });
  });

  describe("Server Package Imports", () => {
    it("should successfully import server module structure", () => {
      // Test that the file exists and has the basic structure
      const serverPath = path.join(serverDistPath, "index.js");
      expect(fs.existsSync(serverPath)).toBe(true);

      const serverContent = fs.readFileSync(serverPath, "utf8");
      expect(serverContent).toContain("createTurnstileWorker");
      expect(serverContent).toContain("createTurnstileMiddleware");
      expect(serverContent).toContain("verifyTurnstileTokenEnhanced");
    });

    it("should export main server functions in file content", () => {
      const serverPath = path.join(serverDistPath, "index.js");
      const serverContent = fs.readFileSync(serverPath, "utf8");

      const expectedExports = [
        "createTurnstileWorker",
        "createTurnstileMiddleware",
        "verifyTurnstileTokenEnhanced",
        "verifyTurnstileSimple",
        "verifyTurnstileToken",
      ];

      for (const exportName of expectedExports) {
        expect(serverContent).toContain(exportName);
      }
    });

    it("should support destructured imports via exports", () => {
      const serverPath = path.join(serverDistPath, "index.js");
      const serverContent = fs.readFileSync(serverPath, "utf8");

      // Check that the file has export statements
      expect(serverContent).toMatch(/export.*createTurnstileWorker/);
      expect(serverContent).toMatch(/export.*verifyTurnstileTokenEnhanced/);
    });
  });

  describe("TypeScript Declarations", () => {
    it("should have valid TypeScript declarations", () => {
      const dtsPath = path.join(serverDistPath, "index.d.ts");
      expect(fs.existsSync(dtsPath)).toBe(true);

      const dtsContent = fs.readFileSync(dtsPath, "utf8");

      const expectedTypes = [
        "TurnstileWorkerConfig",
        "TurnstileServerOptions",
        "Environment",
        "TurnstileVerifyRequest",
        "TurnstileVerifyResponse",
      ];

      for (const typeName of expectedTypes) {
        expect(dtsContent).toContain(typeName);
      }
    });

    it("should have TypeScript declarations for all main files", () => {
      const typeFiles = [
        path.join(serverDistPath, "index.d.ts"),
        path.join(serverDistPath, "turnstile-worker.d.ts"),
        path.join(serverDistPath, "src", "turnstile", "index.d.ts"),
      ];

      for (const file of typeFiles) {
        expect(fs.existsSync(file)).toBe(true);
      }
    });
  });

  describe("Worker Factory Functionality", () => {
    it("should have worker factory function available", () => {
      const serverPath = path.join(serverDistPath, "index.js");
      const serverContent = fs.readFileSync(serverPath, "utf8");

      expect(serverContent).toContain("createTurnstileWorker");
      expect(serverContent).toContain("export");
    });

    it("should have worker creation patterns in code", () => {
      const serverPath = path.join(serverDistPath, "index.js");
      const serverContent = fs.readFileSync(serverPath, "utf8");

      // Check for worker creation patterns and middleware exports
      expect(serverContent).toContain("createTurnstileWorker");
      expect(serverContent).toContain("createTurnstileMiddleware");
    });
  });

  describe("Workspace Dependencies", () => {
    it("should not have workspace dependencies that break consuming projects", () => {
      const serverPackageJsonPath = path.join(
        projectRoot,
        "server",
        "package.json",
      );
      const serverPackageJson = JSON.parse(
        fs.readFileSync(serverPackageJsonPath, "utf8"),
      );

      // The server package should not depend on workspace packages
      // that won't be available in consuming projects
      const dependencies = serverPackageJson.dependencies || {};
      const workspaceDeps = Object.keys(dependencies).filter(
        (dep) =>
          dep.startsWith("@shared-utils/") ||
          dependencies[dep].includes("workspace:"),
      );

      expect(workspaceDeps).toHaveLength(0);
    });

    it("should not reference workspace dependencies in compiled code", () => {
      const serverJsPath = path.join(serverDistPath, "index.js");
      const serverJsContent = fs.readFileSync(serverJsPath, "utf8");

      // The compiled JS should NOT have references to @shared-utils/utils
      // since this would break in consuming projects
      expect(serverJsContent).not.toContain("@shared-utils/utils");
    });
  });

  describe("Package Configuration", () => {
    it("should use yarn in package scripts", () => {
      const serverPackageJsonPath = path.join(
        projectRoot,
        "server",
        "package.json",
      );
      const serverPackageJson = JSON.parse(
        fs.readFileSync(serverPackageJsonPath, "utf8"),
      );

      // Check that scripts use yarn, not npm
      const scripts = serverPackageJson.scripts;
      for (const [name, script] of Object.entries(scripts)) {
        if (script.includes("tsc") || script.includes("jest")) {
          expect(script).toContain("yarn");
          expect(script).not.toContain("npx");
          expect(script).not.toContain("npm run");
        }
      }
    });

    it("should have proper main and types fields in server package.json", () => {
      const serverPackageJsonPath = path.join(
        projectRoot,
        "server",
        "package.json",
      );
      const serverPackageJson = JSON.parse(
        fs.readFileSync(serverPackageJsonPath, "utf8"),
      );

      expect(serverPackageJson.main).toBe("dist/index.js");
      expect(serverPackageJson.types).toBe("dist/index.d.ts");
    });

    it("should include dist files in server package files array", () => {
      const serverPackageJsonPath = path.join(
        projectRoot,
        "server",
        "package.json",
      );
      const serverPackageJson = JSON.parse(
        fs.readFileSync(serverPackageJsonPath, "utf8"),
      );

      expect(serverPackageJson.files).toContain("dist/**/*");
    });
  });

  describe("Integration with Package Exports", () => {
    it("should be importable via package export path simulation", () => {
      // This simulates: import { createTurnstileWorker } from '@user27828/shared-utils/server'
      // by testing the actual file that would be resolved
      const packageJsonPath = path.join(projectRoot, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      const serverExportPath = packageJson.exports["./server"].import;
      const resolvedPath = path.join(projectRoot, serverExportPath);

      expect(fs.existsSync(resolvedPath)).toBe(true);
    });

    it("should have consistent exports between different import methods", () => {
      const directImportPath = path.join(serverDistPath, "index.js");
      const viaExportsPath = path.join(projectRoot, "dist/server/index.js");

      // Both paths should point to the same file and exist
      expect(fs.existsSync(directImportPath)).toBe(true);
      expect(fs.existsSync(viaExportsPath)).toBe(true);

      // Content should be identical since they're the same file
      const directContent = fs.readFileSync(directImportPath, "utf8");
      const viaExportsContent = fs.readFileSync(viaExportsPath, "utf8");

      expect(directContent).toBe(viaExportsContent);
    });
  });

  describe("Build Process Validation", () => {
    it("should have clean TypeScript compilation output", () => {
      // Check that there are no TypeScript compilation artifacts indicating errors
      const distFiles = fs.readdirSync(serverDistPath, { recursive: true });

      // Should have both .js and .d.ts files
      const jsFiles = distFiles.filter((f) => f.toString().endsWith(".js"));
      const dtsFiles = distFiles.filter((f) => f.toString().endsWith(".d.ts"));

      expect(jsFiles.length).toBeGreaterThan(0);
      expect(dtsFiles.length).toBeGreaterThan(0);

      // Should have source maps
      const mapFiles = distFiles.filter((f) => f.toString().endsWith(".map"));
      expect(mapFiles.length).toBeGreaterThan(0);
    });

    it("should not have external dependency compilation issues", () => {
      // Check that the build doesn't include problematic external paths
      const indexJsPath = path.join(serverDistPath, "index.js");
      const indexJsContent = fs.readFileSync(indexJsPath, "utf8");

      // Should not have relative paths going outside the package
      expect(indexJsContent).not.toContain("../../../utils/src");
      expect(indexJsContent).not.toContain("../../../../");
    });
  });

  describe("Package Distribution Simulation", () => {
    it("should include server files in yarn pack simulation", async () => {
      // This test simulates what yarn pack would include
      const { execSync } = require("child_process");

      try {
        // Capture both stdout and stderr since yarn pack outputs to stderr
        const packOutput = execSync("yarn pack --dry-run 2>&1", {
          cwd: projectRoot,
          encoding: "utf8",
        });

        // Check that server files are listed in the pack output
        // yarn pack output includes notice lines, so we check for the notice messages
        expect(packOutput).toContain("dist/server/index.js");
        expect(packOutput).toContain("dist/server/index.d.ts");
        expect(packOutput).toContain("dist/server/turnstile-worker.js");
        expect(packOutput).toContain("dist/server/src/turnstile/");

        // Verify that the total file count includes server files (should be > 80 files)
        const totalFilesMatch = packOutput.match(/total files:\s*(\d+)/);
        if (totalFilesMatch) {
          const totalFiles = parseInt(totalFilesMatch[1]);
          expect(totalFiles).toBeGreaterThan(80);
        }
      } catch (error) {
        console.error("yarn pack simulation failed:", error.message);
        throw error;
      }
    });

    it("should have server files accessible via file system as they would be in node_modules", () => {
      // Simulate what a consuming project would see in node_modules/@user27828/shared-utils/
      const serverIndexPath = path.join(
        projectRoot,
        "server",
        "dist",
        "index.js",
      );
      const serverTypesPath = path.join(
        projectRoot,
        "server",
        "dist",
        "index.d.ts",
      );
      const serverWorkerPath = path.join(
        projectRoot,
        "server",
        "dist",
        "turnstile-worker.js",
      );

      expect(fs.existsSync(serverIndexPath)).toBe(true);
      expect(fs.existsSync(serverTypesPath)).toBe(true);
      expect(fs.existsSync(serverWorkerPath)).toBe(true);

      // Verify the paths match what the exports field references
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
      );
      const serverExport = packageJson.exports["./server"];

      const exportedTypesPath = path.join(projectRoot, serverExport.types);
      const exportedImportPath = path.join(projectRoot, serverExport.import);

      expect(serverTypesPath).toBe(exportedTypesPath);
      expect(serverIndexPath).toBe(exportedImportPath);
    });
  });

  describe("Package Publishing Debug", () => {
    it("should show package version and verify it matches published expectations", () => {
      const packageJsonPath = path.join(projectRoot, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      console.log("Current package version:", packageJson.version);
      console.log("Package name:", packageJson.name);

      // Check if this version includes the server fixes
      expect(packageJson.exports["./server"]).toBeDefined();
      expect(packageJson.files).toContain("dist/**/*");
    });

    it("should create a test tarball and verify server files are included", async () => {
      const { execSync } = require("child_process");

      // Create a temporary directory for this test
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "shared-utils-tarball-"),
      );
      const tarballPath = path.join(tempDir, "package.tgz");

      try {
        // Create an actual tarball to test in temp directory
        const packResult = execSync(`yarn pack --filename "${tarballPath}"`, {
          cwd: projectRoot,
          encoding: "utf8",
        });

        console.log("Created tarball:", tarballPath);

        // List contents of the tarball
        const tarContents = execSync(`tar -tzf "${tarballPath}"`, {
          encoding: "utf8",
        });

        console.log("Tarball contents (server files only):");
        const serverFiles = tarContents
          .split("\n")
          .filter((line) => line.includes("server/"));
        serverFiles.forEach((file) => console.log("  ", file));

        // Verify server files are present
        expect(tarContents).toContain("package/dist/server/index.js");
        expect(tarContents).toContain("package/dist/server/index.d.ts");
        expect(tarContents).toContain(
          "package/dist/server/turnstile-worker.js",
        );
      } catch (error) {
        console.error("Tarball creation/inspection failed:", error.message);
        throw error;
      } finally {
        // Clean up temp directory
        try {
          execSync(`rm -rf "${tempDir}"`);
        } catch (cleanupError) {
          console.warn(`Warning: Could not clean up temp directory ${tempDir}`);
        }
      }
    });

    it("should verify the package can be imported as expected", () => {
      // Test the exact import pattern a consumer would use
      const serverExportPath = path.join(
        projectRoot,
        "server",
        "dist",
        "index.js",
      );
      expect(fs.existsSync(serverExportPath)).toBe(true);

      const content = fs.readFileSync(serverExportPath, "utf8");
      console.log("Server exports available:");

      // Look for export statements
      const exportMatches = content.match(/export\s+{[^}]+}/g);
      if (exportMatches) {
        exportMatches.forEach((match) => console.log("  ", match));
      }

      // Verify key exports are present
      expect(content).toContain("createTurnstileWorker");
      expect(content).toContain("verifyTurnstileTokenEnhanced");
    });
  });

  describe("Consuming Project Integration", () => {
    it("should not have workspace dependency issues when imported in consuming projects", async () => {
      // This test ensures the server package can be imported without workspace dependencies
      const { execSync } = require("child_process");

      // Create a temporary directory for this test
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "shared-utils-import-"),
      );
      const tarballPath = path.join(tempDir, "package.tgz");

      try {
        // Create a test package and try to import it
        const packResult = execSync(`yarn pack --filename "${tarballPath}"`, {
          cwd: projectRoot,
          encoding: "utf8",
        });

        const testDir = path.join(tempDir, "test-extraction");
        fs.mkdirSync(testDir, { recursive: true });

        // Extract package
        execSync(`tar -xzf "${tarballPath}" -C "${testDir}"`);

        // Create test import file
        const testImportContent = `
import { createTurnstileWorker, verifyTurnstileTokenEnhanced } from './package/dist/server/index.js';
console.log('SUCCESS: Server exports imported without errors');
console.log('createTurnstileWorker type:', typeof createTurnstileWorker);
console.log('verifyTurnstileTokenEnhanced type:', typeof verifyTurnstileTokenEnhanced);
        `;

        const testImportPath = path.join(testDir, "test-import.mjs");
        fs.writeFileSync(testImportPath, testImportContent);

        // Try to run the import test
        const importResult = execSync(`node test-import.mjs`, {
          cwd: testDir,
          encoding: "utf8",
        });

        expect(importResult).toContain("SUCCESS");
        expect(importResult).toContain("createTurnstileWorker type: function");
        expect(importResult).toContain(
          "verifyTurnstileTokenEnhanced type: function",
        );
      } catch (error) {
        console.error("Import test failed:", error.message);
        throw error;
      } finally {
        // Clean up temp directory
        try {
          execSync(`rm -rf "${tempDir}"`);
        } catch (cleanupError) {
          console.warn(`Warning: Could not clean up temp directory ${tempDir}`);
        }
      }
    });
  });
});
