import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createReactAppResolveAliases } from "./resolveAliases";

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
    alias: createReactAppResolveAliases(__dirname),
  },
});
