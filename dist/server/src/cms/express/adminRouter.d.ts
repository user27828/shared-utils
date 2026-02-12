/**
 * CMS Admin Express Router Factory — shared-utils
 *
 * Creates a fully-wired Express router that exposes the complete
 * admin CMS HTTP contract.  The host app provides:
 *  - a CmsServiceCore instance (with its connector already wired)
 *  - an authz adapter (from createCmsAuthz)
 *  - optional hooks (onAfterWrite, bodyLimitBytes)
 *
 * Mount example:
 *   app.use("/api/admin/cms",
 *     express.json({ limit: "1mb" }),
 *     authMiddleware,
 *     cmsAdminRateLimitMiddleware,
 *     createCmsAdminRouter({ service, authz }),
 *   );
 */
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import type { CmsServiceCore } from "../CmsServiceCore.js";
import type { CmsActorContext } from "../authz.js";
export interface CmsAdminRouterConfig {
    /** CmsServiceCore instance. */
    service: CmsServiceCore;
    /**
     * Authorization adapter returned by createCmsAuthz().
     * Each method is Express middleware that sets req.cmsActor.
     */
    authz: {
        requireAuthor: (req: Request, res: Response, next: NextFunction) => void;
        requirePublisher: (req: Request, res: Response, next: NextFunction) => void;
        getActorContext: (req: Request) => CmsActorContext;
    };
    /**
     * Optional callback after every successful write (create/update/publish/
     * trash/restore/delete).  Useful for syncing file-link references or
     * flushing caches.
     */
    onAfterWrite?: (params: {
        uid: string;
        event: string;
        actorUid: string;
        row?: Record<string, any> | null;
        req: Request;
    }) => void | Promise<void>;
    /** Max allowed body size in bytes.  Default: 1_048_576 (1 MB). */
    bodyLimitBytes?: number;
}
export declare function createCmsAdminRouter(cfg: CmsAdminRouterConfig): Router;
//# sourceMappingURL=adminRouter.d.ts.map