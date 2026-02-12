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
] as const;
export const CmsPostTypeSchema = z.enum(CMS_POST_TYPES);
export type CmsPostType = z.infer<typeof CmsPostTypeSchema>;

export const CMS_STATUS = ["draft", "published", "trash"] as const;
export const CmsStatusSchema = z.enum(CMS_STATUS);
export type CmsStatus = z.infer<typeof CmsStatusSchema>;

export const CMS_CONTENT_TYPES = [
  "text/html",
  "text/markdown",
  "application/json",
  "text/plain",
] as const;
export const CmsContentTypeSchema = z.enum(CMS_CONTENT_TYPES);
export type CmsContentType = z.infer<typeof CmsContentTypeSchema>;

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

export type CmsHeadRow = z.infer<typeof CmsHeadRowSchema>;

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

export type CmsHistoryRow = z.infer<typeof CmsHistoryRowSchema>;

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
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    password: z.string().min(1).max(512).optional(),
  })
  .strict();

export type CmsCreateRequest = z.infer<typeof CmsCreateRequestSchema>;

export const CmsUpdateRequestSchema = CmsCreateRequestSchema.partial()
  .extend({
    confirmSlugChange: z.boolean().optional(),
  })
  .strict();

export type CmsUpdateRequest = z.infer<typeof CmsUpdateRequestSchema>;

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

export type CmsListRequest = z.infer<typeof CmsListRequestSchema>;

export interface CmsListResponse {
  items: CmsHeadRow[];
  totalCount: number;
  limit: number;
  offset: number;
}

export const CmsPublishRequestSchema = z
  .object({
    published_at: z.string().optional(),
  })
  .strict();

export type CmsPublishRequest = z.infer<typeof CmsPublishRequestSchema>;

// ─── Public payload ───────────────────────────────────────────────────────

export interface CmsPublicPayload {
  uid: string;
  post_type: CmsPostType;
  locale: string;
  slug: string;
  title: string;
  tags?: string[] | null;
  content_type: CmsContentType;
  published_at?: string | null;
  updated_at?: string;
  options?: unknown;
  sanitized_html?: string;
  markdown_html?: string;
  text?: string;
  json?: unknown;
}

// ─── Collaborator ─────────────────────────────────────────────────────────

export interface CmsCollaboratorRow {
  id: number;
  cms_uid: string;
  user_uid: string;
  role: string;
  created_at: string;
}

// ─── After-write event ───────────────────────────────────────────────────

export type CmsWriteEventType =
  | "create"
  | "update"
  | "publish"
  | "trash"
  | "restore"
  | "delete"
  | "history_restore";

export interface CmsAfterWriteEvent {
  type: CmsWriteEventType;
  uid: string;
  row?: CmsHeadRow;
  actorUserUid?: string | null;
}

// ─── Public head (lightweight read for 304/password gating) ──────────────

export interface CmsPublicHead {
  uid: string;
  post_type: string;
  locale: string;
  slug: string;
  status: string;
  etag: string | null;
  version_number: number | null;
  password_hash: string | null;
  password_version: number | null;
  published_at: string | null;
  archived_at: string | null;
}
