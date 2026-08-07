import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "@jest/globals";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
);

describe("package-upgrade command wiring", () => {
  it("keeps yarn upgrade on the legacy interactive workflow", () => {
    expect(packageJson.scripts.upgrade).toBe("yarn upgrade-interactive");
    expect(packageJson.bin["yarn-upgrade-interactive"]).toBe(
      "./bin/package-upgrades.sh",
    );
  });

  it("exposes the safe automation workflow separately", () => {
    expect(packageJson.bin["package-upgrade"]).toBe(
      "./scripts/package-upgrade.mjs",
    );
  });
});
