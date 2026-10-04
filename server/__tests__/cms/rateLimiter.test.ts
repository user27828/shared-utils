import { describe, expect, jest, test } from "@jest/globals";

import {
  CmsRateLimiter,
  createCmsAdminRateLimitMiddleware,
  createCmsPublicRateLimitMiddleware,
} from "../../src/cms/rateLimiter.js";

describe("CMS rate limiter factories", () => {
  test("do not register process signal listeners per middleware instance", () => {
    const sigtermCount = process.listenerCount("SIGTERM");
    const sigintCount = process.listenerCount("SIGINT");

    createCmsAdminRateLimitMiddleware({});
    createCmsAdminRateLimitMiddleware({});
    createCmsPublicRateLimitMiddleware({});

    expect(process.listenerCount("SIGTERM")).toBe(sigtermCount);
    expect(process.listenerCount("SIGINT")).toBe(sigintCount);
  });

  test("falls back to memory when Redis returns a malformed transaction result", async () => {
    const limiter = new CmsRateLimiter();
    const multi = {
      incr: jest.fn(),
      pexpire: jest.fn(),
      exec: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    };

    (limiter as any).initialized = true;
    (limiter as any).redis = {
      multi: jest.fn(() => multi),
      disconnect: jest.fn(),
    };

    try {
      const rule = { maxRequests: 1, windowMs: 60_000 };
      const first = await limiter.checkLimit("cms-public:user-1", rule);
      const second = await limiter.checkLimit("cms-public:user-1", rule);

      expect(first).toEqual(
        expect.objectContaining({ allowed: true, remaining: 0 }),
      );
      expect(second.allowed).toBe(false);
    } finally {
      limiter.cleanup();
    }
  });
});

// Injected Redis initialization must be shared and release every owned client.
describe("CMS injected Redis lifecycle", () => {
  const rule = { maxRequests: 1, windowMs: 1000 };
  const client = () => ({
    on: jest.fn(),
    ping: jest.fn<() => Promise<unknown>>().mockResolvedValue("PONG"),
    multi: () => ({
      incr: jest.fn(),
      pexpire: jest.fn(),
      exec: async () => [
        [null, 1],
        [null, 1],
      ],
    }),
    disconnect: jest.fn(),
  });

  test("concurrent callers await the same factory and initialization", async () => {
    const redis = client();
    let complete!: (value: typeof redis) => void;
    const pending = new Promise<typeof redis>((resolve) => {
      complete = resolve;
    });
    const factory = jest.fn(() => pending);
    const limiter = new CmsRateLimiter("redis://fixture", factory);
    try {
      const first = limiter.checkLimit("same", rule);
      const second = limiter.checkLimit("same", rule);
      complete(redis);
      await Promise.all([first, second]);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(redis.ping).toHaveBeenCalledTimes(1);
    } finally {
      limiter.cleanup();
    }
    expect(redis.disconnect).toHaveBeenCalledTimes(1);
  });

  test("failed initialization disconnects and preserves the memory limit", async () => {
    const redis = client();
    redis.ping.mockRejectedValue(new Error("offline"));
    const limiter = new CmsRateLimiter("redis://fixture", () => redis);
    try {
      expect((await limiter.checkLimit("same", rule)).allowed).toBe(true);
      expect((await limiter.checkLimit("same", rule)).allowed).toBe(false);
      expect(redis.disconnect).toHaveBeenCalledTimes(1);
    } finally {
      limiter.cleanup();
    }
  });

  test("cleanup during factory resolution closes the late client", async () => {
    const redis = client();
    let complete!: (value: typeof redis) => void;
    const pending = new Promise<typeof redis>((resolve) => {
      complete = resolve;
    });
    const limiter = new CmsRateLimiter("redis://fixture", () => pending);
    const check = limiter.checkLimit("same", rule);
    limiter.cleanup();
    complete(redis);
    await expect(check).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(redis.disconnect).toHaveBeenCalledTimes(1);
    expect(redis.ping).not.toHaveBeenCalled();
  });
});
