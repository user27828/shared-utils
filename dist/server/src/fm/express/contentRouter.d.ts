/**
 * FM Content Router Factory — shared-utils/server/src/fm/express
 *
 * Lightweight authenticated router for serving file content via short URLs.
 * Designed for `<img src>`, inline previews, and downloads — NOT for
 * admin CRUD operations.
 *
 * Route: `GET /:uid`
 *   Query params:
 *     - `v`  — variant kind (thumb, preview, web). Default: original.
 *     - `w`  — responsive width (maps to thumb/preview/web).
 *     - `dl` — "1" to force Content-Disposition: attachment.
 *
 * Produces short, embeddable URLs:
 *   `/fm/abc-123-uuid`          → original
 *   `/fm/abc-123-uuid?v=thumb`  → thumbnail variant
 *   `/fm/abc-123-uuid?dl=1`     → download original
 *
 * The router expects the calling app to mount auth middleware *before*
 * this router (e.g. `app.use("/fm", authMiddleware, contentRouter)`).
 * Ownership is enforced internally: the requesting user must own the
 * file or have admin privileges (public files are served to any
 * authenticated user).
 *
 * Mount example:
 *   app.use("/fm",
 *     authMiddleware,
 *     fmContentAuthz.middleware,
 *     createFmContentRouter({
 *       service,
 *       authz: fmContentAuthz,
 *       enableVariantFallback: true,
 *     }),
 *   );
 */
import { Router } from "express";
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