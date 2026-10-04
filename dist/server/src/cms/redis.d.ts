import type { CmsRedisClient } from "./rateLimiter.js";
export declare const createCmsRedisClient: (url: string) => Promise<CmsRedisClient>;
