/**
 * CMS Authorization Middleware Factory — shared-utils
 *
 * Generic authorization pattern: extract user → check roles → throw.
 * The host app injects its ACL checker and user resolver.
 *
 * Usage:
 *   const cmsAuthz = createCmsAuthz({
 *     hasPermission: (permission, roles) => hasAcl(permission, roles),
 *     resolveUser: (req) => ({ userUid, roles, isSuperadmin }),
 *   });
 *   router.use(cmsAuthz.requireAuthor);
 *   router.post("/publish", cmsAuthz.requirePublisher, ...);
 */
import type { Request, Response, NextFunction } from "express";
import {
  CmsAuthenticationError,
  CmsAuthorizationError,
} from "../../../utils/src/cms/errors.js";

// ─── Types ────────────────────────────────────────────────────────────────

export interface CmsActorContext {
  userUid: string;
  roles: string[];
  isSuperadmin: boolean;
}

export interface CmsAuthzConfig {
  /**
   * Check if a permission is satisfied by the given roles.
   * e.g., hasPermission("cms-author", ["admin", "cms-author"]) → true
   */
  hasPermission: (permission: string, roles: string[]) => boolean;

  /**
   * Resolve the authenticated user from the request.
   * Should throw CmsAuthenticationError if no user is found.
   */
  resolveUser: (req: Request) => CmsActorContext;
}

export interface CmsAuthzMiddleware {
  /** Middleware that requires cms-author role. */
  requireAuthor: (req: Request, res: Response, next: NextFunction) => void;
  /** Middleware that requires cms-publisher role. */
  requirePublisher: (req: Request, res: Response, next: NextFunction) => void;
  /**
   * Resolve the CMS actor context from a request.
   * Throws CmsAuthenticationError if no user is found.
   */
  getActorContext: (req: Request) => CmsActorContext;
}

// ─── Factory ──────────────────────────────────────────────────────────────

/**
 * Create CMS authorization middleware bound to the host app's ACL system.
 */
export const createCmsAuthz = (config: CmsAuthzConfig): CmsAuthzMiddleware => {
  const getActorContext = (req: Request): CmsActorContext => {
    return config.resolveUser(req);
  };

  const requireAuthor = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const actor = getActorContext(req);
      if (!config.hasPermission("cms-author", actor.roles)) {
        throw new CmsAuthorizationError("CMS author access required");
      }
      next();
    } catch (err) {
      if (err instanceof CmsAuthenticationError) {
        res.status(401).json({ success: false, message: err.message });
        return;
      }
      if (err instanceof CmsAuthorizationError) {
        res.status(403).json({ success: false, message: err.message });
        return;
      }
      next(err);
    }
  };

  const requirePublisher = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    try {
      const actor = getActorContext(req);
      if (!config.hasPermission("cms-publisher", actor.roles)) {
        throw new CmsAuthorizationError("CMS publisher access required");
      }
      next();
    } catch (err) {
      if (err instanceof CmsAuthenticationError) {
        res.status(401).json({ success: false, message: err.message });
        return;
      }
      if (err instanceof CmsAuthorizationError) {
        res.status(403).json({ success: false, message: err.message });
        return;
      }
      next(err);
    }
  };

  return { requireAuthor, requirePublisher, getActorContext };
};
