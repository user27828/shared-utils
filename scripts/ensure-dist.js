import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageRoot = path.resolve(__dirname, "..");

const requiredFiles = [
  "dist/utils/index.js",
  "dist/utils/index.d.ts",
  "dist/client/index.js",
  "dist/client/index.d.ts",
  "dist/server/index.js",
  "dist/server/index.d.ts",
];

const missing = requiredFiles.filter((relativePath) => {
  return !fs.existsSync(path.join(packageRoot, relativePath));
});

if (missing.length > 0) {
  const preview = missing.slice(0, 4).join(", ");
  const more = missing.length > 4 ? ` (+${missing.length - 4} more)` : "";

  // Important: do not fail installs. GitHub installs expect dist/ to be committed.
  // If dist/ is missing, the consumer install will succeed but runtime imports may fail.
  console.warn(
    `[shared-utils] Warning: missing built artifacts in dist/ (${preview}${more}). ` +
      `If you're developing from source, run \`yarn build\` in the shared-utils repo.`,
  );
}
