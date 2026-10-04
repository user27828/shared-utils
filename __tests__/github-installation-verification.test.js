import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import os from "node:os";

describe("GitHub Installation Verification", () => {
  let tempDir;
  let packageTarball;

  const installedPackageRoot = () =>
    path.join(tempDir, "node_modules", "@user27828", "shared-utils");

  beforeAll(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shared-utils-test-"));
    console.log("Created temp dir:", tempDir);

    // Create tarball directly in temp directory
    packageTarball = "shared-utils.tgz";
    const tarballPath = path.join(tempDir, packageTarball);

    console.log("Creating package tarball...");
    execFileSync("yarn", ["pack", "--filename", tarballPath], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    console.log("Created tarball:", tarballPath);

    // Create a minimal package.json in temp directory
    const testPackageJson = {
      name: "test-consuming-project",
      version: "1.0.0",
      type: "module",
    };

    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(testPackageJson, null, 2),
    );
    fs.writeFileSync(
      path.join(tempDir, ".yarnrc.yml"),
      "nodeLinker: node-modules\n",
    );

    console.log("Installing package from tarball...");
    try {
      // Install the package from the tarball using yarn
      execFileSync(
        "yarn",
        ["add", `@user27828/shared-utils@file:./${packageTarball}`],
        {
          cwd: tempDir,
          stdio: "pipe",
        },
      );
      console.log("Package installed successfully");
    } catch (error) {
      console.error("Installation failed:", error.message);
      console.error("stdout:", error.stdout?.toString());
      console.error("stderr:", error.stderr?.toString());
      throw error;
    }
  });

  afterAll(() => {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("server files are present in installed package", () => {
    const packageRoot = installedPackageRoot();
    expect(fs.existsSync(packageRoot)).toBe(true);

    // Check unified dist server files
    const serverDistPath = path.join(packageRoot, "dist", "server");
    expect(fs.existsSync(serverDistPath)).toBe(true);

    const serverIndexJs = path.join(serverDistPath, "index.js");
    const serverIndexDts = path.join(serverDistPath, "index.d.ts");
    const serverInitJs = path.join(serverDistPath, "src", "init.js");
    const serverInitDts = path.join(serverDistPath, "src", "init.d.ts");
    const turnstileWorkerJs = path.join(serverDistPath, "turnstile-worker.js");
    const turnstileWorkerDts = path.join(
      serverDistPath,
      "turnstile-worker.d.ts",
    );

    expect(fs.existsSync(serverIndexJs)).toBe(true);
    expect(fs.existsSync(serverIndexDts)).toBe(true);
    expect(fs.existsSync(serverInitJs)).toBe(true);
    expect(fs.existsSync(serverInitDts)).toBe(true);
    expect(fs.existsSync(turnstileWorkerJs)).toBe(true);
    expect(fs.existsSync(turnstileWorkerDts)).toBe(true);

    // Verify file contents are not empty
    expect(fs.statSync(serverIndexJs).size).toBeGreaterThan(0);
    expect(fs.statSync(serverIndexDts).size).toBeGreaterThan(0);
    expect(fs.statSync(serverInitJs).size).toBeGreaterThan(0);
    expect(fs.statSync(serverInitDts).size).toBeGreaterThan(0);
    expect(fs.statSync(turnstileWorkerJs).size).toBeGreaterThan(0);
    expect(fs.statSync(turnstileWorkerDts).size).toBeGreaterThan(0);
  });

  test("package.json exports are correctly configured", () => {
    const packageRoot = installedPackageRoot();
    const packageJsonPath = path.join(packageRoot, "package.json");

    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Check server export
    expect(packageJson.exports["./server"]).toBeDefined();
    expect(packageJson.exports["./server"]).toEqual({
      types: "./dist/server/index.d.ts",
      "module-sync": "./dist/server/index.js",
      import: "./dist/server/index.js",
    });
    expect(packageJson.exports["./server/init"]).toEqual({
      types: "./dist/server/src/init.d.ts",
      "module-sync": "./dist/server/src/init.js",
      import: "./dist/server/src/init.js",
    });
  });

  test("can import the OptionsManager subpath", async () => {
    // Create a test file that imports the explicit options utility subpath
    const testFile = path.join(tempDir, "test-import.mjs");
    const testCode = `
import { OptionsManager } from '@user27828/shared-utils/utils/options';
console.log('Utils import successful:', typeof OptionsManager);
`;

    fs.writeFileSync(testFile, testCode);

    // Try to run the test file with yarn node (for PnP support)
    try {
      const result = execFileSync("yarn", ["node", "test-import.mjs"], {
        cwd: tempDir,
        encoding: "utf8",
        stdio: "pipe",
      });

      expect(result).toContain("Utils import successful:");
      expect(result).toContain("function");
    } catch (error) {
      console.error("Import test failed:", error.message);
      console.error("stdout:", error.stdout?.toString());
      console.error("stderr:", error.stderr?.toString());
      throw error;
    }
  });

  test("root utility entrypoints stay pure in the packed package", async () => {
    const testFile = path.join(tempDir, "test-pure-utils.mjs");
    const testCode = `
const root = await import('@user27828/shared-utils');
const utils = await import('@user27828/shared-utils/utils');
console.log(JSON.stringify({
  rootHasEmailValidator: typeof root.isValidEmail === 'function',
  utilsHasEmailValidator: typeof utils.isValidEmail === 'function',
  hasOptionsManager: Boolean(globalThis.__shared_utils_optionsManager),
  hasOptionsManagerSymbol: Boolean(globalThis[Symbol.for('@shared-utils/options-manager')]),
  hasGlobalLog: typeof globalThis.log !== 'undefined',
}));
`;

    fs.writeFileSync(testFile, testCode);
    const result = execFileSync("yarn", ["node", "test-pure-utils.mjs"], {
      cwd: tempDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(JSON.parse(result.trim())).toEqual({
      rootHasEmailValidator: true,
      utilsHasEmailValidator: true,
      hasOptionsManager: false,
      hasOptionsManagerSymbol: false,
      hasGlobalLog: false,
    });
  });

  test("client init loads its logger dependencies from the packed archive", async () => {
    const packageRoot = installedPackageRoot();
    const initEntry = path.join(
      packageRoot,
      "dist",
      "client",
      "src",
      "init.js",
    );
    const initDirectory = path.dirname(initEntry);
    const optionsManagerEntry = path.resolve(
      initDirectory,
      "../../utils/src/options-manager.js",
    );
    const loggerEntry = path.resolve(initDirectory, "../../utils/src/log.js");

    expect(fs.existsSync(initEntry)).toBe(true);
    expect(fs.existsSync(optionsManagerEntry)).toBe(true);
    expect(fs.existsSync(loggerEntry)).toBe(true);

    const testFile = path.join(tempDir, "test-client-init.mjs");
    const testCode = `
globalThis.window = globalThis;
globalThis.document = {};
globalThis.location = { hostname: 'localhost', port: '5173' };

await import('@user27828/shared-utils/client/init');

const optionsManager = globalThis[Symbol.for('@shared-utils/options-manager')];
console.log(JSON.stringify({
  logAttached: typeof globalThis.log !== 'undefined',
  logRegistered: optionsManager?.getRegisteredUtilities().includes('log') ?? false,
  telemetryDisabled: globalThis.__MUI_X_TELEMETRY_DISABLED__ === true,
}));
`;

    fs.writeFileSync(testFile, testCode);
    const result = execFileSync("yarn", ["node", "test-client-init.mjs"], {
      cwd: tempDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(JSON.parse(result.trim())).toEqual({
      logAttached: true,
      logRegistered: true,
      telemetryDisabled: true,
    });
  });

  test("server environment setup uses its explicit packed subpath", async () => {
    const testFile = path.join(tempDir, "test-server-env.mjs");
    const testCode = `
const envModule = await import('@user27828/shared-utils/server/env');
console.log(JSON.stringify({
  envLoaded: typeof envModule.default === 'object',
  getClientUrlExported: typeof envModule.getClientUrl === 'function',
  globalLogAttached: typeof globalThis.log !== 'undefined',
}));
`;

    fs.writeFileSync(testFile, testCode);
    const result = execFileSync("yarn", ["node", "test-server-env.mjs"], {
      cwd: tempDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(JSON.parse(result.trim().split(/\r?\n/).at(-1))).toEqual({
      envLoaded: true,
      getClientUrlExported: true,
      globalLogAttached: false,
    });
  });

  test("server init attaches the logger through a bare package import", async () => {
    const testFile = path.join(tempDir, "test-server-init-bare.mjs");
    const testCode = `
await import('@user27828/shared-utils/server/init');
const optionsManager = globalThis[Symbol.for('@shared-utils/options-manager')];
console.log(JSON.stringify({
  logAttached: typeof globalThis.log !== 'undefined',
  logRegistered: optionsManager?.getRegisteredUtilities().includes('log') ?? false,
}));
`;

    fs.writeFileSync(testFile, testCode);
    const result = execFileSync("yarn", ["node", "test-server-init-bare.mjs"], {
      cwd: tempDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(JSON.parse(result.trim())).toEqual({
      logAttached: true,
      logRegistered: true,
    });
  });

  test("server init value import preserves a host logger", async () => {
    const testFile = path.join(tempDir, "test-server-init-value.mjs");
    const testCode = `
const hostLogger = { info() {} };
globalThis.log = hostLogger;
const init = await import('@user27828/shared-utils/server/init');
console.log(JSON.stringify({
  hostLoggerPreserved: globalThis.log === hostLogger,
  initializerExported: typeof init.initializeServerLogging === 'function',
}));
`;

    fs.writeFileSync(testFile, testCode);
    const result = execFileSync(
      "yarn",
      ["node", "test-server-init-value.mjs"],
      {
        cwd: tempDir,
        encoding: "utf8",
        stdio: "pipe",
      },
    );

    expect(JSON.parse(result.trim())).toEqual({
      hostLoggerPreserved: true,
      initializerExported: true,
    });
  });

  test("can import turnstile worker from server", async () => {
    // Test importing the turnstile worker specifically
    const testFile = path.join(tempDir, "test-turnstile.mjs");
    const testCode = `
import { createTurnstileWorker } from '@user27828/shared-utils/server/turnstile/worker';
console.log('Turnstile worker import successful:', typeof createTurnstileWorker);
`;

    fs.writeFileSync(testFile, testCode);

    try {
      const result = execFileSync("yarn", ["node", "test-turnstile.mjs"], {
        cwd: tempDir,
        encoding: "utf8",
        stdio: "pipe",
      });

      expect(result).toContain("Turnstile worker import successful:");
      expect(result).toContain("function");
    } catch (error) {
      console.error("Turnstile import test failed:", error.message);
      console.error("stdout:", error.stdout?.toString());
      console.error("stderr:", error.stderr?.toString());
      throw error;
    }
  });

  test("server source files are included in src directory", () => {
    const packageRoot = installedPackageRoot();
    const serverSrcPath = path.join(packageRoot, "dist", "server", "src");

    expect(fs.existsSync(serverSrcPath)).toBe(true);

    // Check for turnstile subdirectory
    const turnstilePath = path.join(serverSrcPath, "turnstile");
    expect(fs.existsSync(turnstilePath)).toBe(true);

    // Check for specific files
    const files = [
      "turnstile/index.js",
      "turnstile/index.d.ts",
      "turnstile/middleware.js",
      "turnstile/middleware.d.ts",
      "turnstile/turnstile.js",
      "turnstile/turnstile.d.ts",
    ];

    files.forEach((file) => {
      const filePath = path.join(serverSrcPath, file);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.statSync(filePath).size).toBeGreaterThan(0);
    });
  });
});
