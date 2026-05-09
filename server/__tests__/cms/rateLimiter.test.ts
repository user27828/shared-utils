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
