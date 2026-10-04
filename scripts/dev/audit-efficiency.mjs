#!/usr/bin/env node
/**
 * Audit published import boundaries and consumer bundle costs after `yarn build`.
 * Source is read-only; --out writes the requested JSON report. An automatically
 * cleaned temporary mirror avoids unrelated ancestor PnP manifests and links
 * the installed root/workspace dependencies needed to resolve built modules.
 * Builds stay in memory. Never install packages, invoke lifecycle scripts, or
 * import runtime modules under audit. Static closures are resolution costs, not
 * retained bytes.
 * esbuild is a root devDependency, not a consumer runtime dependency. This is a
 * diagnostic, not a budget gate.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import os from "node:os";
import ts from "typescript";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const args = process.argv.slice(2);
const usage =
  "Usage: node scripts/dev/audit-efficiency.mjs [--json] [--out <file>] [--only <fixture>] [--vite]\nRun yarn build first. --vite adds Vite library-build cross-checks. Errors in individual fixtures are reported as findings.";
let output;
let only;
let json = false;
let checkVite = false;
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--help") {
    console.log(usage);
    process.exit(0);
  } else if (arg === "--json") {
    json = true;
  } else if (arg === "--vite") {
    checkVite = true;
  } else if (
    (arg === "--out" || arg === "--only") &&
    args[i + 1] &&
    !args[i + 1].startsWith("--")
  ) {
    if (arg === "--out") {
      output = path.resolve(args[++i]);
    } else {
      only = args[++i];
    }
  } else {
    throw new Error(`Invalid argument: ${arg}\n${usage}`);
  }
}

const pkg = JSON.parse(
  await fs.readFile(path.join(root, "package.json"), "utf8"),
);
const fixtures = [
  ["root-email", "", "isValidEmail"],
  ["utils-environment", "/utils/environment", "isDev"],
  ["deep-email", "/utils/src/functions.js", "isValidEmail"],
  ["utils-filesize", "/utils/files", "formatFileSize"],
  ["client-debounce", "/client", "useDebouncedValue"],
  ["deep-debounce", "/client/debounce", "useDebouncedValue"],
  ["client-copy", "/client", "CopyButton"],
  ["deep-copy", "/client/components/CopyButton", "default"],
  ["client-languages", "/client", "getLanguageOptions"],
  ["deep-countries", "/client/countries", "getCountryOptions"],
  ["country-data-core", "/client/countries/core", "getCountryOptionsFromData"],
  ["language-data-core", "/client/languages/core", "getLanguageOptionsFromData"],
  [
    "country-selector-custom-data",
    "/client/components/form/CountrySelect/custom-data",
    "default",
  ],
  [
    "language-selector-custom-data",
    "/client/components/form/LanguageSelect/custom-data",
    "default",
  ],
  ["contact-serialization", "/utils/contact", "generateVCard"],
  ["cms-constant", "/cms", "CMS_POST_TYPES"],
  ["cms-constants", "/cms/constants", "CMS_POST_TYPES"],
  ["fm-constants", "/fm/constants", "FM_PURPOSES"],
  ["cms-schemas", "/cms/schemas", "CmsCreateRequestSchema"],
  ["cms-api", "/cms/client", "CmsClient"],
  ["cms-client-api", "/cms/client/api", "CmsClient"],
  ["cms-public-api", "/cms/client/public", "CmsClient"],
  ["fm-api", "/fm/client", "FmClient"],
  ["fm-client-api", "/fm/client/api", "FmClient"],
  ["email-client-api", "/email/client/api", "EmailTemplateClient"],
  ["tiny-editor", "/client/wysiwyg/tinymce", "TinyMceEditor"],
  ["tiny-editor-full", "/client/wysiwyg/tinymce/full", "TinyMceEditor"],
  ["ckeditor-editor", "/client/wysiwyg/ckeditor", "CKEditor5Classic"],
  ["easy-editor", "/client/wysiwyg/easymde", "EasyMDEEditor"],
  ["mdx-editor", "/client/wysiwyg/mdx", "MDXEditor"],
  ["editor-switcher", "/client/wysiwyg", "WysiwygEditor"],
  ["editor-switcher-all", "/client/wysiwyg/all", "WysiwygEditor"],
  ["cms-admin-ui", "/cms/client/ui", "CmsBodyEditor"],
];
if (only && !fixtures.some(([id]) => id === only)) {
  throw new Error(
    `Unknown fixture ${only}. Available: ${fixtures.map(([id]) => id).join(", ")}`,
  );
}

async function filesIn(dir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesIn(filename)));
    } else if (entry.isFile()) {
      files.push(filename);
    }
  }
  return files.sort();
}
const relative = (filename) =>
  path.relative(root, filename).split(path.sep).join("/");
const packageName = (specifier) =>
  specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
const builtins = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);
// Only compiler-owned workspace trees are part of the published dist contract.
const files = (await filesIn(path.join(root, "dist"))).filter((filename) =>
  /^dist\/(?:utils|client|server)\//.test(relative(filename)),
);
const modules = new Map();
const imports = new Map();
const duplicates = new Map();
const totals = {};
for (const filename of files) {
  const content = await fs.readFile(filename);
  const rel = relative(filename);
  const kind = rel.endsWith(".d.ts.map")
    ? "declarationMap"
    : rel.endsWith(".d.ts")
      ? "declaration"
      : rel.endsWith(".js.map")
        ? "sourceMap"
        : rel.endsWith(".js")
          ? "javascript"
          : "other";
  totals[kind] ??= { files: 0, bytes: 0 };
  totals[kind].files += 1;
  totals[kind].bytes += content.length;
  if (kind !== "javascript") {
    continue;
  }
  const hash = createHash("sha256").update(content).digest("hex");
  const group = duplicates.get(hash) ?? { bytes: content.length, paths: [] };
  group.paths.push(rel);
  duplicates.set(hash, group);
  const ast = ts.createSourceFile(
    filename,
    content.toString(),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const edges = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      edges.push({ specifier: node.moduleSpecifier.text, dynamic: false });
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      edges.push({
        specifier: node.arguments[0].text,
        dynamic: node.expression.kind === ts.SyntaxKind.ImportKeyword,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  modules.set(filename, edges);
  for (const edge of edges) {
    if (
      !edge.specifier.startsWith(".") &&
      !edge.specifier.startsWith("/") &&
      !builtins.has(edge.specifier)
    ) {
      const name = packageName(edge.specifier);
      const consumers = imports.get(name) ?? new Set();
      consumers.add(rel);
      imports.set(name, consumers);
    }
  }
}

function closure(filename) {
  const seen = new Set();
  const packages = new Set();
  const unresolved = [];
  const dynamicImports = [];
  const queue = [filename];
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    for (const edge of modules.get(current) ?? []) {
      if (edge.dynamic) {
        dynamicImports.push({
          from: relative(current),
          specifier: edge.specifier,
        });
        continue;
      }
      if (edge.specifier.startsWith(".")) {
        const target = path.resolve(path.dirname(current), edge.specifier);
        if (modules.has(target)) {
          queue.push(target);
        } else {
          unresolved.push({
            from: relative(current),
            specifier: edge.specifier,
          });
        }
      } else if (!builtins.has(edge.specifier)) {
        packages.add(packageName(edge.specifier));
      }
    }
  }
  return {
    moduleCount: seen.size,
    modules: [...seen].map(relative).sort(),
    packages: [...packages].sort(),
    dynamicImports,
    unresolved,
  };
}
const exports = [];
for (const [subpath, conditions] of Object.entries(pkg.exports)) {
  if (subpath.includes("*")) {
    continue;
  }
  const target =
    typeof conditions === "string"
      ? conditions
      : (conditions.import ?? conditions.default);
  const typesTarget =
    typeof conditions === "string" ? null : (conditions.types ?? null);
  const filename = path.resolve(root, target);
  let typesExist = null;
  if (typesTarget) {
    try {
      await fs.access(path.resolve(root, typesTarget));
      typesExist = true;
    } catch {
      typesExist = false;
    }
  }
  exports.push({
    subpath,
    target,
    exists: modules.has(filename),
    typesTarget,
    typesExist,
    ...closure(filename),
  });
}
const dependencyInventory = [...imports]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, consumers]) => ({
    name,
    declaration:
      name === pkg.name
        ? "self"
        : pkg.dependencies?.[name]
          ? "dependency"
          : pkg.peerDependencies?.[name]
            ? "peer"
            : pkg.optionalDependencies?.[name]
              ? "optionalDependency"
              : "UNDECLARED",
    optionalPeer: Boolean(pkg.peerDependenciesMeta?.[name]?.optional),
    importedBy: [...consumers].sort(),
    productionImportedBy: [...consumers]
      .filter((name) => !/(?:__tests__|\.test\.|\.spec\.)/.test(name))
      .sort(),
  }));

let esbuild;
try {
  esbuild = await import("esbuild");
} catch {
  throw new Error(
    "esbuild is unavailable. This audit needs a declared root esbuild devDependency; do not install it into consumer dependencies.",
  );
}
const bundles = [];
const viteBundles = [];
const editorFamilies = ["tinymce", "ckeditor", "easymde", "mdx", "prism"];
const editorPolicies = {
  "tiny-editor": { allow: ["tinymce"], require: ["tinymce"] },
  "tiny-editor-full": {
    allow: ["tinymce", "prism"],
    require: ["tinymce", "prism"],
  },
  "ckeditor-editor": { allow: ["ckeditor"], require: ["ckeditor"] },
  "easy-editor": { allow: ["easymde"], require: ["easymde"] },
  "mdx-editor": { allow: ["mdx"], require: ["mdx"] },
  "editor-switcher": { allow: [], require: [] },
  "editor-switcher-all": {
    allow: ["tinymce", "ckeditor", "easymde", "mdx", "prism"],
    require: ["tinymce", "ckeditor", "easymde", "mdx"],
  },
  "cms-admin-ui": { allow: [], require: [] },
};
function editorFamily(identifier) {
  const value = identifier.toLowerCase().replaceAll("\\", "/");
  if (value.includes("prism")) {
    return "prism";
  }
  if (value.includes("tinymce") || value.includes("@tinymce/")) {
    return "tinymce";
  }
  if (value.includes("ckeditor") || value.includes("@ckeditor/")) {
    return "ckeditor";
  }
  if (value.includes("easymde")) {
    return "easymde";
  }
  if (value.includes("mdxeditor") || value.includes("@mdxeditor/")) {
    return "mdx";
  }
  return null;
}
function editorBoundaryPlugin(id, bundler) {
  const allowed = editorPolicies[id]?.allow ?? editorFamilies;
  const excluded = new Set(
    editorFamilies.filter((family) => !allowed.includes(family)),
  );
  const reject = (identifier) => {
    const family = editorFamily(identifier);
    if (family && excluded.has(family)) {
      return `${id} resolved unselected ${family} module: ${identifier}`;
    }
    return null;
  };
  if (bundler === "esbuild") {
    return {
      name: `editor-boundary-${id}`,
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          const error = reject(args.path);
          return error ? { errors: [{ text: error }] } : undefined;
        });
      },
    };
  }
  return {
    name: `editor-boundary-${id}`,
    enforce: "pre",
    resolveId(source) {
      const error = reject(source);
      return error ? this.error(error) : null;
    },
  };
}
// Check resolution before tree-shaking: discarded imports still require peers.
const contractPolicies = {
  "root-email": [
    "date-fns",
    "date-fns-tz",
    "client/src/data/countries.js",
    "client/src/data/languages.js",
  ],
  "utils-environment": [
    "client/src/data/countries.js",
    "client/src/data/languages.js",
  ],
  "deep-debounce": [
    "client/src/data/countries.js",
    "client/src/data/languages.js",
  ],
  "cms-client-api": [
    "client/src/data/countries.js",
    "client/src/data/languages.js",
  ],
  "fm-client-api": [
    "client/src/data/countries.js",
    "client/src/data/languages.js",
  ],
  "email-client-api": [
    "client/src/data/countries.js",
    "client/src/data/languages.js",
  ],
  "country-data-core": ["client/src/data/countries.js"],
  "language-data-core": ["client/src/data/languages.js"],
  "country-selector-custom-data": ["client/src/data/countries.js"],
  "language-selector-custom-data": ["client/src/data/languages.js"],
  "contact-serialization": ["date-fns", "date-fns-tz"],
  "cms-constant": ["bcryptjs", "sanitize-html", "marked"],
  "cms-constants": ["zod", "bcryptjs", "sanitize-html", "marked"],
  "fm-constants": ["zod", "bcryptjs", "sanitize-html", "marked"],
  "cms-schemas": ["bcryptjs", "sanitize-html", "marked"],
};
function contractBoundaryPlugin(id, bundler) {
  const reject = (identifier) => {
    const normalized = identifier.replaceAll("\\", "/");
    const excluded = contractPolicies[id]?.find((name) => {
      if (name.includes("/")) {
        return normalized.includes(name);
      }
      return (
        normalized === name ||
        normalized.startsWith(`${name}/`) ||
        normalized.includes(`/node_modules/${name}/`)
      );
    });
    return excluded
      ? `${id} resolved excluded ${excluded}: ${identifier}`
      : null;
  };
  if (bundler === "esbuild") {
    return {
      name: `contract-boundary-${id}`,
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          const error = reject(args.path);
          return error ? { errors: [{ text: error }] } : undefined;
        });
      },
    };
  }
  return {
    name: `contract-boundary-${id}`,
    enforce: "pre",
    resolveId(source) {
      const error = reject(source);
      return error ? this.error(error) : null;
    },
  };
}
const staging = await fs.mkdtemp(
  path.join(os.tmpdir(), "shared-utils-efficiency-"),
);
try {
  await fs.cp(path.join(root, "dist"), path.join(staging, "dist"), {
    recursive: true,
  });
  await fs.copyFile(
    path.join(root, "package.json"),
    path.join(staging, "package.json"),
  );
  await fs.symlink(
    path.join(root, "node_modules"),
    path.join(staging, "node_modules"),
    "dir",
  );
  for (const workspace of ["utils", "client", "server"]) {
    const workspaceNodeModules = path.join(root, workspace, "node_modules");
    try {
      await fs.access(workspaceNodeModules);
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    await fs.symlink(
      workspaceNodeModules,
      path.join(staging, "dist", workspace, "node_modules"),
      "dir",
    );
  }
  for (const [id, subpath, name] of fixtures) {
    if (only && id !== only) {
      continue;
    }
    const start = performance.now();
    try {
      const result = await esbuild.build({
        stdin: {
          contents: `import { ${name === "default" ? "default as value" : `${name} as value`} } from ${JSON.stringify(pkg.name + subpath)}; globalThis.__efficiencyFixture = value;`,
          resolveDir: staging,
          sourcefile: `${id}.js`,
        },
        absWorkingDir: staging,
        preserveSymlinks: true,
        bundle: true,
        minify: true,
        treeShaking: true,
        metafile: true,
        write: false,
        platform: "browser",
        format: "esm",
        target: "es2020",
        splitting: true,
        outdir: path.join(staging, ".efficiency-in-memory", id),
        external: ["react", "react/*", "react-dom", "react-dom/*"],
        define: { "process.env.NODE_ENV": '"production"' },
        loader: {
          ".woff": "file",
          ".woff2": "file",
          ".ttf": "file",
          ".svg": "file",
          ".png": "file",
          ".gif": "file",
        },
        plugins: [
          editorBoundaryPlugin(id, "esbuild"),
          contractBoundaryPlugin(id, "esbuild"),
        ],
        logLevel: "silent",
      });
      const contributing = new Map();
      for (const details of Object.values(result.metafile.outputs)) {
        for (const [input, info] of Object.entries(details.inputs)) {
          if (info.bytesInOutput > 0) {
            contributing.set(
              input,
              (contributing.get(input) ?? 0) + info.bytesInOutput,
            );
          }
        }
      }
      const outputFiles = result.outputFiles.map((file) => {
        const metadata =
          result.metafile.outputs[
            path.relative(staging, file.path).split(path.sep).join("/")
          ];
        return {
          name: path.basename(file.path),
          bytes: file.contents.length,
          gzipBytes: gzipSync(file.contents, { level: 9 }).length,
          entryPoint: metadata?.entryPoint ?? null,
        };
      });
      const fixtureEntry = Object.keys(result.metafile.outputs).find(
        (name) => result.metafile.outputs[name].entryPoint === `${id}.js`,
      );
      function outputClosure(includeDynamic) {
        const seen = new Set();
        const queue = fixtureEntry ? [fixtureEntry] : [];
        for (let i = 0; i < queue.length; i += 1) {
          const name = queue[i];
          if (seen.has(name) || !result.metafile.outputs[name]) {
            continue;
          }
          seen.add(name);
          const metadata = result.metafile.outputs[name];
          if (metadata.cssBundle) {
            queue.push(metadata.cssBundle);
          }
          for (const edge of metadata.imports) {
            if (
              !edge.external &&
              (includeDynamic || edge.kind !== "dynamic-import")
            ) {
              queue.push(edge.path);
            }
          }
        }
        return {
          files: seen.size,
          bytes: [...seen].reduce(
            (sum, name) => sum + result.metafile.outputs[name].bytes,
            0,
          ),
        };
      }
      bundles.push({
        id,
        status: "ok",
        elapsedMs: Math.round(performance.now() - start),
        inputModules: Object.keys(result.metafile.inputs).length,
        totalBytes: outputFiles.reduce((sum, file) => sum + file.bytes, 0),
        totalGzipBytes: outputFiles.reduce(
          (sum, file) => sum + file.gzipBytes,
          0,
        ),
        outputFiles,
        initialOutput: outputClosure(false),
        reachableOutput: outputClosure(true),
        contributingModules: [...contributing]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, bytes]) => ({ name, bytes })),
        warnings: result.warnings.map(({ text, location }) => ({
          text,
          file: location?.file ?? null,
        })),
      });
    } catch (error) {
      bundles.push({
        id,
        status: "error",
        elapsedMs: Math.round(performance.now() - start),
        errors: error.errors?.map(({ text, location }) => ({
          text,
          file: location?.file ?? null,
        })) ?? [{ text: error.message }],
      });
    }
  }
  if (checkVite) {
    const vite = await import("vite");
    for (const [id, subpath, name] of fixtures) {
      if (only && id !== only) {
        continue;
      }
      const entry = path.join(staging, `${id}.js`);
      await fs.writeFile(
        entry,
        `import { ${name === "default" ? "default as value" : `${name} as value`} } from ${JSON.stringify(pkg.name + subpath)}; globalThis.__efficiencyFixture = value;`,
      );
      try {
        const result = await vite.build({
          root: staging,
          configFile: false,
          logLevel: "silent",
          resolve: { preserveSymlinks: true },
          plugins: [
            editorBoundaryPlugin(id, "vite"),
            contractBoundaryPlugin(id, "vite"),
          ],
          build: {
            write: false,
            minify: true,
            lib: { entry, formats: ["es"], fileName: id },
            rolldownOptions: {
              external: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/],
            },
          },
        });
        const outputs = (Array.isArray(result) ? result : [result]).flatMap(
          (item) => item.output,
        );
        const outputFiles = outputs.map((item) => {
          const content = item.type === "chunk" ? item.code : item.source;
          return {
            name: item.fileName,
            bytes: Buffer.byteLength(content),
            gzipBytes: gzipSync(content, { level: 9 }).length,
            entry: item.type === "chunk" && item.isEntry,
            imports: item.type === "chunk" ? item.imports : [],
            dynamicImports: item.type === "chunk" ? item.dynamicImports : [],
            modules:
              item.type === "chunk" ? Object.keys(item.modules ?? {}) : [],
          };
        });
        viteBundles.push({
          id,
          status: "ok",
          viteVersion: vite.version,
          totalBytes: outputFiles.reduce((sum, file) => sum + file.bytes, 0),
          outputFiles,
        });
      } catch (error) {
        viteBundles.push({ id, status: "error", error: error.message });
      }
    }
  }
} finally {
  await fs.rm(staging, { recursive: true, force: true });
}
const editorBoundaries = Object.entries(editorPolicies)
  .filter(([id]) => !only || id === only)
  .map(([id, policy]) => {
    const bundle = bundles.find((item) => item.id === id);
    const viteBundle = viteBundles.find((item) => item.id === id);
    const identifiers = [
      ...(bundle?.status === "ok"
        ? bundle.contributingModules.map(({ name }) => name)
        : []),
      ...(viteBundle?.status === "ok"
        ? viteBundle.outputFiles.flatMap((file) => [
            ...file.modules,
            ...file.imports,
            ...file.dynamicImports,
          ])
        : []),
    ];
    const observed = [
      ...new Set(identifiers.map(editorFamily).filter(Boolean)),
    ];
    const excluded = editorFamilies.filter(
      (family) => !policy.allow.includes(family),
    );
    const violations = observed.filter((family) => excluded.includes(family));
    const missing = policy.require.filter(
      (family) => !observed.includes(family),
    );
    const buildErrors = [
      ...(bundle?.status === "error"
        ? [`esbuild: ${bundle.errors[0]?.text ?? "fixture failed"}`]
        : []),
      ...(checkVite && viteBundle?.status === "error"
        ? [`vite: ${viteBundle.error}`]
        : []),
    ];
    return {
      id,
      status:
        violations.length === 0 &&
        missing.length === 0 &&
        buildErrors.length === 0
          ? "ok"
          : "error",
      allowed: policy.allow,
      required: policy.require,
      observed,
      violations,
      missing,
      buildErrors,
    };
  });
const editorBoundaryFailures = editorBoundaries.filter(
  ({ status }) => status !== "ok",
);
if (editorBoundaryFailures.length > 0) {
  process.exitCode = 1;
}
const contractBoundaries = Object.entries(contractPolicies)
  .filter(([id]) => !only || id === only)
  .map(([id, excluded]) => {
    const bundle = bundles.find((item) => item.id === id);
    const viteBundle = viteBundles.find((item) => item.id === id);
    return {
      id,
      excluded,
      status:
        bundle?.status === "ok" && (!checkVite || viteBundle?.status === "ok")
          ? "ok"
          : "error",
    };
  });
if (contractBoundaries.some(({ status }) => status !== "ok")) {
  process.exitCode = 1;
}
const report = {
  schemaVersion: 1,
  packageVersion: pkg.version,
  nodeVersion: process.version,
  esbuildVersion: esbuild.version,
  methodology:
    "Freshly built dist mirrored in a cleaned temporary directory, native public package self-reference, checkout node_modules symlink with preserveSymlinks to avoid ancestor PnP interference. Minified browser ESM, React/ReactDOM external, splitting enabled, gzip level 9 per file. Total bytes include lazy chunks and assets; elapsedMs is a single diagnostic sample, not a benchmark. Static module closures exclude dynamic edges and do not imply retained code. Editor fixtures run resolver guards that fail if an unselected engine or Prism module is touched. Root manifest is the published dependency contract. Hoisted deps are available here; run packed isolated consumers separately.",
  dist: {
    totals,
    testArtifacts: files
      .map(relative)
      .filter((name) => /(?:__tests__|\.test\.|\.spec\.)/.test(name)),
    duplicateJavascript: [...duplicates.values()]
      .filter(({ paths, bytes }) => paths.length > 1 && bytes > 256)
      .sort(
        (a, b) =>
          b.bytes * (b.paths.length - 1) - a.bytes * (a.paths.length - 1),
      ),
  },
  dependencyInventory,
  exports,
  bundles,
  viteBundles,
  editorBoundaries,
  contractBoundaries,
};
if (output) {
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
}
if (json) {
  console.log(JSON.stringify(report));
} else {
  console.log(
    `shared-utils ${pkg.version}; esbuild ${esbuild.version}; React external; bytes include all chunks`,
  );
  for (const bundle of viteBundles) {
    console.log(
      bundle.status === "ok"
        ? `vite ${bundle.id}: ${bundle.totalBytes} emitted bytes, ${bundle.outputFiles.length} outputs`
        : `vite ${bundle.id}: ERROR: ${bundle.error}`,
    );
  }
  for (const bundle of bundles) {
    console.log(
      bundle.status === "ok"
        ? `${bundle.id}: ${bundle.initialOutput.bytes} initial, ${bundle.reachableOutput.bytes} reachable, ${bundle.totalBytes} emitted bytes, ${bundle.totalGzipBytes} emitted gzip, ${bundle.inputModules} inputs`
        : `${bundle.id}: ERROR (${bundle.errors.length}): ${bundle.errors
            .slice(0, 3)
            .map(({ text }) => text)
            .join("; ")}`,
    );
  }
  for (const boundary of editorBoundaries) {
    console.log(
      `${boundary.status === "ok" ? "editor boundary" : "EDITOR BOUNDARY ERROR"} ${boundary.id}: ${boundary.observed.join(", ") || "no engine modules"}`,
    );
    for (const failure of [
      ...boundary.violations,
      ...boundary.missing,
      ...boundary.buildErrors,
    ]) {
      console.log(`  ${failure}`);
    }
  }
  console.log(
    `Undeclared runtime imports: ${
      dependencyInventory
        .filter(({ declaration }) => declaration === "UNDECLARED")
        .filter(({ productionImportedBy }) => productionImportedBy.length > 0)
        .map(({ name }) => name)
        .join(", ") || "none"
    }`,
  );
  console.log(
    `Shipped test artifacts in dist: ${report.dist.testArtifacts.length}`,
  );
  if (output) {
    console.log(`Report: ${output}`);
  }
}
