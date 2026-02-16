import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5030,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  resolve: {
    alias: [
      { find: "@", replacement: "/src" },
      // Explicit aliases for CMS/FM client exports. The generic regex alias
      // maps subpaths directly into dist/, but these exports live under
      // dist/client/src/*.
      {
        find: "@user27828/shared-utils/cms/client",
        replacement: path.resolve(
          __dirname,
          "../../dist/client/src/cms/index.js",
        ),
      },
      {
        find: "@user27828/shared-utils/fm/client",
        replacement: path.resolve(
          __dirname,
          "../../dist/client/src/fm/index.js",
        ),
      },
      // Map specific package root to the utils index, but map all subpaths
      // dynamically to ../../dist/<subpath>. This avoids listing every file.
      {
        find: /^@user27828\/shared-utils\/(.*)/,
        replacement: path.resolve(__dirname, "../../dist/$1"),
      },
      {
        find: "@user27828/shared-utils",
        replacement: path.resolve(__dirname, "../../dist/utils/index.js"),
      },
    ],
  },
});
