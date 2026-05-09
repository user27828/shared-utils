import type { Router, Request } from "express";
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