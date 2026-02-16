/**
 * FM Authorization Factory — shared-utils/server/src/fm/express
 *
 * Unlike CMS (role-based: cms-author, cms-publisher), FM uses a simpler
 * owner-or-admin model.  Per-file ownership checks happen inside
 * FmServiceCore.  This factory produces middleware that resolves FmContext
 * from the request and attaches it via a private Symbol key.
 *
 * Usage:
 *   const fmAuthz = createFmAuthz({
 *     resolveContext: (req) => ({
 *       userUid: req.user.auth.id,
 *       isAdmin: hasAdminAccess(req.user.profile.roles),
 *       createdBy: req.user.auth.id,
 *     }),
 *   });
 *
 *   app.use("/api/fm",
 *     authMiddleware,
 *     fmAuthz.middleware,
 *     createFmRouter({ service, authz: fmAuthz }),
 *   );
 */
import type { Request, RequestHandler } from "express";
import type { FmContext } from "../../../../utils/src/fm/types.js";
/** Configuration for {@link createFmAuthz}. */
export interface FmAuthzConfig {
    /**
     * Extract user context from request.
     * Should throw FmAuthenticationError if no valid user is present.
     */
    resolveContext: (req: Request) => FmContext;
}
/** Result returned by {@link createFmAuthz} with middleware and context accessor. */
export interface FmAuthzResult {
    /**
     * Express middleware that ensures the user is authenticated and
     * attaches an FmContext to the request for downstream handlers.
     */
    middleware: RequestHandler;
    /**
     * Retrieve the resolved FmContext from a request (after middleware ran).
     * Throws FmAuthenticationError if context was not resolved.
     */
    getActorContext: (req: Request) => FmContext;
}
/**
 * Create FM authorization middleware bound to the host app's auth system.
 *
 * The returned `middleware` resolves FmContext and attaches it to the
 * request. The returned `getActorContext` retrieves it in route handlers.
 *
 * @param config - Configuration with a resolveContext function
 * @returns FmAuthzResult with middleware + getActorContext
 */
export declare function createFmAuthz(config: FmAuthzConfig): FmAuthzResult;
//# sourceMappingURL=authz.d.ts.map