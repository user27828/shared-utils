import { lstat, rm, symlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = path.dirname(fileURLToPath(import.meta.url));
const clientNodeModules = path.join(clientRoot, "node_modules");
const distNodeModules = path.resolve(clientRoot, "../dist/client/node_modules");

export default async function setupDistDependencyResolution() {
  try {
    await lstat(distNodeModules);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await symlink(clientNodeModules, distNodeModules, "dir");

  return async () => {
    await rm(distNodeModules, { force: true });
  };
}
