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
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { FmContext } from "../../../../utils/src/fm/types.js";
import { FmAuthenticationError } from "../../../../utils/src/fm/errors.js";

// ─── Types ────────────────────────────────────────────────────────────────

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

// ─── Private Symbol Key ───────────────────────────────────────────────────

/**
 * Symbol key for attaching FmContext to the request object.
 * Using a Symbol prevents naming collisions with other middleware.
 */
const FM_CONTEXT_KEY = Symbol("fmContext");

// ─── Factory ──────────────────────────────────────────────────────────────

/**
 * Create FM authorization middleware bound to the host app's auth system.
 *
 * The returned `middleware` resolves FmContext and attaches it to the
 * request. The returned `getActorContext` retrieves it in route handlers.
 *
 * @param config - Configuration with a resolveContext function
 * @returns FmAuthzResult with middleware + getActorContext
 */
export function createFmAuthz(config: FmAuthzConfig): FmAuthzResult {
  const middleware: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      const ctx = config.resolveContext(req);
      (req as any)[FM_CONTEXT_KEY] = ctx;
      next();
    } catch (err) {
      if (err instanceof FmAuthenticationError) {
        res.status(401).json({
          success: false,
          message: err.message,
          code: err.code,
        });
        return;
      }
      next(err);
    }
  };

  const getActorContext = (req: Request): FmContext => {
    const ctx = (req as any)[FM_CONTEXT_KEY] as FmContext | undefined;
    if (!ctx) {
      throw new FmAuthenticationError("FM context not resolved");
    }
    return ctx;
  };

  return { middleware, getActorContext };
}
