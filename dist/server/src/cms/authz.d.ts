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
/**
 * Create CMS authorization middleware bound to the host app's ACL system.
 */
export declare const createCmsAuthz: (config: CmsAuthzConfig) => CmsAuthzMiddleware;
//# sourceMappingURL=authz.d.ts.map