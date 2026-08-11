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
    // MUI/jsdom integration tests can exceed Vitest's 5-second default while
    // cold workers transform and render the component tree in parallel.
    testTimeout: 10_000,
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
