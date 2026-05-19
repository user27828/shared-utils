/**
 * Integration test to ensure test-consumer server reads test-consumer/.env-test
 * @jest-environment node
 */

const TEST_ENV_KEYS = [
  "DOTENV_TEST_VALUE_PREFIX",
  "DOTENV_TEST_VALUE",
  "DOTENV_TEST_JSON",
  "DOTENV_TEST_JSON_INVALID",
  "DOTENV_TEST_BOOL",
  "ENV_JSON_KEYS",
];

test("consumer reads .env-test via shared-utils server env", async () => {
  const originalEnv = Object.fromEntries(
    TEST_ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  for (const key of TEST_ENV_KEYS) {
    delete process.env[key];
  }

  try {
    // Import the server barrel which now forces env evaluation
    const server = require("../../../../server/index.js");
    // Access exported env
    const env =
      server.env || (await import("../../../../server/src/env.js")).default;
    expect(env).toBeDefined();
    expect(env.DOTENV_TEST_VALUE).toBe("Hello World!");
  } finally {
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
