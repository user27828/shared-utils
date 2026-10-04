/** Optional Redis integration; import only when installing the ioredis peer. */
import Redis from "ioredis";
import type { CmsRedisClient } from "./rateLimiter.js";

export const createCmsRedisClient = async (
  url: string,
): Promise<CmsRedisClient> => {
  const client = new Redis(url, {
    protocol: 2,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    lazyConnect: true,
  });
  client.on("error", () => {
    // Connection errors are handled by the caller's memory fallback.
  });
  try {
    await client.connect();
    return client;
  } catch (error) {
    client.disconnect();
    throw error;
  }
};
