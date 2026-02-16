/**
 * FM Content Router Factory — shared-utils/server/src/fm/express
 *
 * Lightweight authenticated router for serving file content via short URLs.
 * Designed for `<img src>`, inline previews, and downloads — NOT for
 * admin CRUD operations.
 *
 * Route: `GET /:uid`
 *   Query params:
 *     - `v`  — variant kind (thumb, preview, web). Default: original.
 *     - `w`  — responsive width (maps to thumb/preview/web).
 *     - `dl` — "1" to force Content-Disposition: attachment.
 *
 * Produces short, embeddable URLs:
 *   `/fm/abc-123-uuid`          → original
 *   `/fm/abc-123-uuid?v=thumb`  → thumbnail variant
 *   `/fm/abc-123-uuid?dl=1`     → download original
 *
 * The router expects the calling app to mount auth middleware *before*
 * this router (e.g. `app.use("/fm", authMiddleware, contentRouter)`).
 * Ownership is enforced internally: the requesting user must own the
 * file or have admin privileges (public files are served to any
 * authenticated user).
 *
 * Mount example:
 *   app.use("/fm",
 *     authMiddleware,
 *     fmContentAuthz.middleware,
 *     createFmContentRouter({
 *       service,
 *       authz: fmContentAuthz,
 *       enableVariantFallback: true,
 *     }),
 *   );
 */
import { Router } from "express";
import fs from "fs";
import { isFmError, sendFmError, FmNotFoundError, FmAuthorizationError, } from "../../../../utils/src/fm/errors.js";
import { getSingleParam } from "../../express/params.js";
// ─── Variant kind resolution ──────────────────────────────────────────────
const ALLOWED_VARIANT_KINDS = new Set(["thumb", "preview", "web"]);
/**
 * Map width-based query param to variant kind for responsive images.
 * Widths below 400 → thumb, 400-1000 → preview, above 1000 → web.
 */
const widthToVariantKind = (w) => {
    const width = parseInt(w, 10);
    if (!Number.isFinite(width) || width <= 0) {
        return undefined;
    }
    if (width <= 400) {
        return "thumb";
    }
    if (width <= 1000) {
        return "preview";
    }
    return "web";
};
// ─── Ownership check ─────────────────────────────────────────────────────
/**
 * Check that the current user owns the file or is admin.
 * Public files are accessible to any authenticated user.
 */
function assertAccessible(file, ctx) {
    // Public files: any authenticated user can access
    if (file.is_public) {
        return;
    }
    // Admins can access everything
    if (ctx.isAdmin) {
        return;
    }
    // Owner check
    const owner = file.owner_user_uid || null;
    const uid = ctx.userUid || null;
    if (!uid || !owner || owner !== uid) {
        throw new FmAuthorizationError();
    }
}
// ─── Factory ──────────────────────────────────────────────────────────────
/**
 * Create the FM content Express router.
 *
 * Serves `GET /:uid` with variant resolution, ownership checks,
 * content-type detection, and local/S3 streaming. Mount at your
 * preferred short path (e.g. `/fm`).
 *
 * @param config - Router configuration.
 * @returns An Express Router with the content endpoint.
 */
export function createFmContentRouter(config) {
    const { service, authz, enableVariantFallback = true, cacheControl = "private, max-age=0, no-store", } = config;
    const router = Router();
    // ── GET /:uid — authenticated content endpoint ────────────────────
    router.get("/:uid", async (req, res, _next) => {
        try {
            const fileUid = getSingleParam(req.params.uid);
            if (!fileUid) {
                res.status(400).end();
                return;
            }
            // Resolve actor context (attached by authz middleware)
            const ctx = authz.getActorContext(req);
            // Resolve variant from query params (short names: v, w)
            let variantKind;
            const vParam = (req.query.v || req.query.variant || "").trim();
            const wParam = (req.query.w || "").trim();
            if (vParam && ALLOWED_VARIANT_KINDS.has(vParam)) {
                variantKind = vParam;
            }
            else if (wParam) {
                variantKind = widthToVariantKind(wParam);
            }
            const download = String(req.query.dl || req.query.download || "").trim() === "1";
            // Resolve content access via FmServiceCore
            let access;
            try {
                access = await service.resolveContentAccess({
                    fileUid,
                    variantKind,
                });
            }
            catch (err) {
                // If variant resolution failed and fallback is enabled, try original
                if (enableVariantFallback && variantKind) {
                    try {
                        access = await service.resolveContentAccess({ fileUid });
                    }
                    catch (fallbackErr) {
                        // Only 404 for not-found; rethrow infrastructure errors
                        if (fallbackErr instanceof FmNotFoundError) {
                            res.status(404).end();
                            return;
                        }
                        throw fallbackErr;
                    }
                }
                else {
                    if (err instanceof FmNotFoundError) {
                        res.status(404).end();
                        return;
                    }
                    throw err;
                }
            }
            // Ownership / access check
            assertAccessible(access.file, ctx);
            // Security headers
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("Cache-Control", cacheControl);
            if (access.contentType) {
                res.type(access.contentType);
            }
            if (access.file.sha256) {
                res.setHeader("ETag", `"${access.file.sha256}"`);
            }
            // Force download for potentially dangerous MIME types (HTML, SVG, XML)
            // to prevent XSS from user-uploaded content served on the app origin.
            const dangerousMime = access.contentType &&
                /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/xml|application\/xml)/i.test(access.contentType);
            // Download disposition — forced for dangerous MIME types to prevent XSS
            if (download || dangerousMime) {
                const filename = access.file.original_filename || access.file.uid;
                res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
            }
            // ── S3: redirect to signed URL ────────────────────────────────
            if (access.redirectUrl) {
                res.redirect(302, access.redirectUrl);
                return;
            }
            // ── Local: stream via sendFile ────────────────────────────────
            if (access.provider === "local" && access.absPath) {
                if (!fs.existsSync(access.absPath)) {
                    // Variant fallback: if variant file is missing, try original
                    if (enableVariantFallback && variantKind) {
                        try {
                            const originalAccess = await service.resolveContentAccess({
                                fileUid,
                            });
                            if (originalAccess.provider === "local" &&
                                originalAccess.absPath &&
                                fs.existsSync(originalAccess.absPath)) {
                                if (originalAccess.contentType) {
                                    res.type(originalAccess.contentType);
                                }
                                res.sendFile(originalAccess.absPath, { dotfiles: "allow" });
                                return;
                            }
                        }
                        catch {
                            // fall through to 404
                        }
                    }
                    res.status(404).end();
                    return;
                }
                // dotfiles: 'allow' — required for .data/ paths
                res.sendFile(access.absPath, { dotfiles: "allow" }, (err) => {
                    if (err && !res.headersSent) {
                        res.status(404).end();
                    }
                });
                return;
            }
            res.status(404).end();
        }
        catch (err) {
            if (err instanceof FmAuthorizationError) {
                res.status(403).json({
                    success: false,
                    message: "Access denied",
                    code: "FM_FORBIDDEN",
                });
            }
            else if (isFmError(err)) {
                sendFmError(res, err);
            }
            else {
                res.status(500).end();
            }
        }
    });
    return router;
}
//# sourceMappingURL=contentRouter.js.map