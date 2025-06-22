/**
 * Core verification tests only
 */

import { jest } from "@jest/globals";
import { TEST_VALUES } from "../../__tests__/test-configuration.js";

describe("Core Verification", () => {
  let verification;

  beforeAll(async () => {
    verification = await import("../src/turnstile/verification.js");
  });

  beforeEach(() => {
    global.fetch.mockClear();
  });

  test("verifyTurnstileToken should work with basic parameters", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        challenge_ts: "2023-01-01T00:00:00.000Z",
        hostname: "example.com",
      }),
    });

    const result = await verification.verifyTurnstileToken(
      TEST_VALUES.token,
      TEST_VALUES.secretKey,
    );

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("verifyTurnstileToken should handle API errors", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      verification.verifyTurnstileToken(
        TEST_VALUES.token,
        TEST_VALUES.secretKey,
      ),
    ).rejects.toThrow("Turnstile API error: 500");
  });

  test("verifyTurnstileToken should include optional parameters", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await verification.verifyTurnstileToken(
      TEST_VALUES.token,
      TEST_VALUES.secretKey,
      TEST_VALUES.ipAddress,
      "idempotency-key",
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(TEST_VALUES.cloudflareApiUrl);
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });
});
