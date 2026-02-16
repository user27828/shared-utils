/**
 * FM Admin Router Factory — shared-utils/server/src/fm/express
 *
 * Creates a fully-wired Express router that exposes the complete admin FM
 * HTTP contract.  The host app provides:
 *  - a FmServiceCore instance (with connector + storage already wired)
 *  - an FmAuthzResult adapter (from createFmAuthz)
 *  - optional hooks and configuration
 *
 * This router consolidates ALL FM admin endpoints:
 *  - Upload flows (init / finalize / proxied, for both files and variants)
 *  - File CRUD, listing, metadata, content streaming
 *  - Archive / restore / delete / move
 *  - Link management (optional, behind allowLinks flag)
 *
 * Mount example:
 *   const fmAuthz = createFmAuthz({ resolveContext: myResolver });
 *   app.use("/api/fm",
 *     authMiddleware,
 *     fmAuthz.middleware,
 *     createFmRouter({ service, authz: fmAuthz }),
 *   );
 */
import { Router } from "express";
import type { Request } from "express";
import type { FmServiceCore } from "../FmServiceCore.js";
import type { FmAuthzResult } from "./authz.js";
import type { FmWriteEvent } from "../../../../utils/src/fm/types.js";
export interface CreateFmRouterConfig {
    /** FmServiceCore instance. */
    service: FmServiceCore;
    /** Authorization adapter returned by createFmAuthz(). */
    authz: FmAuthzResult;
    /**
     * Optional callback after every successful write operation
     * (upload, delete, move, archive, restore, patch).
     * Best-effort; errors are swallowed.
     */
    onAfterWrite?: (params: {
        event: FmWriteEvent;
        req: Request;
    }) => void | Promise<void>;
    /** JSON body limit for init/finalize/move/patch requests. Default: "2mb". */
    jsonBodyLimit?: string;
    /** Raw body limit for proxied uploads. Default: "25mb". */
    proxiedUploadBodyLimit?: string;
    /** Enable link CRUD routes (GET/POST/DELETE /files/:fileUid/links). Default: false. */
    allowLinks?: boolean;
    /** Enable content streaming route (GET /files/:fileUid/content). Default: true. */
    enableContentStreaming?: boolean;
}
/**
 * Create the FM admin Express router.
 *
 * Returns a fully-wired router with upload, CRUD, content streaming,
 * archive/restore/delete, move, and optional link management endpoints.
 * Mount behind your auth middleware:
 *
 * ```ts
 * app.use("/api/fm", authMiddleware, fmAuthz.middleware, createFmRouter({ service, authz: fmAuthz }));
 * ```
 *
 * @param config - Router configuration (service, authz, optional hooks and limits).
 * @returns An Express Router with all FM admin routes.
 */
export declare function createFmRouter(config: CreateFmRouterConfig): Router;
//# sourceMappingURL=adminRouter.d.ts.map