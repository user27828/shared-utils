#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./speckit-sync.sh", import.meta.url));
const result = spawnSync("bash", [scriptPath, ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) {
  console.error(`Unable to run ${scriptPath} with bash: ${result.error.message}`);
  process.exit(1);
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

console.error(`Synchronization terminated by signal ${result.signal ?? "unknown"}.`);
process.exit(1);
