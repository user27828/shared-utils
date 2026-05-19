/**
 * Tests for server env loader
 * Vitest environment (node)
 */

const TEST_ENV_KEYS = [
  "DOTENV_TEST_VALUE_PREFIX",
  "DOTENV_TEST_VALUE",
  "DOTENV_TEST_JSON",
  "DOTENV_TEST_JSON_INVALID",
  "DOTENV_TEST_BOOL",
  "ENV_JSON_KEYS",
];

describe("server/env loader", () => {
  test("reads DOTENV_PATH from global options (DOTENV_PATH)", async () => {
    const originalEnv = Object.fromEntries(
      TEST_ENV_KEYS.map((key) => [key, process.env[key]]),
    );

    for (const key of TEST_ENV_KEYS) {
      delete process.env[key];
    }

    // Create a simple options manager mock that matches the API used by env.ts
    // Use setGlobalOptions/getOption style (no DOTENV-OPTIONS manager)
    try {
      let globalOpts = {};
      const managers = new Map();
      const optionsManager = {
        registerManager(name, m) {
          managers.set(name, m);
        },
        getManager(name) {
          return managers.get(name);
        },
        setGlobalOptions(obj = {}) {
          globalOpts = { ...(globalOpts || {}), ...(obj || {}) };
        },
        getOption(k) {
          return globalOpts[k];
        },
      };

      // Set DOTENV_PATH via global options
      const path = await import("path");
      optionsManager.setGlobalOptions({
        DOTENV_PATH: path.resolve(
          process.cwd(),
          "..",
          "test-consumer",
          ".env-test",
        ),
      });

      // Attach to global so env.ts can find it
      globalThis.__shared_utils_pkg = { optionsManager };

      // No pre-import d.ts parsing: the loader will read ENV_JSON_KEYS from the
      // parsed .env file specified via DOTENV_PATH (CSV string).

      // Import env module freshly to trigger loader
      const mod = await import("../src/env.js");

      expect(mod.default).toBeDefined();
      // String value remains
      expect(mod.default.DOTENV_TEST_VALUE).toBe("Hello World!");
      // Valid JSON should be parsed into an object
      expect(typeof mod.default.DOTENV_TEST_JSON).toBe("object");
      expect(mod.default.DOTENV_TEST_JSON.provider).toBe("openrouter");
      // Invalid JSON should fallback to the original string
      expect(typeof mod.default.DOTENV_TEST_JSON_INVALID).toBe("string");
      // Boolean-like strings declared as boolean in the d.ts should be coerced
      expect(mod.default.DOTENV_TEST_BOOL).toBe(true);
    } finally {
      delete globalThis.__shared_utils_pkg;

      for (const key of TEST_ENV_KEYS) {
        const originalValue = originalEnv[key];

        if (typeof originalValue === "undefined") {
          delete process.env[key];
        } else {
          process.env[key] = originalValue;
        }
      }
    }
  });
});
