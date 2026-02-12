/**
 * CMS Public Express Router Factory — shared-utils
 *
 * Creates a fully-wired Express router for public (unauthenticated)
 * CMS content delivery.  Supports:
 *  - Published content by postType/locale/slug
 *  - If-None-Match / 304 (conditional GET)
 *  - Password-protected content with unlock-token exchange
 *  - Cache-Control headers for CDN integration
 *
 * Mount example:
 *   app.use("/api/public/cms",
 *     express.json({ limit: "4kb" }),
 *     cmsPublicRateLimitMiddleware,
 *     createCmsPublicRouter({ service, unlockToken }),
 *   );
 */
import { Router } from "express";
import { isCmsError, cmsErrorToResponse } from "../../../../utils/src/cms/errors.js";
import { verifyCmsPassword } from "../../../../utils/src/cms/password.js";
import { normalizeLocale, canonicalizeSlug } from "../../../../utils/src/cms/validation.js";
import { applyCmsPublicCacheHeaders, } from "../cacheControl.js";
// ─── Helpers ──────────────────────────────────────────────────────────────
const sendCmsError = (res, err) => {
    if (isCmsError(err)) {
        const body = cmsErrorToResponse(err);
        res.status(err.statusCode).json(body);
        return;
    }
    const statusCode = Number(err?.statusCode || err?.status || 500);
    const message = String(err?.message || "Internal server error");
    res.status(statusCode).json({ success: false, message });
};
// ─── Factory ──────────────────────────────────────────────────────────────
export function createCmsPublicRouter(cfg) {
    const { service, unlockToken, unlockTtlSeconds = 1800 } = cfg;
    const router = Router();
    // ═══════════════════════════════════════════════════════════════════════
    //  GET /:postType/:locale/:slug — Fetch published content
    // ═══════════════════════════════════════════════════════════════════════
    router.get("/:postType/:locale/:slug", async (req, res) => {
        try {
            const postType = req.params.postType;
            const locale = normalizeLocale(req.params.locale);
            const slug = canonicalizeSlug(req.params.slug);
            // Step 1: Get public head (lightweight check for existence + protection)
            let head = null;
            try {
                head = await service.getPublicHead({ postType, locale, slug });
            }
            catch {
                // fall through to 404
            }
            if (!head) {
                res.status(404).json({ success: false, message: "Not found" });
                return;
            }
            const isProtected = !!head.password_hash;
            const etag = head.etag;
            // Step 2: If NOT protected, check conditional GET
            if (!isProtected && etag) {
                const ifNoneMatch = req.headers["if-none-match"];
                if (ifNoneMatch && ifNoneMatch === etag) {
                    applyCmsPublicCacheHeaders(res, { isProtected: false, etag });
                    res.status(304).end();
                    return;
                }
            }
            // Step 3: If protected, verify unlock token
            if (isProtected) {
                const token = (req.headers["authorization"]?.replace(/^Bearer\s+/i, "")) ||
                    req.headers["x-cms-unlock-token"];
                if (!token || !unlockToken) {
                    applyCmsPublicCacheHeaders(res, { isProtected: true, etag: null });
                    res.status(401).json({
                        success: false,
                        message: "Password required",
                        requiresPassword: true,
                    });
                    return;
                }
                const claims = unlockToken.verify(token);
                if (!claims ||
                    claims.uid !== head.uid ||
                    claims.postType !== postType ||
                    claims.locale !== locale ||
                    claims.slug !== slug) {
                    applyCmsPublicCacheHeaders(res, { isProtected: true, etag: null });
                    res.status(401).json({
                        success: false,
                        message: "Password required",
                        requiresPassword: true,
                    });
                    return;
                }
                // Check password version (rotation invalidates tokens)
                if (claims.passwordVersion !== undefined &&
                    head.password_version !== undefined &&
                    claims.passwordVersion !== head.password_version) {
                    applyCmsPublicCacheHeaders(res, { isProtected: true, etag: null });
                    res.status(401).json({
                        success: false,
                        message: "Password required",
                        requiresPassword: true,
                    });
                    return;
                }
            }
            // Step 4: Fetch full payload
            const payload = await service.getPublicPayloadBySlug({
                postType,
                locale,
                slug,
            });
            if (!payload) {
                res.status(404).json({ success: false, message: "Not found" });
                return;
            }
            // Step 5: Set cache headers and respond
            applyCmsPublicCacheHeaders(res, {
                isProtected,
                etag: payload.etag ?? etag,
            });
            res.status(200).json({ success: true, data: payload });
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  POST /:postType/:locale/:slug/unlock — Exchange password for token
    // ═══════════════════════════════════════════════════════════════════════
    router.post("/:postType/:locale/:slug/unlock", async (req, res) => {
        try {
            // Body-size guard
            const cl = parseInt(req.headers["content-length"] || "0", 10);
            if (cl > 4096) {
                res.status(413).json({ success: false, message: "Payload too large" });
                return;
            }
            const password = req.body?.password;
            if (!password || typeof password !== "string" || !password.trim()) {
                res.status(400).json({ success: false, message: "Password is required" });
                return;
            }
            const postType = req.params.postType;
            const locale = normalizeLocale(req.params.locale);
            const slug = canonicalizeSlug(req.params.slug);
            // Look up the published head row
            let head = null;
            try {
                head = await service.getPublicHead({ postType, locale, slug });
            }
            catch {
                // fall through to 404
            }
            if (!head) {
                res.status(404).json({ success: false, message: "Not found" });
                return;
            }
            if (!head.password_hash) {
                res.status(409).json({ success: false, message: "Not password protected" });
                return;
            }
            // Verify password
            const valid = await verifyCmsPassword(password, head.password_hash);
            if (!valid) {
                res.status(403).json({ success: false, message: "Invalid password" });
                return;
            }
            // Generate unlock token
            if (!unlockToken) {
                res.status(500).json({
                    success: false,
                    message: "Unlock token signing not configured",
                });
                return;
            }
            const token = unlockToken.sign({
                uid: head.uid,
                postType,
                locale,
                slug,
                passwordVersion: head.password_version,
            }, unlockTtlSeconds);
            const expiresAt = new Date(Date.now() + unlockTtlSeconds * 1000).toISOString();
            res.status(200).json({
                success: true,
                data: { token, expiresAt },
            });
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ── Router-level error handler ────────────────────────────────────────
    router.use((err, _req, res, _next) => {
        sendCmsError(res, err);
    });
    return router;
}
//# sourceMappingURL=publicRouter.js.map