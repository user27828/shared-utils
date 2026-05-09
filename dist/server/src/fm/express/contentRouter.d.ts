import type { Router } from "express";
import type { FmServiceCore } from "../FmServiceCore.js";
import type { FmAuthzResult } from "./authz.js";
/** Configuration for {@link createFmContentRouter}. */
export interface CreateFmContentRouterConfig {
    /** FmServiceCore instance (shared with other FM routers). */
    service: FmServiceCore;
    /** Authz adapter (from createFmAuthz) — used for ownership checks. */
    authz: FmAuthzResult;
    /**
     * Auto-degrade missing variant to original file.
     * Default: true
     */
    enableVariantFallback?: boolean;
    /**
     * Cache-Control header for responses.
     * Default: "private, max-age=0, no-store" (authenticated content).
     */
    cacheControl?: string;
}
/**
 * Create the FM content Express router.
 *
 * Serves `GET /:uid` with variant resolution, ownership checks,
 * content-type detection, and local/S3 streaming. Mount at your
 * preferred short path (e.g. `/fm`).
 *
 * @param config - Router configuration.
 * @returns An Express Router with the content endpoint.
 */
export declare function createFmContentRouter(config: CreateFmContentRouterConfig): Router;
//# sourceMappingURL=contentRouter.d.ts.map