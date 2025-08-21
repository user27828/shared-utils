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
