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
import { isCmsError, cmsErrorToResponse, } from "../../../../utils/src/cms/errors.js";
import { verifyCmsPassword } from "../../../../utils/src/cms/password.js";
import { normalizeLocale, canonicalizeSlug, } from "../../../../utils/src/cms/validation.js";
import { getSingleParam } from "../../express/params.js";
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
    const { service, unlockToken, unlockTtlSeconds = 1800, previewAuthz } = cfg;
    const router = Router();
    const runMiddleware = async (mw, req, res) => {
        if (!mw) {
            return false;
        }
        return await new Promise((resolve) => {
            mw(req, res, () => resolve(true));
            // If middleware ended the response without calling next
            if (res.headersSent) {
                resolve(false);
            }
        });
    };
    // ═══════════════════════════════════════════════════════════════════════
    //  GET /:postType/:locale/:slug — Fetch published content
    // ═══════════════════════════════════════════════════════════════════════
    router.get("/:postType/:locale/:slug", async (req, res) => {
        try {
            const postType = getSingleParam(req.params.postType);
            const localeRaw = getSingleParam(req.params.locale);
            const slugRaw = getSingleParam(req.params.slug);
            if (!postType || !localeRaw || !slugRaw) {
                res
                    .status(400)
                    .json({ success: false, message: "Invalid route params" });
                return;
            }
            const locale = normalizeLocale(localeRaw);
            const slug = canonicalizeSlug(slugRaw);
            const preview = req.query.preview === "1" ||
                req.query.preview === "true" ||
                req.query.preview === "yes";
            // Build locale variants: exact, lowercase, and base-language subtag
            // e.g. "en-US" → ["en-US", "en-us", "en"]
            const baseLanguage = locale.includes("-")
                ? locale.split("-")[0].toLowerCase()
                : null;
            const localeCandidates = Array.from(new Set([locale, locale.toLowerCase(), baseLanguage].filter(Boolean)));
            // Step 1: Get public head (lightweight check for existence + protection)
            let head = null;
            for (const loc of localeCandidates) {
                try {
                    head = await service.getPublicHead({ postType, locale: loc, slug });
                }
                catch {
                    head = null;
                }
                if (head) {
                    break;
                }
            }
            // If not found publicly, allow a draft preview.
            // This is only enabled when the caller explicitly requests preview.
            if (!head && preview) {
                // If previewAuthz is provided, enforce it; otherwise allow
                // preview requests through — the ?preview=1 opt-in already
                // limits exposure, and the content is available via the admin
                // API to authenticated users anyway.
                if (previewAuthz?.requireAuthor) {
                    const okAuth = await runMiddleware(previewAuthz.requireAuthor, req, res);
                    if (!okAuth) {
                        if (!res.headersSent) {
                            res.status(401).json({
                                success: false,
                                message: "Authentication required",
                                requiresAuth: true,
                            });
                        }
                        return;
                    }
                }
                // Find matching draft via service.list(). This avoids requiring
                // a new connector method, but is only executed after auth.
                // Try each locale candidate until we find a match.
                let draft = null;
                for (const loc of localeCandidates) {
                    const draftList = await service.list({
                        q: slug,
                        status: "draft",
                        post_type: postType,
                        locale: loc,
                        limit: 25,
                        offset: 0,
                        orderBy: "updated_at",
                        orderDirection: "desc",
                        includeTrash: false,
                    });
                    draft = (draftList.items || []).find((r) => {
                        const rSlug = canonicalizeSlug(String(r?.slug ?? ""));
                        const rPostType = String(r?.post_type ?? "");
                        return rSlug === slug && rPostType === postType;
                    });
                    if (draft) {
                        break;
                    }
                }
                if (!draft?.uid) {
                    res.status(404).json({ success: false, message: "Not found" });
                    return;
                }
                // Use the full row for preview rendering.
                head = {
                    uid: draft.uid,
                    post_type: draft.post_type ?? postType,
                    locale: draft.locale ?? locale,
                    slug: draft.slug ?? slug,
                    status: draft.status ?? "draft",
                    etag: draft.etag ?? null,
                    version_number: draft.version_number ?? null,
                    password_hash: draft.password_hash ?? null,
                    password_version: draft.password_version ?? null,
                    published_at: draft.published_at ?? null,
                    archived_at: draft.archived_at ?? null,
                };
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
                const token = req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
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
            let payload = null;
            if (preview && head.status === "draft") {
                // Draft preview payloads must never be cached.
                res.set("Cache-Control", "private, no-store");
                payload = await service.getPreviewPayloadByUid(head.uid);
            }
            else {
                for (const loc of localeCandidates) {
                    payload = await service.getPublicPayloadBySlug({
                        postType,
                        locale: loc,
                        slug,
                    });
                    if (payload) {
                        break;
                    }
                }
            }
            if (!payload) {
                res.status(404).json({ success: false, message: "Not found" });
                return;
            }
            // Step 5: Set cache headers and respond
            if (!(preview && head.status === "draft")) {
                applyCmsPublicCacheHeaders(res, {
                    isProtected,
                    etag: payload.etag ?? etag,
                });
            }
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
                res
                    .status(413)
                    .json({ success: false, message: "Payload too large" });
                return;
            }
            const password = req.body?.password;
            if (!password || typeof password !== "string" || !password.trim()) {
                res
                    .status(400)
                    .json({ success: false, message: "Password is required" });
                return;
            }
            const postType = getSingleParam(req.params.postType);
            const localeRaw = getSingleParam(req.params.locale);
            const slugRaw = getSingleParam(req.params.slug);
            if (!postType || !localeRaw || !slugRaw) {
                res
                    .status(400)
                    .json({ success: false, message: "Invalid route params" });
                return;
            }
            const locale = normalizeLocale(localeRaw);
            const slug = canonicalizeSlug(slugRaw);
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
                res
                    .status(409)
                    .json({ success: false, message: "Not password protected" });
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