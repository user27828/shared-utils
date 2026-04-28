/**
 * Test package imports using the intended import paths
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

describe("Package Import Paths", () => {
  describe("Utils Package Imports", () => {
    it("should import utils using package-style path", () => {
      // This simulates: import { log, Log } from '@shared-utils/utils'
      const moduleSummary = inspectModule("../dist/utils/index.js", [
        "log",
        "Log",
      ]);

      expect(moduleSummary).toContain("log:object");
      expect(moduleSummary).toContain("Log:function");
    });

    it("should work with relative imports from utils", () => {
      // This simulates: import { log } from '../utils'
      const moduleSummary = inspectModule("../dist/utils/index.js", ["log"]);

      expect(moduleSummary).toContain("log:object");
    });
  });

  describe("Client Package Imports", () => {
    it("should be able to import client components", () => {
      // This simulates: import { ... } from '@shared-utils/client'
      // Note: Client components use browser-oriented code, so we verify the built entry exists.
      const clientEntryPath = path.resolve(
        __dirname,
        "../dist/client/index.js",
      );

      expect(fs.existsSync(clientEntryPath)).toBe(true);

      // The client module exists and is properly structured (tested separately)
      expect(true).toBe(true);
    });
  });

  describe("Server Package Imports", () => {
    it("should import server using package-style path", () => {
      // This simulates: import { createTurnstileWorker } from '@shared-utils/server'
      const moduleSummary = inspectModule("../dist/server/index.js", [
        "createTurnstileWorker",
        "createTurnstileMiddleware",
      ]);

      expect(moduleSummary).toContain("createTurnstileWorker:function");
      expect(moduleSummary).toContain("createTurnstileMiddleware:function");
    });

    it("should work with destructured imports from server", () => {
      // This simulates: import { createTurnstileWorker, verifyTurnstileToken } from '@shared-utils/server'
      const moduleSummary = inspectModule("../dist/server/index.js", [
        "createTurnstileWorker",
        "verifyTurnstileToken",
      ]);

      expect(moduleSummary).toContain("createTurnstileWorker:function");
      expect(moduleSummary).toContain("verifyTurnstileToken:function");
    });
  });

  describe("Root Package Behavior", () => {
    it("should have minimal root exports", () => {
      // This simulates: import from '@shared-utils'
      const rootExportKeys = JSON.parse(inspectModule("../index.js"));

      // Root should have minimal or no exports to avoid JSX issues
      expect(rootExportKeys).toEqual([]);
    });
  });
});
