/**
 * CMS Core Types — shared-utils
 *
 * Canonical Zod schemas and TypeScript types for the CMS system.
 * These are the single source of truth; db-supabase and consuming apps
 * should re-export or reference these.
 */
import { z } from "zod";
// ─── Enums ────────────────────────────────────────────────────────────────
export const CMS_POST_TYPES = [
    "post",
    "page",
    "general",
    "faq",
    "blog",
    "embed",
    "data",
    "docs",
    "kb",
    "other",
];
export const CmsPostTypeSchema = z.enum(CMS_POST_TYPES);
export const CMS_STATUS = ["draft", "published", "trash"];
export const CmsStatusSchema = z.enum(CMS_STATUS);
export const CMS_CONTENT_TYPES = [
    "text/html",
    "text/markdown",
    "application/json",
    "text/plain",
];
export const CmsContentTypeSchema = z.enum(CMS_CONTENT_TYPES);
// ─── Metadata schemas ─────────────────────────────────────────────────────
/** Version annotation attached to a specific save/revision. */
export const CmsVersionMetaSchema = z.object({
    version: z.string().max(256).nullable().optional(),
    notes: z.string().max(4096).nullable().optional(),
    dt_updated: z.string().optional(),
    user_uid: z.string().uuid().nullable().optional(),
});
/** Persistent content note (not tied to a specific version). */
export const CmsContentNoteSchema = z.object({
    note: z.string().min(1).max(4096),
    dt_updated: z.string(),
    user_uid: z.string().uuid().nullable().optional(),
});
/** Top-level metadata bag stored in the `cms.metadata` JSONB column. */
export const CmsMetadataSchema = z.object({
    version: CmsVersionMetaSchema.nullable().optional(),
    notes: z.array(CmsContentNoteSchema).optional(),
});
// ─── Row schemas ──────────────────────────────────────────────────────────
export const CmsHeadRowSchema = z
    .object({
    uid: z.string().min(1),
    userUid: z.string().uuid().nullable().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    content_type: CmsContentTypeSchema.optional(),
    slug: z.string().optional(),
    locale: z.string().optional(),
    post_type: CmsPostTypeSchema.optional(),
    options: z.unknown().optional(),
    metadata: z.unknown().optional(),
    tags: z.array(z.string()).nullable().optional(),
    password_hash: z.string().nullable().optional(),
    password_version: z.number().int().nonnegative().optional(),
    status: CmsStatusSchema.optional(),
    etag: z.string().optional(),
    version_number: z.number().int().nonnegative().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    published_at: z.string().nullable().optional(),
    first_published_at: z.string().nullable().optional(),
    locked_by: z.string().uuid().nullable().optional(),
    locked_at: z.string().nullable().optional(),
    // Trash/archive metadata (bug fix #4 from CMS-SPLIT plan)
    trashed_at: z.string().nullable().optional(),
    trashed_by: z.string().uuid().nullable().optional(),
    archived_at: z.string().nullable().optional(),
})
    .passthrough();
export const CmsHistoryRowSchema = z
    .object({
    id: z.number().int().optional(),
    cms_uid: z.string().min(1),
    revision: z.number().int().nonnegative(),
    snapshot: z.unknown(),
    created_by: z.string().uuid().nullable().optional(),
    soft_deleted_at: z.string().nullable().optional(),
    soft_deleted_by: z.string().uuid().nullable().optional(),
    created_at: z.string().optional(),
})
    .passthrough();
// ─── DTO schemas ──────────────────────────────────────────────────────────
export const CmsCreateRequestSchema = z
    .object({
    uid: z.string().min(1).optional(),
    title: z.string().min(0).max(512),
    content: z.string().optional().default(""),
    content_type: CmsContentTypeSchema,
    slug: z.string().min(1).max(256),
    locale: z.string().min(1).max(32),
    post_type: CmsPostTypeSchema,
    options: z.unknown().optional(),
    metadata: z.unknown().optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    password: z.string().min(1).max(512).optional(),
})
    .strict();
export const CmsUpdateRequestSchema = CmsCreateRequestSchema.partial()
    .extend({
    confirmSlugChange: z.boolean().optional(),
})
    .strict();
export const CmsListRequestSchema = z
    .object({
    q: z.string().min(0).max(128).optional(),
    status: CmsStatusSchema.optional(),
    post_type: CmsPostTypeSchema.optional(),
    locale: z.string().min(1).max(32).optional(),
    tag: z.string().min(1).max(40).optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
    orderBy: z
        .enum(["created_at", "updated_at", "published_at", "title", "slug"])
        .optional(),
    orderDirection: z.enum(["asc", "desc"]).optional(),
    includeTrash: z.boolean().optional(),
})
    .strict();
export const CmsPublishRequestSchema = z
    .object({
    published_at: z.string().optional(),
})
    .strict();
