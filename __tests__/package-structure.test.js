/**
 * Tests for root package exports and structure
 * @jest-environment node
 */

import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "@jest/globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readRootPackageJson = () => {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"),
  );
};

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
      const pkg = readRootPackageJson();

      expect(pkg.exports).toBeDefined();
      expect(pkg.exports["."]).toBeDefined();
      expect(pkg.exports["./utils"]).toBeDefined();
      expect(pkg.exports["./utils/environment"]).toBeDefined();
      expect(pkg.exports["./utils/validation"]).toBeDefined();
      expect(pkg.exports["./utils/files"]).toBeDefined();
      expect(pkg.exports["./utils/dates"]).toBeDefined();
      expect(pkg.exports["./utils/json"]).toBeDefined();
      expect(pkg.exports["./utils/options"]).toBeDefined();
      expect(pkg.exports["./utils/log"]).toBeDefined();
      expect(pkg.exports["./utils/turnstile"]).toBeDefined();
      expect(pkg.exports["./utils/contact"]).toBeDefined();
      expect(pkg.exports["./utils/calendar"]).toBeDefined();
      expect(pkg.exports["./client/countries/core"]).toBeDefined();
      expect(pkg.exports["./client/languages/core"]).toBeDefined();
      expect(
        pkg.exports["./client/components/form/CountrySelect/custom-data"],
      ).toBeDefined();
      expect(
        pkg.exports["./client/components/form/LanguageSelect/custom-data"],
      ).toBeDefined();
      expect(pkg.exports["./utils/meeting-providers"]).toBeDefined();
      expect(pkg.exports["./utils/detect-format"]).toBeDefined();
      expect(pkg.exports["./client"]).toBeDefined();
      expect(pkg.exports["./server"]).toBeDefined();
      expect(pkg.exports["./server/init"]).toBeDefined();
      expect(pkg.exports["./utils/*"]).toBeDefined();
      expect(pkg.exports["./email/server/providers/cloudflare"]).toBeDefined();

      // Check that types are properly mapped
      expect(pkg.exports["."].types).toBe("./dist/utils/index.d.ts");
      expect(pkg.exports["./utils"].types).toBe("./dist/utils/index.d.ts");
      expect(pkg.exports["./utils/environment"].types).toBe(
        "./dist/utils/src/environment.d.ts",
      );
      expect(pkg.exports["./utils/options"].types).toBe(
        "./dist/utils/src/options-manager.d.ts",
      );
      expect(pkg.exports["./client"].types).toBe("./dist/client/index.d.ts");
      expect(pkg.exports["./server"].types).toBe("./dist/server/index.d.ts");
      expect(pkg.exports["./server/init"].types).toBe(
        "./dist/server/src/init.d.ts",
      );
      expect(pkg.exports["./email/server/providers/cloudflare"].types).toBe(
        "./dist/server/src/email/providers/cloudflare.d.ts",
      );
      expect(
        pkg.typesVersions["*"]["email/server/providers/cloudflare"],
      ).toEqual(["dist/server/src/email/providers/cloudflare.d.ts"]);
    });

    it("uses module-sync for CommonJS interop without an ESM fallback", () => {
      const pkg = readRootPackageJson();

      for (const exportConfig of Object.values(pkg.exports)) {
        expect(exportConfig).toEqual(expect.any(Object));
        expect(exportConfig["module-sync"]).toBe(exportConfig.import);
        expect(exportConfig.require).toBeUndefined();
        expect(exportConfig.default).toBeUndefined();

        const conditionNames = Object.keys(exportConfig);
        expect(conditionNames.indexOf("module-sync")).toBeLessThan(
          conditionNames.indexOf("import"),
        );
        expect(exportConfig.import).toEqual(
          expect.stringMatching(/^\.\/dist\//),
        );
        expect(exportConfig["module-sync"]).toEqual(
          expect.stringMatching(/^\.\/dist\//),
        );
      }
    });

    it("declares initialization and editor effects on their emitted paths", () => {
      const sideEffects = new Set(readRootPackageJson().sideEffects);

      expect(sideEffects.has("dist/client/src/init.js")).toBe(true);
      expect(sideEffects.has("dist/server/src/env.js")).toBe(true);
      expect(sideEffects.has("dist/server/src/init.js")).toBe(true);
      expect(sideEffects.has("dist/server/index.js")).toBe(false);
      expect(
        sideEffects.has(
          "dist/client/src/components/wysiwyg/ensurePrismGlobal.js",
        ),
      ).toBe(true);
      expect(sideEffects.has("**/*.css")).toBe(true);
    });

    it("should have proper main and types fields", () => {
      const pkg = readRootPackageJson();

      expect(pkg.main).toBe("dist/utils/index.js");
      expect(pkg.types).toBe("dist/utils/index.d.ts");
    });

    it("should map each utility subpath to emitted JavaScript and declarations", () => {
      const pkg = readRootPackageJson();
      const utilitySubpaths = [
        "./utils/environment",
        "./utils/validation",
        "./utils/files",
        "./utils/dates",
        "./utils/json",
        "./utils/options",
        "./utils/log",
        "./utils/turnstile",
        "./utils/contact",
        "./utils/calendar",
        "./utils/meeting-providers",
        "./utils/detect-format",
      ];

      for (const subpath of utilitySubpaths) {
        const exportConfig = pkg.exports[subpath];
        const typeVersionKey = subpath.slice(2);

        expect(
          fs.existsSync(path.resolve(__dirname, "..", exportConfig.import)),
        ).toBe(true);
        expect(
          fs.existsSync(path.resolve(__dirname, "..", exportConfig.types)),
        ).toBe(true);
        expect(pkg.typesVersions["*"][typeVersionKey]).toEqual([
          exportConfig.types.slice(2),
        ]);
      }
    });

    it("should publish curated E03 entrypoints with emitted code and declarations", () => {
      const pkg = readRootPackageJson();
      const subpaths = [
        "./client/components/CalendarAdd",
        "./client/components/ContactActions",
        "./client/components/CopyButton",
        "./client/components/FileIcon",
        "./client/components/PasteButton",
        "./client/components/StatCard",
        "./client/components/form/CountrySelect",
        "./client/components/form/CountrySelect/custom-data",
        "./client/components/form/FileUploadList",
        "./client/components/form/LanguageSelect",
        "./client/components/form/LanguageSelect/custom-data",
        "./client/components/form/TagsInput",
        "./client/components/form/TimezoneSelect",
        "./client/components/layout/BackdropLoader",
        "./client/components/layout/CheckChip",
        "./client/components/layout/Disconnected",
        "./client/components/layout/ProcessStatusChip",
        "./client/components/layout/SelectChip",
        "./client/components/layout/SplitChip",
        "./client/debounce",
        "./client/csv",
        "./client/countries",
        "./client/countries/core",
        "./client/languages",
        "./client/languages/core",
        "./client/timezones",
        "./client/dates",
        "./cms/client/api",
        "./cms/client/hooks",
        "./cms/client/ui",
        "./cms/server/core",
        "./cms/server/express",
        "./fm/client/api",
        "./fm/client/hooks",
        "./fm/client/ui",
        "./fm/server/core",
        "./fm/server/express",
        "./email/client/api",
        "./email/client/hooks",
        "./email/client/ui",
        "./email/server/registry",
        "./email/server/attachments",
        "./email/server/marketing",
        "./email/server/webhooks",
        "./email/server/webhooks/resend",
        "./email/server/webhooks/mailerlite",
        "./email/server/webhooks/ses",
        "./email/server/providers/contracts",
        "./server/env",
        "./server/init",
        "./server/turnstile/worker",
        "./server/turnstile/middleware",
      ];

      expect(
        Object.keys(pkg.exports).filter(
          (subpath) =>
            (subpath.startsWith("./client/") ||
              subpath.startsWith("./server/")) &&
            subpath.includes("*"),
        ),
      ).toEqual([]);

      for (const subpath of subpaths) {
        const exportConfig = pkg.exports[subpath];
        const typeVersionPath = pkg.typesVersions["*"][subpath.slice(2)];

        expect(exportConfig).toBeDefined();
        expect(
          fs.existsSync(path.resolve(__dirname, "..", exportConfig.import)),
        ).toBe(true);
        expect(
          fs.existsSync(path.resolve(__dirname, "..", exportConfig.types)),
        ).toBe(true);
        expect(typeVersionPath).toEqual([exportConfig.types.slice(2)]);
      }
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
      const pkg = readRootPackageJson();
      const utilsPath = path.join(
        path.resolve(__dirname, ".."),
        pkg.exports["./utils"].import,
      );

      expect(fs.existsSync(utilsPath)).toBe(true);
      expect(utilsPath).toMatch(/dist[/\\]utils[/\\]index\.js$/);
    });

    it("should resolve client module correctly", () => {
      const pkg = readRootPackageJson();
      const clientPath = path.join(
        path.resolve(__dirname, ".."),
        pkg.exports["./client"].import,
      );

      expect(fs.existsSync(clientPath)).toBe(true);
      expect(clientPath).toMatch(/dist[/\\]client[/\\]index\.js$/);
    });

    it("should resolve root module correctly", () => {
      const pkg = readRootPackageJson();
      const rootPath = path.join(
        path.resolve(__dirname, ".."),
        pkg.exports["."].import,
      );

      expect(fs.existsSync(rootPath)).toBe(true);
      expect(rootPath).toMatch(/dist[/\\]utils[/\\]index\.js$/);
    });

    it("should resolve the Cloudflare provider subpath correctly", () => {
      const pkg = readRootPackageJson();
      const cloudflareProviderPath = path.join(
        path.resolve(__dirname, ".."),
        pkg.exports["./email/server/providers/cloudflare"].import,
      );

      expect(fs.existsSync(cloudflareProviderPath)).toBe(true);
      expect(cloudflareProviderPath).toMatch(
        /dist[/\\]server[/\\]src[/\\]email[/\\]providers[/\\]cloudflare\.js$/,
      );
    });
  });

  describe("Import Path Validation", () => {
    it("should allow the pure utils import via subpath", () => {
      const moduleSummary = inspectModule("../dist/utils/index.js", [
        "isDev",
        "isValidEmail",
        "normalizeUrl",
      ]);

      expect(moduleSummary).toContain("isDev:function");
      expect(moduleSummary).toContain("isValidEmail:function");
      expect(moduleSummary).toContain("normalizeUrl:function");
    });

    it("should allow Cloudflare provider imports via email subpaths", () => {
      const barrelSummary = inspectModule(
        "../dist/server/src/email/providers/index.js",
        ["CloudflareEmailProvider", "isCloudflareProviderConfigured"],
      );
      const subpathSummary = inspectModule(
        "../dist/server/src/email/providers/cloudflare.js",
        ["CloudflareEmailProvider", "isConfigured"],
      );

      expect(barrelSummary).toContain("CloudflareEmailProvider:function");
      expect(barrelSummary).toContain(
        "isCloudflareProviderConfigured:function",
      );
      expect(subpathSummary).toContain("CloudflareEmailProvider:function");
      expect(subpathSummary).toContain("isConfigured:function");
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

        console.log(devUtils.isDev === prodUtils.isDev ? 'same' : 'different');
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
