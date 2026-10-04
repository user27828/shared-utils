#!/usr/bin/env node
// Clean only the selected compiler-owned workspace output and build cache.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [workspace, ...extra] = process.argv.slice(2);
if (!["utils", "client", "server"].includes(workspace) || extra.length) {
  throw new Error("Usage: node scripts/clean-dist.mjs <utils|client|server>");
}
await fs.rm(path.join(root, "dist", workspace), {
  recursive: true,
  force: true,
});
await fs.rm(path.join(root, workspace, "tsconfig.tsbuildinfo"), {
  force: true,
});
