import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-transition-group/TransitionGroupContext":
        "react-transition-group/cjs/TransitionGroupContext.js",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        inline: ["@mui/material", "@mui/system", "react-transition-group"],
      },
    },
    pool: "forks",
    maxWorkers: 4,
    fileParallelism: true,
    isolate: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
