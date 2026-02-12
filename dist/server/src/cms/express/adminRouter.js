/**
 * CMS Admin Express Router Factory — shared-utils
 *
 * Creates a fully-wired Express router that exposes the complete
 * admin CMS HTTP contract.  The host app provides:
 *  - a CmsServiceCore instance (with its connector already wired)
 *  - an authz adapter (from createCmsAuthz)
 *  - optional hooks (onAfterWrite, bodyLimitBytes)
 *
 * Mount example:
 *   app.use("/api/admin/cms",
 *     express.json({ limit: "1mb" }),
 *     authMiddleware,
 *     cmsAdminRateLimitMiddleware,
 *     createCmsAdminRouter({ service, authz }),
 *   );
 */
import { Router } from "express";
import { isCmsError, cmsErrorToResponse } from "../../../../utils/src/cms/errors.js";
// ─── Helpers ──────────────────────────────────────────────────────────────
const ok = (res, data, status = 200) => {
    res.status(status).json({ success: true, data });
};
const setEtagHeader = (res, row) => {
    if (row?.etag) {
        res.set("ETag", row.etag);
    }
};
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
const parseIntOr = (val, fallback) => {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : fallback;
};
const parseBoolQuery = (val) => {
    if (val === "true" || val === "1") {
        return true;
    }
    if (val === "false" || val === "0") {
        return false;
    }
    return undefined;
};
// ─── Factory ──────────────────────────────────────────────────────────────
export function createCmsAdminRouter(cfg) {
    const { service, authz, onAfterWrite, bodyLimitBytes = 1_048_576 } = cfg;
    const router = Router();
    // ── Body size guard (non-safe methods) ────────────────────────────────
    router.use((req, res, next) => {
        if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
            return next();
        }
        const cl = parseInt(req.headers["content-length"] || "0", 10);
        if (cl > bodyLimitBytes) {
            res.status(413).json({ success: false, message: "Request body too large" });
            return;
        }
        try {
            const len = Buffer.byteLength(JSON.stringify(req.body ?? ""), "utf8");
            if (len > bodyLimitBytes) {
                res.status(413).json({ success: false, message: "Request body too large" });
                return;
            }
        }
        catch {
            res.status(400).json({ success: false, message: "Invalid request body" });
            return;
        }
        next();
    });
    // ── After-write helper ────────────────────────────────────────────────
    const fireAfterWrite = async (uid, event, actorUid, row, req) => {
        if (onAfterWrite) {
            try {
                await onAfterWrite({ uid, event, actorUid, row, req });
            }
            catch (hookErr) {
                // best-effort
                if (typeof console !== "undefined") {
                    console.warn("[CmsAdminRouter] onAfterWrite hook error:", hookErr);
                }
            }
        }
    };
    // ═══════════════════════════════════════════════════════════════════════
    //  LIST   GET /
    // ═══════════════════════════════════════════════════════════════════════
    router.get("/", authz.requireAuthor, async (req, res) => {
        try {
            const result = await service.list({
                q: req.query.q || undefined,
                status: req.query.status || undefined,
                post_type: req.query.post_type || undefined,
                locale: req.query.locale || undefined,
                tag: req.query.tag || undefined,
                limit: parseIntOr(req.query.limit, 50),
                offset: parseIntOr(req.query.offset, 0),
                orderBy: req.query.orderBy || "updated_at",
                orderDirection: req.query.orderDirection || "desc",
                includeTrash: parseBoolQuery(req.query.includeTrash),
            });
            ok(res, result);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  GET BY UID   GET /:uid
    // ═══════════════════════════════════════════════════════════════════════
    router.get("/:uid", authz.requireAuthor, async (req, res) => {
        try {
            const row = await service.getByUid(req.params.uid);
            setEtagHeader(res, row);
            ok(res, row);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  CREATE   POST /
    // ═══════════════════════════════════════════════════════════════════════
    router.post("/", authz.requireAuthor, async (req, res) => {
        try {
            const actor = authz.getActorContext(req);
            const row = await service.create({
                ...req.body,
                ownerUserUid: actor.userUid,
            });
            await fireAfterWrite(row.uid, "create", actor.userUid, row, req);
            setEtagHeader(res, row);
            ok(res, row, 201);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  UPDATE   PUT /:uid
    // ═══════════════════════════════════════════════════════════════════════
    router.put("/:uid", authz.requireAuthor, async (req, res) => {
        try {
            const ifMatch = req.headers["if-match"];
            const actor = authz.getActorContext(req);
            const row = await service.updateByUid({
                uid: req.params.uid,
                ...req.body,
                ifMatch,
                updatedBy: actor.userUid,
            });
            await fireAfterWrite(req.params.uid, "update", actor.userUid, row, req);
            setEtagHeader(res, row);
            ok(res, row);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  PUBLISH   POST /:uid/publish
    // ═══════════════════════════════════════════════════════════════════════
    router.post("/:uid/publish", authz.requirePublisher, async (req, res) => {
        try {
            const ifMatch = req.headers["if-match"];
            const actor = authz.getActorContext(req);
            const row = await service.publishByUid({
                uid: req.params.uid,
                ifMatch,
                ...req.body,
            });
            await fireAfterWrite(req.params.uid, "publish", actor.userUid, row, req);
            setEtagHeader(res, row);
            ok(res, row);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  TRASH   POST /:uid/trash
    // ═══════════════════════════════════════════════════════════════════════
    router.post("/:uid/trash", authz.requireAuthor, async (req, res) => {
        try {
            const ifMatch = req.headers["if-match"];
            const actor = authz.getActorContext(req);
            const row = await service.trashByUid({
                uid: req.params.uid,
                ifMatchHeader: ifMatch || "*",
                actorUserUid: actor.userUid,
            });
            await fireAfterWrite(req.params.uid, "trash", actor.userUid, row, req);
            ok(res, row);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  RESTORE  POST /:uid/restore
    // ═══════════════════════════════════════════════════════════════════════
    router.post("/:uid/restore", authz.requireAuthor, async (req, res) => {
        try {
            const ifMatch = req.headers["if-match"];
            const actor = authz.getActorContext(req);
            const row = await service.restoreByUid({
                uid: req.params.uid,
                ifMatchHeader: ifMatch || "*",
                actorUserUid: actor.userUid,
            });
            await fireAfterWrite(req.params.uid, "restore", actor.userUid, row, req);
            ok(res, row);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  DELETE   DELETE /:uid
    // ═══════════════════════════════════════════════════════════════════════
    router.delete("/:uid", authz.requireAuthor, async (req, res) => {
        try {
            const actor = authz.getActorContext(req);
            await service.deleteByUid({
                uid: req.params.uid,
                actorUserUid: actor.userUid,
            });
            await fireAfterWrite(req.params.uid, "delete", actor.userUid, null, req);
            ok(res, null);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  EMPTY TRASH   POST /trash/empty
    // ═══════════════════════════════════════════════════════════════════════
    router.post("/trash/empty", authz.requireAuthor, async (req, res) => {
        try {
            const limit = Math.min(parseIntOr(req.body?.limit ?? req.query.limit, 50), 200);
            const result = await service.emptyTrash({ limit });
            ok(res, result);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  LOCK   POST /:uid/lock
    // ═══════════════════════════════════════════════════════════════════════
    router.post("/:uid/lock", authz.requireAuthor, async (req, res) => {
        try {
            const actor = authz.getActorContext(req);
            const row = await service.lockByUid({
                uid: req.params.uid,
                actorUserUid: actor.userUid,
            });
            ok(res, row);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  UNLOCK   DELETE /:uid/lock
    // ═══════════════════════════════════════════════════════════════════════
    router.delete("/:uid/lock", authz.requireAuthor, async (req, res) => {
        try {
            const actor = authz.getActorContext(req);
            const row = await service.unlockByUid({
                uid: req.params.uid,
                actorUserUid: actor.userUid,
            });
            ok(res, row);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  COLLABORATORS   GET / PUT /:uid/collaborators
    // ═══════════════════════════════════════════════════════════════════════
    router.get("/:uid/collaborators", authz.requireAuthor, async (req, res) => {
        try {
            const result = await service.listCollaborators(req.params.uid);
            ok(res, result);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    router.put("/:uid/collaborators", authz.requireAuthor, async (req, res) => {
        try {
            const result = await service.replaceCollaborators(req.params.uid, req.body?.collaborators ?? []);
            ok(res, result);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  HISTORY   GET /:uid/history
    // ═══════════════════════════════════════════════════════════════════════
    router.get("/:uid/history", authz.requireAuthor, async (req, res) => {
        try {
            const result = await service.listHistory({
                cmsUid: req.params.uid,
                includeSoftDeleted: parseBoolQuery(req.query.includeSoftDeleted),
                limit: parseIntOr(req.query.limit, 50),
                offset: parseIntOr(req.query.offset, 0),
            });
            ok(res, result);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  RESTORE REVISION   POST /:uid/history/:historyId/restore
    // ═══════════════════════════════════════════════════════════════════════
    router.post("/:uid/history/:historyId/restore", authz.requireAuthor, async (req, res) => {
        try {
            const ifMatch = req.headers["if-match"];
            const actor = authz.getActorContext(req);
            const row = await service.restoreHistoryRevision({
                cmsUid: req.params.uid,
                historyId: parseInt(req.params.historyId, 10),
                ifMatchHeader: ifMatch,
                actorUserUid: actor.userUid,
            });
            await fireAfterWrite(req.params.uid, "history_restore", actor.userUid, row, req);
            setEtagHeader(res, row);
            ok(res, row);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  SOFT-DELETE REVISION   POST /:uid/history/:historyId/delete
    // ═══════════════════════════════════════════════════════════════════════
    router.post("/:uid/history/:historyId/delete", authz.requireAuthor, async (req, res) => {
        try {
            const actor = authz.getActorContext(req);
            const row = await service.softDeleteHistoryRevision({
                historyId: parseInt(req.params.historyId, 10),
                actorUserUid: actor.userUid,
            });
            ok(res, row);
        }
        catch (err) {
            sendCmsError(res, err);
        }
    });
    // ═══════════════════════════════════════════════════════════════════════
    //  HARD-DELETE REVISION   DELETE /:uid/history/:historyId
    // ═══════════════════════════════════════════════════════════════════════
    router.delete("/:uid/history/:historyId", authz.requireAuthor, async (req, res) => {
        try {
            await service.hardDeleteHistoryRevision(parseInt(req.params.historyId, 10));
            ok(res, null);
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
//# sourceMappingURL=adminRouter.js.map