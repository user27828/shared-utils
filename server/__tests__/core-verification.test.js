/**
 * Core verification tests only
 */

import { jest } from "@jest/globals";

describe("Core Verification", () => {
  let verification;

  beforeAll(async () => {
    verification = await import("../src/turnstile/verification.ts");
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
      "test-token",
      "test-secret",
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
      verification.verifyTurnstileToken("test-token", "test-secret"),
    ).rejects.toThrow("Turnstile API error: 500");
  });

  test("verifyTurnstileToken should include optional parameters", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await verification.verifyTurnstileToken(
      "test-token",
      "test-secret",
      "192.168.1.1",
      "idempotency-key",
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });
});
