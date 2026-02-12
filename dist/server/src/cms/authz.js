import { CmsAuthenticationError, CmsAuthorizationError, } from "../../../utils/src/cms/errors.js";
// ─── Factory ──────────────────────────────────────────────────────────────
/**
 * Create CMS authorization middleware bound to the host app's ACL system.
 */
export const createCmsAuthz = (config) => {
    const getActorContext = (req) => {
        return config.resolveUser(req);
    };
    const requireAuthor = (req, res, next) => {
        try {
            const actor = getActorContext(req);
            if (!config.hasPermission("cms-author", actor.roles)) {
                throw new CmsAuthorizationError("CMS author access required");
            }
            next();
        }
        catch (err) {
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
    const requirePublisher = (req, res, next) => {
        try {
            const actor = getActorContext(req);
            if (!config.hasPermission("cms-publisher", actor.roles)) {
                throw new CmsAuthorizationError("CMS publisher access required");
            }
            next();
        }
        catch (err) {
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
//# sourceMappingURL=authz.js.map