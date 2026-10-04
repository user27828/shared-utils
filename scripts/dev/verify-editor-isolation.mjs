#!/usr/bin/env node
/**
 * Build each editor entry from an installed package archive with only that
 * editor's documented peers installed. Uses isolated temporary Yarn projects;
 * no checkout aliases or workspace node_modules are visible to the builds.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const packageMetadata = JSON.parse(
  await fs.readFile(path.join(root, "package.json"), "utf8"),
);
const clientMetadata = JSON.parse(
  await fs.readFile(path.join(root, "client/package.json"), "utf8"),
);
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "Usage: node scripts/dev/verify-editor-isolation.mjs [--tarball <file>] [--out <file>]\nPacks the current workspace unless an archive is supplied, installs one editor's documented peers per temporary Yarn project, then typechecks and Vite-builds each public editor entry.",
  );
  process.exit(0);
}
let output;
let tarball;
for (let index = 0; index < args.length; index += 1) {
  if (["--out", "--tarball"].includes(args[index]) && args[index + 1]) {
    if (args[index] === "--out") {
      output = path.resolve(args[index + 1]);
    } else {
      tarball = path.resolve(args[index + 1]);
    }
    index += 1;
  } else {
    throw new Error(`Invalid argument: ${args[index]}`);
  }
}

const peers = {
  tinymce: {
    entry: "client/wysiwyg/tinymce",
    symbol: "TinyMceEditor",
    type: "TinyMceEditorProps",
    dependencies: ["@tinymce/tinymce-react", "tinymce"],
    forbidden: [
      "ckeditor5",
      "@ckeditor/ckeditor5-react",
      "easymde",
      "@mdxeditor/editor",
    ],
  },
  ckeditor: {
    entry: "client/wysiwyg/ckeditor",
    symbol: "CKEditor5Classic",
    type: "CKEditor5ClassicProps",
    dependencies: ["@ckeditor/ckeditor5-react", "ckeditor5"],
    forbidden: [
      "@tinymce/tinymce-react",
      "tinymce",
      "easymde",
      "@mdxeditor/editor",
    ],
  },
  easymde: {
    entry: "client/wysiwyg/easymde",
    symbol: "EasyMDEEditor",
    type: "EasyMDEEditorProps",
    dependencies: ["easymde"],
    forbidden: [
      "@tinymce/tinymce-react",
      "tinymce",
      "ckeditor5",
      "@ckeditor/ckeditor5-react",
      "@mdxeditor/editor",
    ],
  },
  mdx: {
    entry: "client/wysiwyg/mdx",
    symbol: "MDXEditor",
    type: "MDXEditorComponentProps",
    dependencies: [
      "@mdxeditor/editor",
      "@codemirror/language",
      "@lezer/highlight",
      "yjs",
    ],
    forbidden: [
      "@tinymce/tinymce-react",
      "tinymce",
      "ckeditor5",
      "@ckeditor/ckeditor5-react",
      "easymde",
    ],
  },
};
const reactVersion = clientMetadata.devDependencies.react;
const reactDomVersion = clientMetadata.devDependencies["react-dom"];
const viteVersion = clientMetadata.devDependencies.vite;
const typescriptVersion = clientMetadata.devDependencies.typescript;
const temporaryRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "shared-utils-editor-isolation-"),
);
const archive = tarball ?? path.join(temporaryRoot, "shared-utils.tgz");

function runYarn(args, cwd) {
  const result = spawnSync("yarn", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `yarn ${args.join(" ")} failed in ${cwd}\n${result.stdout}\n${result.stderr}`,
    );
  }
  return `${result.stdout}${result.stderr}`;
}

function packagePath(project, name) {
  return path.join(project, "node_modules", ...name.split("/"));
}

try {
  if (!tarball) {
    runYarn(["pack", "--out", archive], root);
  }
  const results = [];
  for (const [engine, config] of Object.entries(peers)) {
    const project = path.join(temporaryRoot, engine);
    const source = path.join(project, "src");
    await fs.mkdir(source, { recursive: true });
    const dependencies = {
      [packageMetadata.name]: `file:${archive}`,
      react: reactVersion,
      "react-dom": reactDomVersion,
      ...Object.fromEntries(
        config.dependencies.map((name) => [
          name,
          clientMetadata.devDependencies[name] ??
            packageMetadata.peerDependencies[name],
        ]),
      ),
    };
    const packageJson = {
      name: `shared-utils-editor-${engine}-fixture`,
      private: true,
      type: "module",
      packageManager: packageMetadata.packageManager,
      dependencies,
      devDependencies: {
        "@types/react": clientMetadata.devDependencies["@types/react"],
        "@types/react-dom": clientMetadata.devDependencies["@types/react-dom"],
        typescript: typescriptVersion,
        vite: viteVersion,
      },
    };
    await fs.writeFile(
      path.join(project, "package.json"),
      `${JSON.stringify(packageJson, null, 2)}\n`,
    );
    await fs.writeFile(
      path.join(project, ".yarnrc.yml"),
      `nodeLinker: node-modules\nenableGlobalCache: false\ncacheFolder: ${path.join(root, ".yarn/cache")}\n`,
    );
    await fs.copyFile(
      path.join(root, "yarn.lock"),
      path.join(project, "yarn.lock"),
    );
    await fs.writeFile(
      path.join(project, "index.html"),
      '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
    );
    await fs.writeFile(
      path.join(source, "main.ts"),
      `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport { ${config.symbol} } from ${JSON.stringify(`${packageMetadata.name}/${config.entry}`)};\nimport type { ${config.type} } from ${JSON.stringify(`${packageMetadata.name}/${config.entry}`)};\nconst props: ${config.type} = {};\ncreateRoot(document.getElementById("root")!).render(React.createElement(${config.symbol}, props));\n`,
    );
    await fs.writeFile(
      path.join(project, "tsconfig.json"),
      `${JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            jsx: "react-jsx",
            strict: true,
            skipLibCheck: true,
            esModuleInterop: true,
            noEmit: true,
          },
          include: ["src/main.ts"],
        },
        null,
        2,
      )}\n`,
    );

    runYarn(["install", "--mode=skip-build"], project);
    const packageDirectory = await fs.realpath(
      packagePath(project, packageMetadata.name),
    );
    if (!packageDirectory.startsWith(`${project}${path.sep}`)) {
      throw new Error(
        `${engine} fixture resolved shared-utils outside its project`,
      );
    }
    for (const name of config.forbidden) {
      try {
        await fs.access(packagePath(project, name));
        throw new Error(`${engine} fixture unexpectedly installed ${name}`);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }
    const installOutput = runYarn(
      ["tsc", "--project", "tsconfig.json"],
      project,
    );
    const buildOutput = runYarn(["vite", "build"], project);
    const outputFiles = [];
    async function collectFiles(directory) {
      for (const entry of await fs.readdir(directory, {
        withFileTypes: true,
      })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await collectFiles(filename);
        } else {
          const stat = await fs.stat(filename);
          outputFiles.push({
            name: path.relative(project, filename),
            bytes: stat.size,
          });
        }
      }
    }
    await collectFiles(path.join(project, "dist"));
    results.push({
      engine,
      entry: config.entry,
      installedPeers: config.dependencies,
      unselectedPeersAbsent: config.forbidden,
      outputFiles,
      typecheck: "passed",
      build: "passed",
      installWarnings: installOutput
        .split("\n")
        .filter((line) => line.includes("YN00")),
      buildWarnings: buildOutput
        .split("\n")
        .filter((line) => line.startsWith("warning")),
    });
  }

  const report = {
    packageVersion: packageMetadata.version,
    archive: path.basename(archive),
    results,
  };
  if (output) {
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(
    results
      .map(
        ({ engine, outputFiles }) =>
          `${engine}: isolated install, typecheck, and build passed (${outputFiles.length} emitted files)`,
      )
      .join("\n"),
  );
  if (output) {
    console.log(`Report: ${output}`);
  }
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}
