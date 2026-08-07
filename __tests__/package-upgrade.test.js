import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "@jest/globals";
import {
  parseArgs,
  parsePackageSpec,
  packageSpecsFromManifest,
  parseAgeGate,
  createInspection,
  ageGateStatusFor,
  assertNoAgeGateRejectionsForApply,
  parseRegistryMetadata,
  registryInfoArgs,
  resolveProjectRoot,
  summarizeAudit,
  upgradeArgs,
} from "../scripts/package-upgrade.mjs";

describe("package-upgrade", () => {
  it("runs when invoked through a package-manager bin symlink", () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "shared-utils-package-upgrade-test-"),
    );
    const binPath = path.join(root, "package-upgrade");
    const scriptPath = fileURLToPath(
      new URL("../scripts/package-upgrade.mjs", import.meta.url),
    );
    fs.symlinkSync(scriptPath, binPath);

    try {
      expect(
        execFileSync(process.execPath, [binPath, "--help"], {
          encoding: "utf8",
        }),
      ).toContain("Usage: package-upgrade");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts only concrete registry package specifications", () => {
    expect(parsePackageSpec("@scope/example@1.2.3")).toEqual({
      name: "@scope/example",
      version: "1.2.3",
    });
    expect(parsePackageSpec("example")).toEqual({
      name: "example",
      version: "latest",
    });
    expect(() => parsePackageSpec("example@^1.2.3")).toThrow("exact versions");
    expect(() => parsePackageSpec("example@latest;id")).toThrow(
      "exact versions",
    );
    expect(() => parsePackageSpec("git+https://example.test/repo.git")).toThrow(
      "Invalid package name",
    );
  });

  it("reports age-gated candidates in plans and rejects only apply requests", () => {
    const rejected = {
      name: "example",
      version: "1.2.3",
      status: ageGateStatusFor(60, 5760),
    };

    expect(rejected.status).toBe("rejected-age-gate");
    expect(ageGateStatusFor(60, 5760, true)).toBe(
      "eligible-security-exception",
    );
    expect(() =>
      assertNoAgeGateRejectionsForApply([rejected], false),
    ).not.toThrow();
    expect(() => assertNoAgeGateRejectionsForApply([rejected], true)).toThrow(
      "Age gate rejected: example@1.2.3",
    );
  });

  it("rejects manager and verification injection attempts before commands run", () => {
    expect(() => parseArgs(["--manager", "yarn;id"])).toThrow("must be yarn");
    expect(() => parseArgs(["--verify", "test;id"])).toThrow("only accepts");
    expect(() => parseArgs(["--unknown"])).toThrow("Unknown option");
    expect(() => parseArgs(["--summary"])).toThrow("requires --inspect");
    expect(
      parseArgs(["--inspect", "example@1.2.3", "other@2.3.4"]).inspect,
    ).toBe(true);
    expect(() => parseArgs(["--inspect", "example"])).toThrow(
      "exact package versions",
    );
    expect(() =>
      parseArgs([
        "--inspect",
        ...Array.from({ length: 33 }, (_, index) => `example-${index}@1.2.3`),
      ]),
    ).toThrow("between one and 32");
    expect(() => parseArgs(["--audit", "example"])).toThrow(
      "cannot be combined",
    );
  });

  it("walks from a caller subdirectory to its project manifest", () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "shared-utils-package-upgrade-test-"),
    );
    const nested = path.join(root, "packages", "app", "src");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(root, "package.json"), "{}\n");

    try {
      expect(resolveProjectRoot(nested)).toBe(fs.realpathSync(root));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("reads quoted and unquoted Yarn minimal-age gates", () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "shared-utils-package-upgrade-test-"),
    );
    fs.writeFileSync(
      path.join(root, ".yarnrc.yml"),
      'npmMinimalAgeGate: "5760"\n',
    );

    try {
      expect(parseAgeGate(root)).toBe(5760);
      fs.writeFileSync(
        path.join(root, ".yarnrc.yml"),
        "npmMinimalAgeGate: invalid\n",
      );
      expect(() => parseAgeGate(root)).toThrow("must be an integer");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses non-shell, lifecycle-disabled manager upgrade forms", () => {
    const candidates = [{ name: "example", version: "1.2.3" }];
    expect(upgradeArgs("yarn", candidates)).toEqual([
      "up",
      "--mode=skip-build",
      "example@1.2.3",
    ]);
    expect(upgradeArgs("npm", candidates)).toEqual(
      expect.arrayContaining([
        "install",
        "--ignore-scripts",
        "--package-lock-only",
        "--save-prod",
        "example@1.2.3",
      ]),
    );
    expect(upgradeArgs("pnpm", candidates)).toEqual(
      expect.arrayContaining([
        "update",
        "--ignore-scripts",
        "--lockfile-only",
        "example@1.2.3",
      ]),
    );
    expect(upgradeArgs("npm", candidates, "devDependencies")).toContain(
      "--save-dev",
    );
  });

  it("does not auto-select local, git, or workspace dependencies", () => {
    expect(
      packageSpecsFromManifest({
        dependencies: {
          registry: "^1.0.0",
          local: "file:../local",
          portal: "portal:../portal",
          workspace: "workspace:*",
          git: "git+https://example.test/repository.git",
        },
      }),
    ).toEqual([
      { name: "registry", version: "latest", dependencyType: "dependencies" },
    ]);
  });

  it("accepts both npm's formatted JSON and Yarn's JSON line output", () => {
    expect(
      parseRegistryMetadata(
        '{\n  "dist-tags": { "latest": "1.2.3" }\n}',
        "example",
      ),
    ).toEqual({
      "dist-tags": { latest: "1.2.3" },
    });
    expect(parseRegistryMetadata('progress\n{"time":{}}', "example")).toEqual({
      time: {},
    });
  });

  it("keeps planning metadata minimal and produces bounded inspection records", () => {
    expect(registryInfoArgs("yarn", "example")).toEqual(
      expect.arrayContaining(["--fields", "time,dist-tags,versions"]),
    );
    const dependencies = Object.fromEntries(
      Array.from({ length: 65 }, (_, index) => [
        `dependency-${index}`,
        "^1.0.0",
      ]),
    );
    const inspection = createInspection(
      {
        name: "example",
        version: "1.2.3",
        publishedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        deprecated: "untrusted free-form text is never returned",
        description: "untrusted prose is omitted",
        engines: { node: ">=20" },
        peerDependencies: { react: "^19.0.0" },
        dependencies,
        dist: {
          integrity: `sha512-${"A".repeat(32)}`,
          shasum: "a".repeat(40),
          tarball: "https://untrusted.example/package.tgz",
        },
      },
      5760,
      6000,
    );

    expect(inspection).toMatchObject({
      deprecated: true,
      engines: { node: ">=20" },
      peerDependencies: { react: "^19.0.0" },
      dist: { shasum: "a".repeat(40) },
    });
    expect(Object.keys(inspection.dependencies)).toHaveLength(64);
    expect(inspection).toEqual(
      expect.objectContaining({ truncatedFields: ["dependencies"] }),
    );
    expect(inspection).not.toHaveProperty("description");
    expect(JSON.stringify(inspection)).not.toContain("tarball");
    const summary = createInspection(
      {
        name: "example",
        version: "1.2.3",
        publishedAt: "2025-01-01T00:00:00.000Z",
      },
      { dependencies, peerDependencies: { react: "^19.0.0" } },
      5760,
      6000,
      true,
    );
    expect(summary).toEqual(
      expect.objectContaining({
        dependencyCount: "64+",
        peerDependencyCount: 1,
      }),
    );
    expect(summary).not.toHaveProperty("dependencies");
    expect(summary).not.toHaveProperty("dist");
  });

  it("summarizes audits without returning their full untrusted payload", () => {
    expect(
      summarizeAudit({
        metadata: { vulnerabilities: { high: 1, critical: 1, total: 2 } },
        vulnerabilities: {
          first: {
            severity: "high",
            via: [{ url: "https://github.com/advisories/GHSA-2345-6789-cfgh" }],
          },
          second: { severity: "critical", via: ["CVE-2025-12345"] },
        },
      }),
    ).toEqual({
      vulnerabilities: { high: 1, critical: 1, total: 2 },
      highCriticalAdvisories: ["CVE-2025-12345", "GHSA-2345-6789-CFGH"],
      advisoryListTruncated: false,
    });
    expect(
      summarizeAudit({
        findings: [{ children: { Severity: "moderate", Issue: "omitted" } }],
      }),
    ).toEqual({
      vulnerabilities: { moderate: 1, total: 1 },
      highCriticalAdvisories: [],
      advisoryListTruncated: false,
    });
  });
});
