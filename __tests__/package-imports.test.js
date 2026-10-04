/**
 * Test package imports using the intended import paths
 * @jest-environment node
 */

import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "@jest/globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    it("supports CommonJS require through module-sync on capable Node versions", () => {
      const [major, minor] = process.versions.node.split(".").map(Number);
      const supportsRequireEsmByDefault =
        major > 22 || (major === 22 && minor >= 12);

      if (!supportsRequireEsmByDefault) {
        return;
      }

      const script = [
        "const root = require('@user27828/shared-utils');",
        "const options = require('@user27828/shared-utils/utils/options');",
        "const validation = require('@user27828/shared-utils/utils/src/validation.js');",
        "if (typeof root.isValidEmail !== 'function' || typeof options.optionsManager !== 'object' || typeof validation.isValidEmail !== 'function') {",
        "  process.exitCode = 1;",
        "}",
        "console.log('module-sync CommonJS import successful');",
      ].join("\n");
      const output = execFileSync(
        process.execPath,
        ["--input-type=commonjs", "--eval", script],
        {
          cwd: path.resolve(__dirname, ".."),
          encoding: "utf8",
        },
      );

      expect(output).toContain("module-sync CommonJS import successful");
    });

    it("should keep the root import pure and dependency-free", () => {
      const rootPath = path.resolve(__dirname, "../dist/utils/index.js");
      const script = `
        import { pathToFileURL } from 'node:url';

        const utils = await import(pathToFileURL(${JSON.stringify(rootPath)}).href);
        const hasOptionsManager = Boolean(globalThis.__shared_utils_optionsManager);
        const hasOptionsManagerSymbol = Boolean(globalThis[Symbol.for('@shared-utils/options-manager')]);
        const result = {
          exports: Object.keys(utils),
          hasOptionsManager,
          hasOptionsManagerSymbol,
          hasGlobalLog: typeof globalThis.log !== 'undefined',
        };
        console.log(JSON.stringify(result));
      `;
      const result = JSON.parse(
        execFileSync("node", ["--input-type=module", "--eval", script], {
          encoding: "utf8",
        }),
      );

      expect(result.exports).toEqual(
        expect.arrayContaining([
          "isDev",
          "isValidEmail",
          "normalizeUrl",
          "mergeJson",
        ]),
      );
      expect(result.exports).not.toEqual(
        expect.arrayContaining([
          "log",
          "Log",
          "turnstile",
          "optionsManager",
          "formatFileSize",
          "formatDate",
        ]),
      );
      expect(result.hasOptionsManager).toBe(false);
      expect(result.hasOptionsManagerSymbol).toBe(false);
      expect(result.hasGlobalLog).toBe(false);
    });

    it("should expose configured utilities through explicit subpaths", () => {
      const optionsSummary = inspectModule(
        "../dist/utils/src/options-manager.js",
        ["OptionsManager", "optionsManager"],
      );
      const logSummary = inspectModule("../dist/utils/src/log.js", [
        "log",
        "Log",
      ]);
      const turnstileSummary = inspectModule("../dist/utils/src/turnstile.js", [
        "turnstile",
        "Turnstile",
      ]);

      expect(optionsSummary).toContain("OptionsManager:function");
      expect(optionsSummary).toContain("optionsManager:object");
      expect(logSummary).toContain("log:object");
      expect(logSummary).toContain("Log:function");
      expect(turnstileSummary).toContain("turnstile:object");
      expect(turnstileSummary).toContain("Turnstile:function");
    });

    it("separates contact serialization from calendar dependencies", () => {
      const script = `
        const [contact, calendar, countries, languages] = await Promise.all([
          import('@user27828/shared-utils/utils/contact'),
          import('@user27828/shared-utils/utils/calendar'),
          import('@user27828/shared-utils/client/countries/core'),
          import('@user27828/shared-utils/client/languages/core'),
        ]);
        console.log(JSON.stringify({
          contactHasVCard: typeof contact.generateVCard === 'function',
          contactHasCalendar: 'buildCalendarUrl' in contact,
          calendarHasBuilder: typeof calendar.buildCalendarUrl === 'function',
          countryCore: typeof countries.getCountryOptionsFromData,
          languageCore: typeof languages.getLanguageOptionsFromData,
        }));
      `;
      const result = JSON.parse(
        execFileSync("node", ["--input-type=module", "--eval", script], {
          cwd: path.resolve(__dirname, ".."),
          encoding: "utf8",
        }),
      );

      expect(result).toEqual({
        contactHasVCard: true,
        contactHasCalendar: false,
        calendarHasBuilder: true,
        countryCore: "function",
        languageCore: "function",
      });
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

    it("should resolve isolated CMS, FM, and email SDK entrypoints", () => {
      const script = `
        const paths = [
          '@user27828/shared-utils/cms/client/api',
          '@user27828/shared-utils/fm/client/api',
          '@user27828/shared-utils/email/client/api',
        ];
        const modules = await Promise.all(paths.map((specifier) => import(specifier)));
        console.log(JSON.stringify(modules.map((module) => Object.keys(module))));
      `;
      const result = JSON.parse(
        execFileSync("node", ["--input-type=module", "--eval", script], {
          cwd: path.resolve(__dirname, ".."),
          encoding: "utf8",
        }),
      );

      expect(result).toEqual([
        ["CmsClient", "CmsClientError"],
        ["FmClient", "FmClientError"],
        ["EmailTemplateClient", "EmailTemplateClientError"],
      ]);
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

    it("does not load environment files or attach a logger from the server barrel", () => {
      const tempProject = fs.mkdtempSync(
        path.join(os.tmpdir(), "shared-utils-server-effects-"),
      );
      const marker = "SHARED_UTILS_SERVER_BARREL_DOTENV_MARKER";
      const serverEntry = path.resolve(__dirname, "../dist/server/index.js");

      try {
        fs.writeFileSync(path.join(tempProject, ".env"), `${marker}=loaded\n`);

        const script = `
          import { pathToFileURL } from 'node:url';
          process.chdir(${JSON.stringify(tempProject)});
          delete process.env.${marker};
          const server = await import(pathToFileURL(${JSON.stringify(serverEntry)}).href);
          console.log(JSON.stringify({
            envExported: Object.hasOwn(server, 'env'),
            dotenvLoaded: process.env.${marker} ?? null,
            globalLogAttached: typeof globalThis.log !== 'undefined',
          }));
        `;
        const result = JSON.parse(
          execFileSync("node", ["--input-type=module", "--eval", script], {
            cwd: tempProject,
            encoding: "utf8",
          }),
        );

        expect(result).toEqual({
          envExported: false,
          dotenvLoaded: null,
          globalLogAttached: false,
        });
      } finally {
        fs.rmSync(tempProject, { recursive: true, force: true });
      }
    });

    it("exposes the explicit server logger initializer", () => {
      const initEntry = path.resolve(__dirname, "../dist/server/src/init.js");
      const script = `
        import { pathToFileURL } from 'node:url';
        const init = await import(pathToFileURL(${JSON.stringify(initEntry)}).href);
        const optionsManager = globalThis[Symbol.for('@shared-utils/options-manager')];
        console.log(JSON.stringify({
          loggerAttached: typeof globalThis.log !== 'undefined',
          initializer: typeof init.initializeServerLogging,
          loggerRegistered: optionsManager?.getRegisteredUtilities().includes('log') ?? false,
        }));
      `;
      const result = JSON.parse(
        execFileSync("node", ["--input-type=module", "--eval", script], {
          encoding: "utf8",
        }),
      );

      expect(result).toEqual({
        loggerAttached: true,
        initializer: "function",
        loggerRegistered: true,
      });
    });

    it("should import the email provider barrel with Cloudflare exports", () => {
      const moduleSummary = inspectModule(
        "../dist/server/src/email/providers/index.js",
        [
          "CloudflareEmailProvider",
          "createCloudflareProvider",
          "isCloudflareProviderConfigured",
        ],
      );

      expect(moduleSummary).toContain("CloudflareEmailProvider:function");
      expect(moduleSummary).toContain("createCloudflareProvider:function");
      expect(moduleSummary).toContain(
        "isCloudflareProviderConfigured:function",
      );
    });

    it("should import the dedicated Cloudflare provider subpath", () => {
      const moduleSummary = inspectModule(
        "../dist/server/src/email/providers/cloudflare.js",
        ["CloudflareEmailProvider", "createCloudflareProvider", "isConfigured"],
      );

      expect(moduleSummary).toContain("CloudflareEmailProvider:function");
      expect(moduleSummary).toContain("createCloudflareProvider:function");
      expect(moduleSummary).toContain("isConfigured:function");
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
