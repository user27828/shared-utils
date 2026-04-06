import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createReactAppResolveAliases } from "./resolveAliases";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: createReactAppResolveAliases(__dirname),
  },
  test: {
    environment: "happy-dom",
    globals: false,
    include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
  },
});
