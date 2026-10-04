#!/usr/bin/env node
/**
 * Verify the packed CMS/FM contracts without hoisted feature dependencies.
 * This is a dependency-absence diagnostic, not an isolated install benchmark.
 * Requires built dist and the checkout's Yarn/TypeScript/Zod. No network access.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const require = createRequire(path.join(root, "package.json"));
const usage =
  "Usage: node scripts/dev/verify-contract-isolation.mjs [--tarball <file>] [--out <json>]\nPacks the checkout unless --tarball is supplied. Checks native imports and NodeNext/Bundler declarations with only Zod available.";
let tarball;
let output;
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === "--help") {
    console.log(usage);
    process.exit(0);
  }
  if (
    (arg === "--tarball" || arg === "--out") &&
    process.argv[i + 1] &&
    !process.argv[i + 1].startsWith("--")
  ) {
    const value = path.resolve(process.argv[++i]);
    if (arg === "--tarball") {
      tarball = value;
    } else {
      output = value;
    }
  } else {
    throw new Error(`Invalid argument: ${arg}\n${usage}`);
  }
}
const staging = await fs.mkdtemp(
  path.join(os.tmpdir(), "shared-utils-contracts-"),
);
const run = (command, args, cwd = staging) =>
  execFileSync(command, args, { cwd, encoding: "utf8", timeout: 180_000 });
try {
  if (!tarball) {
    tarball = path.join(staging, "package.tgz");
    console.log("Packing shared-utils...");
    run("yarn", ["pack", "--out", tarball], root);
  }
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, "package.json"), "utf8"),
  );
  const packageRoot = path.join(staging, "node_modules", manifest.name);
  await fs.mkdir(packageRoot, { recursive: true });
  run("tar", ["-xzf", tarball, "--strip-components=1", "-C", packageRoot]);
  const packed = JSON.parse(
    await fs.readFile(path.join(packageRoot, "package.json"), "utf8"),
  );
  assert.equal(packed.name, manifest.name);
  await fs.writeFile(
    path.join(staging, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  // No dependency symlinks yet: these runtime boundaries need no peers.
  const bareProbe = `
    import assert from 'node:assert/strict';
    for (const domain of ['cms', 'fm']) {
      const constants = await import('${manifest.name}/' + domain + '/constants');
      assert.ok(Object.values(constants).every(value => Array.isArray(value) && value.length > 0));
      const types = await import('${manifest.name}/' + domain + '/types');
      assert.deepEqual(Object.keys(types), []);
    }
    const contact = await import('${manifest.name}/utils/contact');
    assert.equal(typeof contact.generateVCard, 'function');
    assert.equal('buildCalendarUrl' in contact, false);
    const countries = await import('${manifest.name}/client/countries/core');
    const languages = await import('${manifest.name}/client/languages/core');
    assert.equal(typeof countries.getCountryOptionsFromData, 'function');
    assert.equal(typeof languages.getLanguageOptionsFromData, 'function');
    assert.ok(Array.isArray((await import('${manifest.name}/client/countries')).default));
    assert.ok(Array.isArray((await import('${manifest.name}/client/languages')).default));
  `;
  await fs.writeFile(path.join(staging, "bare.mjs"), bareProbe);
  run(process.execPath, ["bare.mjs"]);
  // Check constant declarations with no Zod or UI declarations available.
  await fs.writeFile(
    path.join(staging, "constants.ts"),
    `
    import { CMS_POST_TYPES } from '${manifest.name}/cms/constants';
    import { FM_PURPOSES } from '${manifest.name}/fm/constants';
    export const constants = [CMS_POST_TYPES, FM_PURPOSES];
  `,
  );
  const tsc = require.resolve("typescript/bin/tsc");
  const checkTypes = async (file) => {
    for (const [module, moduleResolution] of [
      ["NodeNext", "NodeNext"],
      ["ESNext", "Bundler"],
    ]) {
      await fs.writeFile(
        path.join(staging, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            strict: true,
            skipLibCheck: false,
            target: "ES2022",
            module,
            moduleResolution,
            esModuleInterop: true,
            types: [],
          },
          files: [file],
        }),
      );
      run(process.execPath, [tsc, "--project", "tsconfig.json"]);
    }
  };
  await checkTypes("constants.ts");
  await fs.writeFile(
    path.join(staging, "geographic-calendar.ts"),
    `
    import { getCountryOptionsFromData, type CountryDataRow } from '${manifest.name}/client/countries/core';
    import { getLanguageOptionsFromData, type LanguageDataRow } from '${manifest.name}/client/languages/core';
    import type { ContactInfo } from '${manifest.name}/utils/contact';
    import type { CalendarEvent } from '${manifest.name}/utils/calendar';
    const country: CountryDataRow = {name: 'Example', nameLocal: 'Example', iso3166_1_alpha2: 'EX', iso3166_1_alpha3: 'EXM', iso3166_1_numeric: 999};
    const language: LanguageDataRow = {iso639_1: 'xx', iso639_2: 'xxx', iso639_3: 'xxx', name: 'Example', nameLocal: 'Example', ietf: 'xx', lcid: 0, speakers: 0};
    export const countries = getCountryOptionsFromData([country]);
    export const languages = getLanguageOptionsFromData([language]);
    export const contact: ContactInfo = {name: 'Example'};
    export const event: CalendarEvent = {title: 'Example', startDate: new Date()};
  `,
  );
  await checkTypes("geographic-calendar.ts");
  await fs.symlink(
    path.dirname(require.resolve("zod/package.json")),
    path.join(staging, "node_modules", "zod"),
    "dir",
  );
  await fs.writeFile(
    path.join(staging, "contracts.mjs"),
    `
    import assert from 'node:assert/strict';
    const cms = await import('${manifest.name}/cms');
    const fm = await import('${manifest.name}/fm');
    assert.equal('hashCmsPassword' in cms, false);
    assert.equal('sanitizeCmsHtml' in cms, false);
    assert.equal('renderMarkdownToSanitizedHtml' in cms, false);
    for (const domain of ['cms', 'fm']) {
      for (const entry of ['schemas', 'validation', 'errors']) {
        await import('${manifest.name}/' + domain + '/' + entry);
      }
    }
    assert.ok(cms.CmsCreateRequestSchema.safeParse({title: 'valid', content_type: 'text/plain', slug: 'valid', locale: 'en', post_type: 'page'}).success);
    assert.equal(cms.CmsCreateRequestSchema.safeParse({post_type: 'invalid'}).success, false);
    assert.equal(fm.FmPurposeSchema.safeParse('invalid').success, false);
  `,
  );
  run(process.execPath, ["contracts.mjs"]);
  await fs.writeFile(
    path.join(staging, "types.ts"),
    `
    import type { CmsCreateRequest, CmsPostType } from '${manifest.name}/cms/types';
    import type { FmPurpose, FmUploadInitRequest } from '${manifest.name}/fm/types';
    export const request: CmsCreateRequest = {title: 'valid', content: '', content_type: 'text/plain', slug: 'valid', locale: 'en', post_type: 'page'};
    export const postType: CmsPostType = 'post';
    export const purpose: FmPurpose = 'cms_asset';
    export type Upload = FmUploadInitRequest;
    // @ts-expect-error Enums must remain schema-derived literal unions.
    export const invalidPostType: CmsPostType = 'invalid';
    // @ts-expect-error Enums must remain schema-derived literal unions.
    export const invalidPurpose: FmPurpose = 'invalid';
  `,
  );
  await checkTypes("types.ts");
  const report = {
    schemaVersion: 1,
    packageVersion: packed.version,
    nodeVersion: process.version,
    status: "ok",
    availableDependencies: ["zod"],
    native: [
      "constants-without-dependencies",
      "erased-types-without-dependencies",
      "contact-and-geographic-runtime-boundaries-without-feature-peers",
      "shared-contracts",
      "schemas-validation-errors",
    ],
    typeResolution: [
      "NodeNext",
      "Bundler",
      "packed geographic and calendar subpaths",
    ],
  };
  if (output) {
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
  }
  console.log(
    "Packed CMS/FM contracts and E09 contact/geographic boundaries passed; only Zod was provided.",
  );
} finally {
  await fs.rm(staging, { recursive: true, force: true });
}
