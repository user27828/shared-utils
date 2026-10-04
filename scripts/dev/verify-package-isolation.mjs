#!/usr/bin/env node
/** Verify release artifacts and real feature-only Yarn installs. No workspace aliases. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { builtinModules } from "node:module";
import ts from "typescript";
import { missingArtifacts } from "../artifact-contract.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "package.json"), "utf8"),
);
const reactPeers = ["react", "react-dom"];
const muiPeers = [
  ...reactPeers,
  "@mui/material",
  "@mui/icons-material",
  "@emotion/react",
  "@emotion/styled",
];
const fixtures = {
  pure: {
    entries: [""],
    probe:
      "assert.equal(modules[0].isValidEmail('a@example.com'), true); assert.equal(globalThis.log, undefined);",
  },
  debounce: { entries: ["client/debounce"], peers: reactPeers, browser: true },
  copy: {
    entries: ["client/components/CopyButton"],
    peers: muiPeers,
    browser: true,
  },
  sdk: {
    entries: ["cms/client/api", "fm/client/api", "email/client/api"],
    browser: true,
  },
  contracts: { entries: ["cms", "fm", "cms/constants", "fm/constants"] },
  public: { entries: ["cms/client/public"], peers: muiPeers, browser: true },
  local: {
    entries: ["fm/server/storage", "fm/server/core"],
    nodeTypes: true,
    probe: `
    const storage = await modules[0].createFmStorage({provider:'local', dataRootPath:process.cwd(), uploadRootPath:'uploads'});
    assert.equal(storage.getProvider(), 'local');
    await assert.rejects(modules[0].createFmStorage({provider:'s3', s3Endpoint:'https://s3.example.com', s3AccessKeyId:'test', s3SecretAccessKey:'test'}), error => error.code === 'FM_VALIDATION');
  `,
  },
  memory: {
    entries: ["cms/server/rate-limiter"],
    nodeTypes: true,
    devPeers: ["@types/express"],
    probe: `
    const limiter = new modules[0].CmsRateLimiter();
    try { assert.equal((await limiter.checkLimit('key', {maxRequests:1, windowMs:1000})).allowed, true); }
    finally { limiter.cleanup(); }
  `,
  },
  s3: {
    entries: ["fm/server/s3"],
    peers: ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner"],
    nodeTypes: true,
  },
  redis: {
    entries: ["cms/server/redis"],
    peers: ["ioredis"],
    nodeTypes: true,
    devPeers: ["@types/express"],
  },
  gmail: {
    entries: ["email/server/providers/gmail"],
    peers: ["nodemailer"],
    nodeTypes: true,
  },
  ses: {
    entries: ["email/server/providers/ses"],
    peers: ["@aws-sdk/client-sesv2"],
    nodeTypes: true,
  },
  http: {
    entries: [
      "email/server/providers/resend",
      "email/server/providers/cloudflare",
      "email/server/providers/_test_",
      "email/server/registry",
    ],
    nodeTypes: true,
  },
  cms: {
    entries: ["cms/server/core"],
    peers: ["bcryptjs", "sanitize-html", "marked"],
    nodeTypes: true,
    devPeers: ["@types/sanitize-html"],
  },
  env: {
    entries: ["server/env"],
    peers: ["dotenv", "dotenv-expand"],
    nodeTypes: true,
    probe:
      "assert.ok(globalThis[Symbol.for('@shared-utils/options-manager')]);",
  },
  worker: {
    entries: ["server/turnstile/worker"],
    probe:
      "assert.equal(typeof modules[0].createTurnstileWorker().fetch, 'function');",
  },
};
const usage = `Usage: node scripts/dev/verify-package-isolation.mjs [--tarball <file>] [--out <json>] [--only <fixture>] [--samples <n>] [--cold-cache]\nFixtures: ${Object.keys(fixtures).join(", ")}\nInstalls into new temporary projects. Default: shared download cache, one sample. --cold-cache uses an empty download cache for each sample and needs registry access. Times are install measurements, not browser or startup benchmarks.`;
let tarball,
  output,
  only,
  coldCache = false,
  samples = 1;
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === "--help") {
    console.log(usage);
    process.exit(0);
  }
  if (arg === "--cold-cache") {
    coldCache = true;
    continue;
  }
  if (
    !["--tarball", "--out", "--only", "--samples"].includes(arg) ||
    !process.argv[i + 1] ||
    process.argv[i + 1].startsWith("--")
  ) {
    throw new Error(`Invalid argument: ${arg}\n${usage}`);
  }
  const value = process.argv[++i];
  if (arg === "--tarball") {
    tarball = path.resolve(value);
  }
  if (arg === "--out") {
    output = path.resolve(value);
  }
  if (arg === "--only") {
    only = value;
  }
  if (arg === "--samples") {
    samples = Number(value);
  }
}
assert.ok(
  Number.isInteger(samples) && samples >= 1 && samples <= 10,
  "samples must be between 1 and 10",
);
assert.ok(!only || fixtures[only], `Unknown fixture: ${only}`);
const staging = await fs.mkdtemp(
  path.join(os.tmpdir(), "shared-utils-package-isolation-"),
);
const run = (command, args, cwd = staging) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
const builtins = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);
const packageName = (specifier) =>
  specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
const packagePath = (project, name) => path.join(project, "node_modules", name);
async function filesIn(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesIn(file)));
    } else if (entry.isFile()) {
      files.push(file);
    }
  }
  return files;
}
async function packageCount(directory) {
  let count = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }
    if (entry.name.startsWith("@")) {
      count += (await fs.readdir(path.join(directory, entry.name))).length;
    } else {
      count += 1;
    }
  }
  return count;
}
try {
  if (!tarball) {
    tarball = path.join(staging, "package.tgz");
    run("yarn", ["pack", "--out", tarball], root);
  }
  const extracted = path.join(staging, "archive");
  await fs.mkdir(extracted);
  run("tar", ["-xzf", tarball, "--strip-components=1", "-C", extracted]);
  const packed = JSON.parse(
    await fs.readFile(path.join(extracted, "package.json"), "utf8"),
  );
  assert.deepEqual(
    missingArtifacts(extracted, packed),
    [],
    "dangling export/bin targets",
  );
  assert.deepEqual(Object.keys(packed.dependencies).sort(), [
    "lodash-es",
    "nanoid",
    "zod",
  ]);
  assert.equal(packed.optionalDependencies, undefined);
  for (const peer of Object.keys(packed.peerDependencies)) {
    assert.equal(packed.peerDependenciesMeta[peer]?.optional, true, peer);
  }
  const files = await filesIn(extracted);
  let unpackedBytes = 0;
  const packagedSet = new Set(
    files.map((file) =>
      path.relative(extracted, file).split(path.sep).join("/"),
    ),
  );
  for (const file of files) {
    const relative = path.relative(extracted, file).split(path.sep).join("/");
    assert.ok(
      !/(^|\/)__tests__\/|\.(test|spec)\.|^scripts\/dev\/|\.d\.ts\.map$|tsbuildinfo$/.test(
        relative,
      ),
      `Nonproduction file: ${relative}`,
    );
    const content = await fs.readFile(file);
    unpackedBytes += content.length;
    if (relative.endsWith(".js.map")) {
      const map = JSON.parse(content);
      assert.ok(
        map.sourcesContent?.length === map.sources.length &&
          map.sourcesContent.every((value) => typeof value === "string"),
        `Unavailable map sources: ${relative}`,
      );
    }
    if (!/\.(js|mjs|cjs|d\.ts)$/.test(relative)) {
      continue;
    }
    const isTypes = relative.endsWith(".d.ts");
    const ast = ts.createSourceFile(
      file,
      content.toString(),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    function checkReference(specifier) {
      if (specifier.startsWith(".")) {
        const resolved = path.posix.normalize(
          path.posix.join(path.posix.dirname(relative), specifier),
        );
        const candidates = isTypes
          ? [resolved, resolved.replace(/\.js$/, ".d.ts"), `${resolved}.d.ts`]
          : [resolved];
        assert.ok(
          candidates.some((target) => packagedSet.has(target)),
          `Dangling relative reference: ${relative} -> ${specifier}`,
        );
      } else if (
        !builtins.has(specifier) &&
        !specifier.startsWith("node:") &&
        !specifier.startsWith(packed.name)
      ) {
        const name = packageName(specifier);
        assert.ok(
          packed.dependencies[name] || packed.peerDependencies[name],
          `Undeclared runtime/type package: ${relative} -> ${name}`,
        );
        assert.ok(
          !/^(jest|vitest|@jest\/|@testing-library\/)/.test(name),
          `Test framework import: ${relative}`,
        );
      }
    }
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        checkReference(node.moduleSpecifier.text);
      }
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        checkReference(node.arguments[0].text);
      }
      if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        checkReference(node.argument.literal.text);
      }
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "URL" &&
        node.arguments?.[0] &&
        ts.isStringLiteral(node.arguments[0]) &&
        node.arguments[1]?.getText(ast) === "import.meta.url"
      ) {
        checkReference(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  const archive = {
    files: files.length,
    compressedBytes: (await fs.stat(tarball)).size,
    unpackedBytes,
    checks:
      "exports/bin, runtime/declaration/worker references, no tests/dev scripts/dangling maps",
  };
  const results = [];
  const esbuild = await import("esbuild");
  const vite = await import("vite");
  const tsc = path.join(root, "node_modules/typescript/bin/tsc");
  const metadata = Object.assign(
    {},
    manifest.devDependencies,
    ...(await Promise.all(
      ["client", "server", "utils"].map(
        async (workspace) =>
          JSON.parse(
            await fs.readFile(
              path.join(root, workspace, "package.json"),
              "utf8",
            ),
          ).devDependencies,
      ),
    )),
  );
  for (const [name, fixture] of Object.entries(fixtures).filter(
    ([name]) => !only || name === only,
  )) {
    const timings = [];
    let installedCount;
    for (let sample = 0; sample < samples; sample += 1) {
      console.log(`Verifying ${name} (${sample + 1}/${samples})...`);
      const project = path.join(staging, `${name}-${sample}`);
      await fs.mkdir(project);
      const peers = fixture.peers ?? [];
      const devPeers = [
        ...(fixture.devPeers ?? []),
        ...(fixture.nodeTypes ? ["@types/node"] : []),
        ...(peers.includes("react")
          ? ["@types/react", "@types/react-dom"]
          : []),
      ];
      await fs.writeFile(
        path.join(project, "package.json"),
        JSON.stringify({
          private: true,
          type: "module",
          packageManager: manifest.packageManager,
          dependencies: {
            [packed.name]: `file:${tarball}`,
            ...Object.fromEntries(
              peers.map((peer) => [
                peer,
                metadata[peer] ?? packed.peerDependencies[peer],
              ]),
            ),
          },
          devDependencies: Object.fromEntries(
            devPeers.map((peer) => [peer, metadata[peer]]),
          ),
        }),
      );
      await fs.copyFile(
        path.join(root, "yarn.lock"),
        path.join(project, "yarn.lock"),
      );
      const cache = coldCache
        ? path.join(project, ".yarn/cache")
        : path.join(root, ".yarn/cache");
      await fs.writeFile(
        path.join(project, ".yarnrc.yml"),
        `nodeLinker: node-modules\nenableGlobalCache: false\ncacheFolder: ${cache}\n`,
      );
      const start = performance.now();
      run("yarn", ["install", "--mode=skip-build"], project);
      timings.push(performance.now() - start);
      assert.equal(
        await fs.realpath(packagePath(project, packed.name)),
        packagePath(project, packed.name),
      );
      for (const peer of Object.keys(packed.peerDependencies).filter(
        (peer) => !peers.includes(peer),
      )) {
        // Transitive peers may be legitimately installed by the selected vendor.
        if (
          [
            "pure",
            "sdk",
            "local",
            "contracts",
            "worker",
            "debounce",
            "memory",
          ].includes(name)
        ) {
          await assert.rejects(
            fs.access(packagePath(project, peer)),
            (error) => error.code === "ENOENT",
            `Unexpected integration installed: ${peer}`,
          );
        }
      }
      installedCount = await packageCount(path.join(project, "node_modules"));
      const imports = fixture.entries.map(
        (entry) => `${packed.name}${entry ? "/" + entry : ""}`,
      );
      const entry = imports
        .map(
          (specifier, index) =>
            `import * as entry${index} from ${JSON.stringify(specifier)};\nObject.assign(globalThis, { entry${index} });`,
        )
        .join("\n");
      await fs.writeFile(path.join(project, "entry.ts"), entry);
      for (const [module, moduleResolution] of [
        ["NodeNext", "NodeNext"],
        ["ESNext", "Bundler"],
      ]) {
        await fs.writeFile(
          path.join(project, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              noEmit: true,
              strict: true,
              skipLibCheck: false,
              target: "ES2022",
              module,
              moduleResolution,
              esModuleInterop: true,
              types: devPeers
                .filter((peer) => peer.startsWith("@types/"))
                .map((peer) => peer.slice(7)),
            },
            files: ["entry.ts"],
          }),
        );
        run(process.execPath, [tsc, "--project", "tsconfig.json"], project);
      }
      if (fixture.browser) {
        await esbuild.build({
          absWorkingDir: project,
          entryPoints: ["entry.ts"],
          bundle: true,
          format: "esm",
          platform: "browser",
          splitting: true,
          outdir: path.join(project, "esbuild"),
          write: false,
          logLevel: "silent",
        });
        await vite.build({
          root: project,
          configFile: false,
          logLevel: "error",
          build: {
            outDir: path.join(project, "vite"),
            lib: { entry: path.join(project, "entry.ts"), formats: ["es"] },
          },
        });
      } else {
        await fs.writeFile(
          path.join(project, "probe.mjs"),
          `import assert from 'node:assert/strict';\nconst modules = await Promise.all(${JSON.stringify(imports)}.map(entry=>import(entry)));\n${fixture.probe ?? ""}`,
        );
        run(process.execPath, ["probe.mjs"], project);
        await esbuild.build({
          absWorkingDir: project,
          entryPoints: ["entry.ts"],
          bundle: true,
          format: "esm",
          platform: "node",
          outdir: path.join(project, "esbuild"),
          write: false,
          logLevel: "silent",
        });
      }
      if (name === "worker") {
        run(
          "bash",
          [
            path.join(
              packagePath(project, packed.name),
              "scripts/setup-turnstile-worker.sh",
            ),
            "--name",
            "fixture-worker",
          ],
          project,
        );
        assert.ok(
          (
            await fs.readFile(
              path.join(project, "workers/turnstile/turnstile-worker.js"),
              "utf8",
            )
          ).includes("/server/turnstile/worker"),
        );
        await esbuild.build({
          absWorkingDir: project,
          entryPoints: ["workers/turnstile/turnstile-worker.js"],
          bundle: true,
          format: "esm",
          platform: "browser",
          write: false,
          logLevel: "silent",
        });
        for (const [bin, target] of Object.entries(packed.bin)) {
          const full = path.join(packagePath(project, packed.name), target);
          assert.ok(
            (await fs.stat(full)).mode & 0o111,
            `Nonexecutable bin: ${bin}`,
          );
          if (target.endsWith(".sh")) {
            run("bash", ["-n", full], project);
          } else {
            run(process.execPath, ["--check", full], project);
          }
        }
        run(
          process.execPath,
          [
            path.join(
              packagePath(project, packed.name),
              "scripts/ensure-dist.js",
            ),
          ],
          project,
        );
        run(
          process.execPath,
          [
            path.join(
              packagePath(project, packed.name),
              "scripts/package-upgrade.mjs",
            ),
            "--help",
          ],
          project,
        );
      }
    }
    results.push({
      fixture: name,
      peers: fixture.peers ?? [],
      installedPackages: installedCount,
      installMs: timings,
      cache: coldCache
        ? "empty download cache per sample"
        : "shared warm download cache",
      declarations: ["NodeNext", "Bundler"],
      bundles: fixture.browser
        ? ["esbuild", "Vite"]
        : ["native Node", "esbuild Node"],
    });
  }
  const report = { archive, results };
  if (output) {
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await fs.rm(staging, { recursive: true, force: true });
}
