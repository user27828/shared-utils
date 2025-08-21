/**
 * Integration test to ensure test-consumer server reads test-consumer/.env-test
 * @jest-environment node
 */

test("consumer reads .env-test via shared-utils server env", async () => {
  // Import the server barrel which now forces env evaluation
  const server = require("../../../../server/index.js");
  // Access exported env
  const env =
    server.env || (await import("../../../../server/src/env.js")).default;
  expect(env).toBeDefined();
  expect(env.DOTENV_TEST_VALUE).toBe("Hello World!");
});
