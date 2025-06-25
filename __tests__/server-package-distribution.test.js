/**
 * Server Package Distribution Tests
 * Tests that verify the server package is properly included and consumable
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

describe("Server Package Distribution", () => {
  const projectRoot = path.resolve(__dirname, "..");
  const serverDistPath = path.join(projectRoot, "server", "dist");

  beforeAll(() => {
    // Ensure packages are built before running tests
    expect(fs.existsSync(serverDistPath)).toBe(true);
  });

  describe("Package Structure", () => {
    it("should have server/dist directory with required files", () => {
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

    it("should include server/dist in root package files array", () => {
      const packageJsonPath = path.join(projectRoot, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      expect(packageJson.files).toContain("server/dist");
    });

    it("should have proper ./server export configuration", () => {
      const packageJsonPath = path.join(projectRoot, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports["./server"]).toBeDefined();

      const serverExport = packageJson.exports["./server"];
      expect(serverExport.types).toBe("./server/dist/index.d.ts");
      expect(serverExport.import).toBe("./server/dist/index.js");
      expect(serverExport.default).toBe("./server/dist/index.js");

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
    it("should have proper dependency on utils package", () => {
      const serverPackageJsonPath = path.join(
        projectRoot,
        "server",
        "package.json",
      );
      const serverPackageJson = JSON.parse(
        fs.readFileSync(serverPackageJsonPath, "utf8"),
      );

      expect(serverPackageJson.dependencies).toHaveProperty(
        "@shared-utils/utils",
      );
      expect(serverPackageJson.dependencies["@shared-utils/utils"]).toBe(
        "workspace:*",
      );
    });

    it("should reference utils dependency in compiled code", () => {
      const serverJsPath = path.join(serverDistPath, "index.js");
      const serverJsContent = fs.readFileSync(serverJsPath, "utf8");

      // The compiled JS should have references to @shared-utils/utils
      expect(serverJsContent).toContain("@shared-utils/utils");
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
      const viaExportsPath = path.join(projectRoot, "server/dist/index.js");

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
});
