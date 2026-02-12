"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmsServiceCore = void 0;
const nanoid_1 = require("nanoid");
const connector_js_1 = require("./connector.js");
const types_js_1 = require("../../../utils/src/cms/types.js");
const errors_js_1 = require("../../../utils/src/cms/errors.js");
const validation_js_1 = require("../../../utils/src/cms/validation.js");
const concurrency_js_1 = require("../../../utils/src/cms/concurrency.js");
const password_js_1 = require("../../../utils/src/cms/password.js");
const sanitization_js_1 = require("../../../utils/src/cms/sanitization.js");
const DEFAULT_LOCK_TTL_MS = 10 * 60 * 1000;
class CmsServiceCore {
    constructor(config) {
        this.connector = config.connector;
        this.reservedSlugs = config.reservedSlugs || [];
        this.onAfterWrite = config.onAfterWrite;
        this.lockTtlMs = config.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;
    }
    async list(params) {
        const parsed = types_js_1.CmsListRequestSchema.parse(params);
        return this.connector.list(parsed);
    }
    async getByUid(uid) {
        const row = await this.connector.getByUid(uid);
        if (!row) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${uid}`);
        }
        return row;
    }
    async create(input) {
        const parsed = types_js_1.CmsCreateRequestSchema.parse(input.request);
        const locale = (0, validation_js_1.normalizeLocale)(parsed.locale);
        const slug = (0, validation_js_1.canonicalizeSlug)(parsed.slug);
        (0, validation_js_1.assertValidSlug)(slug, this.reservedSlugs);
        (0, validation_js_1.assertAllowedContentType)(parsed.content_type);
        (0, validation_js_1.assertAllowedPostType)(parsed.post_type);
        const uid = parsed.uid || (0, nanoid_1.nanoid)(21);
        const version = 1;
        const etag = (0, concurrency_js_1.computeCmsEtag)(uid, version);
        const now = new Date().toISOString();
        let passwordHash = null;
        let passwordVersion = 0;
        if (parsed.password) {
            passwordHash = await (0, password_js_1.hashCmsPassword)(parsed.password);
            passwordVersion = 1;
        }
        const row = await this.connector.insert({
            uid,
            userUid: input.actorUserUid || null,
            title: parsed.title,
            content: parsed.content ?? "",
            content_type: parsed.content_type,
            slug,
            locale,
            post_type: parsed.post_type,
            options: parsed.options ?? null,
            tags: parsed.tags ?? null,
            password_hash: passwordHash,
            password_version: passwordVersion,
            status: "draft",
            etag,
            version_number: version,
            created_at: now,
            updated_at: now,
        });
        await this.fireAfterWrite({
            type: "create",
            uid,
            row,
            actorUserUid: input.actorUserUid,
        });
        return row;
    }
    async updateByUid(input) {
        const parsed = types_js_1.CmsUpdateRequestSchema.parse(input.patch);
        const current = await this.connector.getByUid(input.uid);
        if (!current) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        (0, concurrency_js_1.assertIfMatchSatisfied)({
            ifMatchHeader: input.ifMatchHeader,
            currentEtag: current.etag,
        });
        const dbPatch = {};
        const now = new Date().toISOString();
        if (parsed.title !== undefined) {
            dbPatch.title = parsed.title;
        }
        if (parsed.content !== undefined) {
            dbPatch.content = parsed.content;
        }
        if (parsed.content_type !== undefined) {
            (0, validation_js_1.assertAllowedContentType)(parsed.content_type);
            dbPatch.content_type = parsed.content_type;
        }
        if (parsed.locale !== undefined) {
            dbPatch.locale = (0, validation_js_1.normalizeLocale)(parsed.locale);
        }
        if (parsed.post_type !== undefined) {
            (0, validation_js_1.assertAllowedPostType)(parsed.post_type);
            dbPatch.post_type = parsed.post_type;
        }
        if (parsed.options !== undefined) {
            dbPatch.options = parsed.options;
        }
        if (parsed.tags !== undefined) {
            dbPatch.tags = parsed.tags;
        }
        if (parsed.slug !== undefined) {
            const newSlug = (0, validation_js_1.canonicalizeSlug)(parsed.slug);
            (0, validation_js_1.assertValidSlug)(newSlug, this.reservedSlugs);
            if (current.status === "published" &&
                newSlug !== current.slug &&
                !parsed.confirmSlugChange) {
                throw new errors_js_1.CmsConflictError("Slug change on published content requires confirmSlugChange: true");
            }
            dbPatch.slug = newSlug;
        }
        if (parsed.password !== undefined) {
            const hash = await (0, password_js_1.hashCmsPassword)(parsed.password);
            dbPatch.password_hash = hash;
            dbPatch.password_version = (current.password_version ?? 0) + 1;
        }
        const newVersion = (current.version_number ?? 0) + 1;
        dbPatch.version_number = newVersion;
        dbPatch.etag = (0, concurrency_js_1.computeCmsEtag)(input.uid, newVersion);
        dbPatch.updated_at = now;
        await this.createHistorySnapshot(current);
        const updated = await this.connector.updateByUid(input.uid, dbPatch);
        if (!updated) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found after update: ${input.uid}`);
        }
        await this.fireAfterWrite({
            type: "update",
            uid: input.uid,
            row: updated,
            actorUserUid: input.actorUserUid,
        });
        return updated;
    }
    async publishByUid(input) {
        const current = await this.connector.getByUid(input.uid);
        if (!current) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        (0, concurrency_js_1.assertIfMatchSatisfied)({
            ifMatchHeader: input.ifMatchHeader,
            currentEtag: current.etag,
        });
        const now = new Date().toISOString();
        const publishedAt = input.publishedAt || now;
        const newVersion = (current.version_number ?? 0) + 1;
        await this.createHistorySnapshot(current);
        const patch = {
            status: "published",
            published_at: publishedAt,
            first_published_at: current.first_published_at || publishedAt,
            version_number: newVersion,
            etag: (0, concurrency_js_1.computeCmsEtag)(input.uid, newVersion),
            updated_at: now,
        };
        const updated = await this.connector.updateByUid(input.uid, patch);
        if (!updated) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        await this.fireAfterWrite({
            type: "publish",
            uid: input.uid,
            row: updated,
            actorUserUid: input.actorUserUid,
        });
        return updated;
    }
    async trashByUid(input) {
        const current = await this.connector.getByUid(input.uid);
        if (!current) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        (0, concurrency_js_1.assertIfMatchSatisfied)({
            ifMatchHeader: input.ifMatchHeader,
            currentEtag: current.etag,
        });
        const now = new Date().toISOString();
        const newVersion = (current.version_number ?? 0) + 1;
        await this.createHistorySnapshot(current);
        const patch = {
            status: "trash",
            trashed_at: now,
            trashed_by: input.actorUserUid || null,
            version_number: newVersion,
            etag: (0, concurrency_js_1.computeCmsEtag)(input.uid, newVersion),
            updated_at: now,
        };
        const updated = await this.connector.updateByUid(input.uid, patch);
        if (!updated) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        await this.fireAfterWrite({
            type: "trash",
            uid: input.uid,
            row: updated,
            actorUserUid: input.actorUserUid,
        });
        return updated;
    }
    async restoreByUid(input) {
        const current = await this.connector.getByUid(input.uid);
        if (!current) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        (0, concurrency_js_1.assertIfMatchSatisfied)({
            ifMatchHeader: input.ifMatchHeader,
            currentEtag: current.etag,
        });
        const now = new Date().toISOString();
        const newVersion = (current.version_number ?? 0) + 1;
        await this.createHistorySnapshot(current);
        const patch = {
            status: "draft",
            trashed_at: null,
            trashed_by: null,
            version_number: newVersion,
            etag: (0, concurrency_js_1.computeCmsEtag)(input.uid, newVersion),
            updated_at: now,
        };
        const updated = await this.connector.updateByUid(input.uid, patch);
        if (!updated) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        await this.fireAfterWrite({
            type: "restore",
            uid: input.uid,
            row: updated,
            actorUserUid: input.actorUserUid,
        });
        return updated;
    }
    async deleteByUid(input) {
        const current = await this.connector.getByUid(input.uid);
        if (!current) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        if (current.status !== "trash") {
            throw new errors_js_1.CmsValidationError("Item must be trashed before permanent deletion", { status: "Item status must be 'trash' to delete permanently" });
        }
        await this.connector.deleteByUid(input.uid);
        await this.fireAfterWrite({
            type: "delete",
            uid: input.uid,
            actorUserUid: input.actorUserUid,
        });
    }
    async emptyTrash(input) {
        const limit = Math.min(Math.max(input?.limit ?? 100, 1), 500);
        const result = await this.connector.list({
            status: "trash",
            limit,
            offset: 0,
        });
        let deletedCount = 0;
        for (const item of result.items) {
            try {
                await this.connector.deleteByUid(item.uid);
                deletedCount++;
                await this.fireAfterWrite({
                    type: "delete",
                    uid: item.uid,
                    actorUserUid: input?.actorUserUid,
                });
            }
            catch {
            }
        }
        return { deletedCount };
    }
    async lockByUid(input) {
        const current = await this.connector.getByUid(input.uid);
        if (!current) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        if (current.locked_by && current.locked_by !== input.actorUserUid) {
            if (current.locked_at) {
                const lockedAt = new Date(current.locked_at).getTime();
                const now = Date.now();
                if (now - lockedAt < this.lockTtlMs) {
                    throw new errors_js_1.CmsLockedError("Content is locked by another user", current.locked_by, current.locked_at);
                }
            }
        }
        const now = new Date().toISOString();
        const updated = await this.connector.updateByUid(input.uid, {
            locked_by: input.actorUserUid,
            locked_at: now,
        });
        if (!updated) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        return updated;
    }
    async unlockByUid(input) {
        const current = await this.connector.getByUid(input.uid);
        if (!current) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        if (current.locked_by &&
            current.locked_by !== input.actorUserUid &&
            !input.force) {
            throw new errors_js_1.CmsLockedError("Cannot unlock: locked by another user", current.locked_by, current.locked_at ?? undefined);
        }
        const updated = await this.connector.updateByUid(input.uid, {
            locked_by: null,
            locked_at: null,
        });
        if (!updated) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.uid}`);
        }
        return updated;
    }
    async listHistory(params) {
        return this.connector.listHistory({
            cmsUid: params.cmsUid,
            limit: Math.min(params.limit ?? 50, 200),
            offset: params.offset ?? 0,
            includeSoftDeleted: params.includeSoftDeleted,
        });
    }
    async restoreHistoryRevision(input) {
        const current = await this.connector.getByUid(input.cmsUid);
        if (!current) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.cmsUid}`);
        }
        (0, concurrency_js_1.assertIfMatchSatisfied)({
            ifMatchHeader: input.ifMatchHeader,
            currentEtag: current.etag,
        });
        const historyRow = await this.connector.getHistoryById(input.historyId);
        if (!historyRow || historyRow.cms_uid !== input.cmsUid) {
            throw new errors_js_1.CmsNotFoundError(`History revision not found: ${input.historyId}`);
        }
        const snapshot = historyRow.snapshot;
        if (!snapshot || typeof snapshot !== "object") {
            throw new errors_js_1.CmsValidationError("Invalid history snapshot");
        }
        await this.createHistorySnapshot(current);
        const now = new Date().toISOString();
        const newVersion = (current.version_number ?? 0) + 1;
        const patch = {
            title: snapshot.title,
            content: snapshot.content,
            content_type: snapshot.content_type,
            slug: snapshot.slug,
            locale: snapshot.locale,
            post_type: snapshot.post_type,
            options: snapshot.options,
            tags: snapshot.tags,
            version_number: newVersion,
            etag: (0, concurrency_js_1.computeCmsEtag)(input.cmsUid, newVersion),
            updated_at: now,
        };
        const updated = await this.connector.updateByUid(input.cmsUid, patch);
        if (!updated) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${input.cmsUid}`);
        }
        await this.fireAfterWrite({
            type: "history_restore",
            uid: input.cmsUid,
            row: updated,
            actorUserUid: input.actorUserUid,
        });
        return updated;
    }
    async softDeleteHistoryRevision(input) {
        const row = await this.connector.getHistoryById(input.historyId);
        if (!row) {
            throw new errors_js_1.CmsNotFoundError(`History revision not found: ${input.historyId}`);
        }
        const updated = await this.connector.updateHistoryById(input.historyId, {
            soft_deleted_at: new Date().toISOString(),
            soft_deleted_by: input.actorUserUid || null,
        });
        if (!updated) {
            throw new errors_js_1.CmsNotFoundError(`History revision not found: ${input.historyId}`);
        }
        return updated;
    }
    async hardDeleteHistoryRevision(historyId) {
        const row = await this.connector.getHistoryById(historyId);
        if (!row) {
            throw new errors_js_1.CmsNotFoundError(`History revision not found: ${historyId}`);
        }
        await this.connector.deleteHistoryById(historyId);
    }
    async listCollaborators(cmsUid) {
        return this.connector.listCollaborators(cmsUid);
    }
    async replaceCollaborators(cmsUid, collaborators) {
        const current = await this.connector.getByUid(cmsUid);
        if (!current) {
            throw new errors_js_1.CmsNotFoundError(`CMS item not found: ${cmsUid}`);
        }
        return this.connector.replaceCollaborators(cmsUid, collaborators);
    }
    async getPublicPayloadBySlug(params) {
        const row = await this.connector.getPublishedBySlug(params);
        if (!row) {
            return null;
        }
        return this.renderPublicPayload(row);
    }
    async getPublicHead(params) {
        if ((0, connector_js_1.hasPublicHead)(this.connector)) {
            return this.connector.getPublicHeadBySlug(params);
        }
        const row = await this.connector.getPublishedBySlug(params);
        if (!row) {
            return null;
        }
        return {
            uid: row.uid,
            post_type: row.post_type ?? params.postType,
            locale: row.locale ?? params.locale,
            slug: row.slug ?? params.slug,
            status: row.status ?? "published",
            etag: row.etag ?? null,
            version_number: row.version_number ?? null,
            password_hash: row.password_hash ?? null,
            password_version: row.password_version ?? null,
            published_at: row.published_at ?? null,
            archived_at: row.archived_at ?? null,
        };
    }
    async renderPublicPayload(row) {
        const payload = {
            uid: row.uid,
            post_type: row.post_type,
            locale: row.locale,
            slug: row.slug,
            title: row.title ?? "",
            tags: row.tags,
            content_type: row.content_type,
            published_at: row.published_at,
            updated_at: row.updated_at,
            options: row.options,
        };
        const content = row.content ?? "";
        switch (row.content_type) {
            case "text/html":
                payload.sanitized_html = (0, sanitization_js_1.sanitizeCmsHtml)(content);
                break;
            case "text/markdown":
                payload.markdown_html = await (0, sanitization_js_1.renderMarkdownToSanitizedHtml)(content);
                break;
            case "application/json":
                try {
                    payload.json = content ? JSON.parse(content) : null;
                }
                catch {
                    payload.json = null;
                }
                break;
            case "text/plain":
                payload.text = content;
                break;
        }
        return payload;
    }
    async createHistorySnapshot(row) {
        try {
            const snapshot = this.buildHistorySnapshot(row);
            await this.connector.insertHistory({
                cms_uid: row.uid,
                revision: (row.version_number ?? 0),
                snapshot,
                created_by: row.userUid || null,
            });
        }
        catch (err) {
            if (typeof globalThis !== "undefined" && globalThis.log) {
                globalThis.log.warn("CMS history snapshot failed:", err);
            }
        }
    }
    buildHistorySnapshot(row) {
        return {
            uid: row.uid,
            title: row.title ?? "",
            content: row.content ?? "",
            content_type: row.content_type ?? null,
            slug: row.slug ?? null,
            locale: row.locale ?? null,
            post_type: row.post_type ?? null,
            options: row.options ?? null,
            tags: row.tags ?? null,
            status: row.status ?? null,
            etag: row.etag ?? null,
            version_number: row.version_number ?? null,
            updated_at: row.updated_at ?? null,
            published_at: row.published_at ?? null,
            first_published_at: row.first_published_at ?? null,
            password_version: row.password_version ?? null,
        };
    }
    async fireAfterWrite(event) {
        if (!this.onAfterWrite) {
            return;
        }
        try {
            await this.onAfterWrite(event);
        }
        catch (err) {
            if (typeof globalThis !== "undefined" && globalThis.log) {
                globalThis.log.warn("CMS onAfterWrite hook error:", err);
            }
        }
    }
}
exports.CmsServiceCore = CmsServiceCore;
//# sourceMappingURL=CmsServiceCore.js.map