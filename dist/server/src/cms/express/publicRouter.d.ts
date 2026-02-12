/**
 * CMS Public Express Router Factory — shared-utils
 *
 * Creates a fully-wired Express router for public (unauthenticated)
 * CMS content delivery.  Supports:
 *  - Published content by postType/locale/slug
 *  - If-None-Match / 304 (conditional GET)
 *  - Password-protected content with unlock-token exchange
 *  - Cache-Control headers for CDN integration
 *
 * Mount example:
 *   app.use("/api/public/cms",
 *     express.json({ limit: "4kb" }),
 *     cmsPublicRateLimitMiddleware,
 *     createCmsPublicRouter({ service, unlockToken }),
 *   );
 */
import { Router } from "express";
import type { CmsServiceCore } from "../CmsServiceCore.js";
export interface CmsPublicRouterConfig {
    /** CmsServiceCore instance. */
    service: CmsServiceCore;
    /**
     * Unlock-token utilities from createCmsUnlockTokenUtils().
     * Required only if password-protected content is used.
     */
    unlockToken?: {
        sign: (claims: {
            uid: string;
            postType: string;
            locale: string;
            slug: string;
            passwordVersion?: number;
        }, ttlSeconds?: number) => string;
        verify: (token: string) => {
            uid: string;
            postType: string;
            locale: string;
            slug: string;
            passwordVersion?: number;
        } | null;
    };
    /** Default unlock token TTL in seconds.  Default: 1800 (30 min). */
    unlockTtlSeconds?: number;
}
export declare function createCmsPublicRouter(cfg: CmsPublicRouterConfig): Router;
//# sourceMappingURL=publicRouter.d.ts.map