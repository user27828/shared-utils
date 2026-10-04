import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { createReactAppResolveAliases } from "./resolveAliases";

const workspaceRoot = path.resolve(__dirname, "../../");
const consumerEntry = path.resolve(__dirname, "src/main.tsx");
const optionalPeers = new Set(
  Object.entries(
    JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, "package.json"), "utf8"),
    ).peerDependenciesMeta ?? {},
  )
    .filter(([, metadata]) => metadata.optional)
    .map(([name]) => name),
);
const packageName = (specifier: string) =>
  specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];

// The local aliases point into the workspace checkout, so Vite otherwise
// resolves optional peers from the package checkout instead of the consuming
// app's dependency tree. Resolve those peers from the host app as a packed
// consumer would.
const resolveHostOptionalPeers = {
  name: "resolve-shared-utils-optional-peers-from-host",
  enforce: "pre" as const,
  async resolveId(source: string, importer?: string) {
    if (
      !importer?.startsWith(path.join(workspaceRoot, "dist") + path.sep) ||
      !optionalPeers.has(packageName(source))
    ) {
      return null;
    }

    return await this.resolve(source, consumerEntry, { skipSelf: true });
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [resolveHostOptionalPeers, react()],
  server: {
    port: 5030,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  resolve: {
    alias: createReactAppResolveAliases(__dirname),
  },
});
