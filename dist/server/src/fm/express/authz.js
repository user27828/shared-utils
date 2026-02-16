import { FmAuthenticationError } from "../../../../utils/src/fm/errors.js";
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
export function createFmAuthz(config) {
    const middleware = (req, res, next) => {
        try {
            const ctx = config.resolveContext(req);
            req[FM_CONTEXT_KEY] = ctx;
            next();
        }
        catch (err) {
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
    const getActorContext = (req) => {
        const ctx = req[FM_CONTEXT_KEY];
        if (!ctx) {
            throw new FmAuthenticationError("FM context not resolved");
        }
        return ctx;
    };
    return { middleware, getActorContext };
}
//# sourceMappingURL=authz.js.map