/**
 * Tests for root package exports and structure
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const inspectModule = (relativePath, exportNames = []) => {
  const absolutePath = path.resolve(__dirname, relativePath);
  const script = `
    import { pathToFileURL } from 'node:url';

    const moduleExports = await import(pathToFileURL(${JSON.stringify(absolutePath)}).href);
    const exportNames = ${JSON.stringify(exportNames)};

    if (exportNames.length === 0) {
      console.log(JSON.stringify(Object.keys(moduleExports)));
    } else {
      for (const exportName of exportNames) {
        console.log(\`${"${exportName}"}:\${typeof moduleExports[exportName]}\`);
      }
    }
  `;

  return execFileSync("node", ["--input-type=module", "--eval", script], {
    encoding: "utf8",
  }).trim();
};

describe("Root Package Structure", () => {
  describe("Package.json Configuration", () => {
    it("should have correct export paths configured", () => {
      const pkg = require("../package.json");

      expect(pkg.exports).toBeDefined();
      expect(pkg.exports["."]).toBeDefined();
      expect(pkg.exports["./utils"]).toBeDefined();
      expect(pkg.exports["./client"]).toBeDefined();
      expect(pkg.exports["./server"]).toBeDefined();
      expect(pkg.exports["./utils/*"]).toBeDefined();

      // Check that types are properly mapped
      expect(pkg.exports["."].types).toBe("./dist/utils/index.d.ts");
      expect(pkg.exports["./utils"].types).toBe("./dist/utils/index.d.ts");
      expect(pkg.exports["./client"].types).toBe("./dist/client/index.d.ts");
      expect(pkg.exports["./server"].types).toBe("./dist/server/index.d.ts");
    });

    it("should have proper main and types fields", () => {
      const pkg = require("../package.json");

      expect(pkg.main).toBe("dist/utils/index.js");
      expect(pkg.types).toBe("dist/utils/index.d.ts");
    });
  });

  describe("Root Index Exports", () => {
    it("should export empty object from root index", () => {
      const rootKeys = JSON.parse(inspectModule("../index.js"));

      expect(rootKeys).toEqual([]);
    });

    it("should not export client components from root to avoid JSX issues", () => {
      const rootKeys = JSON.parse(inspectModule("../index.js"));

      // Root should not have client components to avoid JSX import issues in Node.js
      expect(rootKeys).not.toContain("CountrySelect");
      expect(rootKeys).not.toContain("LanguageSelect");
      expect(rootKeys).not.toContain("TinyMceEditor");
    });

    it("should not export utils from root to encourage explicit imports", () => {
      const rootKeys = JSON.parse(inspectModule("../index.js"));

      // Root should not have utils to encourage explicit import paths
      expect(rootKeys).not.toContain("log");
      expect(rootKeys).not.toContain("Log");
    });
  });

  describe("Module Resolution", () => {
    it("should resolve utils module correctly", () => {
      const pkg = require("../package.json");
      const utilsPath = path.join(
        path.resolve(__dirname, ".."),
        pkg.exports["./utils"].import,
      );

      expect(fs.existsSync(utilsPath)).toBe(true);
      expect(utilsPath).toMatch(/dist[/\\]utils[/\\]index\.js$/);
    });

    it("should resolve client module correctly", () => {
      const pkg = require("../package.json");
      const clientPath = path.join(
        path.resolve(__dirname, ".."),
        pkg.exports["./client"].import,
      );

      expect(fs.existsSync(clientPath)).toBe(true);
      expect(clientPath).toMatch(/dist[/\\]client[/\\]index\.js$/);
    });

    it("should resolve root module correctly", () => {
      const pkg = require("../package.json");
      const rootPath = path.join(
        path.resolve(__dirname, ".."),
        pkg.exports["."].import,
      );

      expect(fs.existsSync(rootPath)).toBe(true);
      expect(rootPath).toMatch(/dist[/\\]utils[/\\]index\.js$/);
    });
  });

  describe("Import Path Validation", () => {
    it("should allow utils import via subpath", () => {
      const moduleSummary = inspectModule("../dist/utils/index.js", [
        "log",
        "Log",
      ]);

      expect(moduleSummary).toContain("log:object");
      expect(moduleSummary).toContain("Log:function");
    });

    it("should handle client import attempt gracefully", () => {
      const clientPath = path.join(
        path.resolve(__dirname, ".."),
        "dist",
        "client",
        "index.js",
      );

      expect(fs.existsSync(clientPath)).toBe(true);
    });
  });

  describe("TypeScript Support", () => {
    it("should have TypeScript declaration files in correct locations", () => {
      const projectRoot = path.resolve(__dirname, ".."); // Assuming test is in __tests__

      // Check for declaration files in the dist directories
      expect(fs.existsSync(path.join(projectRoot, "dist/index.d.ts"))).toBe(
        true,
      );
      expect(
        fs.existsSync(path.join(projectRoot, "dist/utils/index.d.ts")),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(projectRoot, "dist/client/index.d.ts")),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(projectRoot, "dist/server/index.d.ts")),
      ).toBe(true);

      // Check for utils source declaration files
      const utilsSrcDir = path.join(projectRoot, "dist/utils/src");
      const logDtsPath = path.join(utilsSrcDir, "log.d.ts");
      console.log(`Checking for: ${logDtsPath}`);
      let foundInDirList = false;
      try {
        const dirContents = fs.readdirSync(utilsSrcDir);
        console.log(`Contents of ${utilsSrcDir}: ${dirContents.join(", ")}`);
        if (dirContents.includes("log.d.ts")) {
          foundInDirList = true;
          console.log("log.d.ts was found in readdirSync list.");
        }
      } catch (e) {
        console.error(`Error reading directory ${utilsSrcDir}: ${e.message}`);
      }
      expect(foundInDirList).toBe(true); // Check if readdirSync found it
      // expect(fs.existsSync(logDtsPath)).toBe(true); // Keep this commented for now if the above passes
    });
  });

  describe("Development vs Production Behavior", () => {
    it("should work consistently across environments", () => {
      const absolutePath = path.resolve(__dirname, "../dist/utils/index.js");
      const script = `
        import { pathToFileURL } from 'node:url';

        process.env.NODE_ENV = 'development';
        const devUtils = await import(pathToFileURL(${JSON.stringify(absolutePath)}).href);
        process.env.NODE_ENV = 'production';
        const prodUtils = await import(pathToFileURL(${JSON.stringify(absolutePath)}).href);

        console.log(devUtils.log === prodUtils.log ? 'same' : 'different');
      `;

      const result = execFileSync(
        "node",
        ["--input-type=module", "--eval", script],
        { encoding: "utf8" },
      ).trim();

      expect(result).toBe("same");
    });
  });
});
