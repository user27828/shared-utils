import type { Router } from "express";
import type { FmServiceCore } from "../FmServiceCore.js";
/** Configuration for the redirect cache used by the public router. */
export interface FmPublicRouterCacheConfig {
    /** Maximum number of cached redirect entries. Default: 5000. */
    maxEntries?: number;
    /** TTL for cached entries in milliseconds. Default: 60000 (60 seconds). */
    ttlMs?: number;
    /** Enable/disable the redirect cache. Default: true. */
    enabled?: boolean;
}
/** Configuration for {@link createFmPublicRouter}. */
export interface CreateFmPublicRouterConfig {
    /** FmServiceCore instance. */
    service: FmServiceCore;
    /**
     * Cache-Control header for public content.
     * Default: "public, max-age=86400, immutable"
     */
    cacheControl?: string;
    /**
     * Auto-degrade missing variant to original file.
     * Default: true
     */
    enableVariantFallback?: boolean;
    /** Redirect cache configuration for S3 signed URLs. */
    cache?: FmPublicRouterCacheConfig;
}
/**
 * Create the FM public media Express router.
 *
 * Serves `GET /:uid` with variant resolution, content-type detection,
 * cache headers, and S3 redirect caching. Mount at your canonical
 * media path (e.g. `/media`).
 *
 * @param config - Router configuration (service, cache-control, variant fallback, redirect cache).
 * @returns An Express Router with the public media endpoint.
 */
export declare function createFmPublicRouter(config: CreateFmPublicRouterConfig): Router;
//# sourceMappingURL=publicRouter.d.ts.map