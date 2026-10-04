import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { missingArtifacts } from "./artifact-contract.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageRoot = path.resolve(__dirname, "..");

const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
);
const missing = missingArtifacts(packageRoot, manifest);

if (missing.length > 0) {
  const preview = missing.slice(0, 4).join(", ");
  const more = missing.length > 4 ? ` (+${missing.length - 4} more)` : "";

  // Important: do not fail installs. GitHub installs expect dist/ to be committed.
  // If dist/ is missing, the consumer install will succeed but runtime imports may fail.
  console.warn(
    `[shared-utils] Warning: missing package artifacts (${preview}${more}). ` +
      `If you're developing from source, run \`yarn build\` in the shared-utils repo.`,
  );
}
