/**
 * CMS Core Types — shared-utils
 *
 * Canonical Zod schemas and TypeScript types for the CMS system.
 * These are the single source of truth; db-supabase and consuming apps
 * should re-export or reference these.
 */
import { z } from "zod";
export declare const CMS_POST_TYPES: readonly ["post", "page", "general", "faq", "blog", "embed"];
export declare const CmsPostTypeSchema: z.ZodEnum<{
    post: "post";
    page: "page";
    general: "general";
    faq: "faq";
    blog: "blog";
    embed: "embed";
}>;
export type CmsPostType = z.infer<typeof CmsPostTypeSchema>;
export declare const CMS_STATUS: readonly ["draft", "published", "trash"];
export declare const CmsStatusSchema: z.ZodEnum<{
    draft: "draft";
    published: "published";
    trash: "trash";
}>;
export type CmsStatus = z.infer<typeof CmsStatusSchema>;
export declare const CMS_CONTENT_TYPES: readonly ["text/html", "text/markdown", "application/json", "text/plain"];
export declare const CmsContentTypeSchema: z.ZodEnum<{
    "text/html": "text/html";
    "text/markdown": "text/markdown";
    "application/json": "application/json";
    "text/plain": "text/plain";
}>;
export type CmsContentType = z.infer<typeof CmsContentTypeSchema>;
export declare const CmsHeadRowSchema: z.ZodObject<{
    uid: z.ZodString;
    userUid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    content_type: z.ZodOptional<z.ZodEnum<{
        "text/html": "text/html";
        "text/markdown": "text/markdown";
        "application/json": "application/json";
        "text/plain": "text/plain";
    }>>;
    slug: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodString>;
    post_type: z.ZodOptional<z.ZodEnum<{
        post: "post";
        page: "page";
        general: "general";
        faq: "faq";
        blog: "blog";
        embed: "embed";
    }>>;
    options: z.ZodOptional<z.ZodUnknown>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    password_hash: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    password_version: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
        trash: "trash";
    }>>;
    etag: z.ZodOptional<z.ZodString>;
    version_number: z.ZodOptional<z.ZodNumber>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    published_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    first_published_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    locked_by: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    locked_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    trashed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    trashed_by: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    archived_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
export type CmsHeadRow = z.infer<typeof CmsHeadRowSchema>;
export declare const CmsHistoryRowSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodNumber>;
    cms_uid: z.ZodString;
    revision: z.ZodNumber;
    snapshot: z.ZodUnknown;
    created_by: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    soft_deleted_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    soft_deleted_by: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    created_at: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type CmsHistoryRow = z.infer<typeof CmsHistoryRowSchema>;
export declare const CmsCreateRequestSchema: z.ZodObject<{
    uid: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    content: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    content_type: z.ZodEnum<{
        "text/html": "text/html";
        "text/markdown": "text/markdown";
        "application/json": "application/json";
        "text/plain": "text/plain";
    }>;
    slug: z.ZodString;
    locale: z.ZodString;
    post_type: z.ZodEnum<{
        post: "post";
        page: "page";
        general: "general";
        faq: "faq";
        blog: "blog";
        embed: "embed";
    }>;
    options: z.ZodOptional<z.ZodUnknown>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    password: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type CmsCreateRequest = z.infer<typeof CmsCreateRequestSchema>;
export declare const CmsUpdateRequestSchema: z.ZodObject<{
    uid: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    content_type: z.ZodOptional<z.ZodEnum<{
        "text/html": "text/html";
        "text/markdown": "text/markdown";
        "application/json": "application/json";
        "text/plain": "text/plain";
    }>>;
    slug: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodString>;
    post_type: z.ZodOptional<z.ZodEnum<{
        post: "post";
        page: "page";
        general: "general";
        faq: "faq";
        blog: "blog";
        embed: "embed";
    }>>;
    options: z.ZodOptional<z.ZodOptional<z.ZodUnknown>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    password: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    confirmSlugChange: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type CmsUpdateRequest = z.infer<typeof CmsUpdateRequestSchema>;
export declare const CmsListRequestSchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
        trash: "trash";
    }>>;
    post_type: z.ZodOptional<z.ZodEnum<{
        post: "post";
        page: "page";
        general: "general";
        faq: "faq";
        blog: "blog";
        embed: "embed";
    }>>;
    locale: z.ZodOptional<z.ZodString>;
    tag: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
    orderBy: z.ZodOptional<z.ZodEnum<{
        title: "title";
        slug: "slug";
        created_at: "created_at";
        updated_at: "updated_at";
        published_at: "published_at";
    }>>;
    orderDirection: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    includeTrash: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type CmsListRequest = z.infer<typeof CmsListRequestSchema>;
export interface CmsListResponse {
    items: CmsHeadRow[];
    totalCount: number;
    limit: number;
    offset: number;
}
export declare const CmsPublishRequestSchema: z.ZodObject<{
    published_at: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type CmsPublishRequest = z.infer<typeof CmsPublishRequestSchema>;
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
export interface CmsCollaboratorRow {
    id: number;
    cms_uid: string;
    user_uid: string;
    role: string;
    created_at: string;
}
export type CmsWriteEventType = "create" | "update" | "publish" | "trash" | "restore" | "delete" | "history_restore";
export interface CmsAfterWriteEvent {
    type: CmsWriteEventType;
    uid: string;
    row?: CmsHeadRow;
    actorUserUid?: string | null;
}
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
//# sourceMappingURL=types.d.ts.map