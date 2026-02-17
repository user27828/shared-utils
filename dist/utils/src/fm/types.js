/**
 * FM Core Types — shared-utils/utils/fm
 *
 * Canonical Zod schemas and TypeScript types for the File Manager system.
 * These are the single source of truth; db-supabase and consuming apps
 * should re-export or reference these.
 *
 * Mirrors the CMS types pattern in utils/src/cms/types.ts.
 */
import { z } from "zod";
// =============================================================================
// Enums & Constants
// =============================================================================
/** All recognised upload/file purpose values. */
export const FM_PURPOSES = [
    "resume",
    "job",
    "cms_asset",
    "cms_b64",
    "avatar",
    "generic",
];
/** Zod enum schema for {@link FM_PURPOSES}. */
export const FmPurposeSchema = z.enum(FM_PURPOSES);
/** File visibility levels. */
export const FM_VISIBILITY = ["private", "public"];
/** Zod enum schema for {@link FM_VISIBILITY}. */
export const FmVisibilitySchema = z.enum(FM_VISIBILITY);
/** Recognised variant kinds for image derivatives. */
export const FM_VARIANT_KINDS = [
    "original",
    "thumb",
    "preview",
    "web",
];
/** Zod enum schema for {@link FM_VARIANT_KINDS}. */
export const FmVariantKindSchema = z.enum(FM_VARIANT_KINDS);
// =============================================================================
// Row types (match db schema: fm_files, fm_file_variants, fm_file_links)
// =============================================================================
/** Storage location identifier (e.g. "local" or "s3"). 1-64 chars. */
export const FmStorageLocationSchema = z.string().min(1).max(64);
/** Zod schema for an `fm_files` database row. */
export const FmFileRowSchema = z
    .object({
    uid: z.string().min(1),
    owner_user_uid: z.string().uuid().nullable(),
    created_by: z.string().uuid().nullable(),
    original_filename: z.string(),
    title: z.string(),
    alt_text: z.string(),
    tags: z.array(z.string()).optional(),
    storage_location: FmStorageLocationSchema,
    storage_key: z.string(),
    byte_size: z.number().int(),
    mime_type: z.string(),
    sha256: z.string(),
    is_public: z.boolean(),
    /** Upload purpose (e.g. resume, job, cms_asset, avatar, generic). Nullable for legacy rows. */
    purpose: FmPurposeSchema.nullable().optional(),
    archived_at: z.string().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
})
    .passthrough();
/** Zod schema for an `fm_file_variants` database row. */
export const FmFileVariantRowSchema = z
    .object({
    uid: z.string().min(1),
    variant_of_uid: z.string().min(1),
    variant_kind: FmVariantKindSchema,
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    transform: z.record(z.string(), z.unknown()),
    storage_location: FmStorageLocationSchema,
    storage_key: z.string(),
    byte_size: z.number().int(),
    mime_type: z.string(),
    created_at: z.string().optional(),
})
    .passthrough();
// =============================================================================
// Object Reference
// =============================================================================
/** Zod schema for a storage object reference (bucket + objectKey). */
export const FmObjectRefSchema = z
    .object({
    bucket: z.string().min(1),
    objectKey: z.string().min(1),
})
    .strict();
// =============================================================================
// Upload DTOs (init / finalize)
// =============================================================================
/** Optional client-supplied hint for where to store the uploaded file. */
export const FmDestinationHintSchema = z
    .object({
    bucket: z.string().min(1).max(128).optional(),
    prefix: z.string().min(0).max(512).optional(),
})
    .strict();
/** Request body for `POST /files/upload/init` — starts a new file upload. */
export const FmUploadInitRequestSchema = z
    .object({
    purpose: FmPurposeSchema.optional(),
    originalFilename: z.string().min(1).max(1024),
    mimeType: z.string().min(1).max(255),
    sizeBytes: z.number().int().nonnegative(),
    visibility: FmVisibilitySchema.optional(),
    folderPath: z.string().max(1024).optional(),
    destinationHint: FmDestinationHintSchema.optional(),
})
    .strict();
/** Upload mode: "direct" (pre-signed PUT to S3) or "proxied" (server receives bytes). */
export const FmUploadModeSchema = z.enum(["direct", "proxied"]);
/** Pre-signed PUT URL returned for direct-to-S3 uploads. */
export const FmPresignedPutSchema = z
    .object({
    method: z.literal("PUT"),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).optional(),
    expiresAtIso: z.string().min(10),
})
    .strict();
/** Response from `POST /files/upload/init`. */
export const FmUploadInitResponseSchema = z
    .object({
    fileUid: z.string().min(1),
    mode: FmUploadModeSchema,
    object: FmObjectRefSchema,
    presignedPut: FmPresignedPutSchema.optional(),
})
    .strict();
/** Request body for `POST /files/upload/finalize` — completes a file upload. */
export const FmUploadFinalizeRequestSchema = z
    .object({
    fileUid: z.string().min(1),
    object: FmObjectRefSchema,
    /** Client-computed SHA-256 hex digest (used for S3 direct uploads). */
    sha256: z.string().min(1).optional(),
})
    .strict();
/** Response from `POST /files/upload/finalize`. */
export const FmUploadFinalizeResponseSchema = z
    .object({
    file: FmFileRowSchema,
    variants: z.array(FmFileVariantRowSchema).optional(),
})
    .strict();
// =============================================================================
// Variant upload DTOs (init / finalize)
// =============================================================================
/** Request body for `POST /files/:fileUid/variants/upload/init`. */
export const FmVariantUploadInitRequestSchema = z
    .object({
    purpose: FmPurposeSchema.optional(),
    variantOfUid: z.string().min(1),
    variantKind: FmVariantKindSchema,
    originalFilename: z.string().min(1).max(1024),
    mimeType: z.string().min(1).max(255),
    sizeBytes: z.number().int().nonnegative(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    transform: z.record(z.string(), z.unknown()).optional(),
})
    .strict();
/** Response from `POST /files/:fileUid/variants/upload/init`. */
export const FmVariantUploadInitResponseSchema = z
    .object({
    variantUid: z.string().min(1),
    mode: FmUploadModeSchema,
    object: FmObjectRefSchema,
    presignedPut: FmPresignedPutSchema.optional(),
})
    .strict();
/** Request body for `POST /files/:fileUid/variants/upload/finalize`. */
export const FmVariantUploadFinalizeRequestSchema = z
    .object({
    variantUid: z.string().min(1),
    object: FmObjectRefSchema,
})
    .strict();
/** Response from `POST /files/:fileUid/variants/upload/finalize`. */
export const FmVariantUploadFinalizeResponseSchema = z
    .object({
    variant: FmFileVariantRowSchema,
})
    .strict();
// =============================================================================
// Patch / Move / Link request schemas (Zod)
// =============================================================================
/** POST /files/:fileUid/rename — rename original filename (metadata). */
export const FmFileRenameRequestSchema = z
    .object({
    original_filename: z.string().min(1).max(1024).optional(),
    originalFilename: z.string().min(1).max(1024).optional(),
})
    .strict()
    .refine((d) => d.original_filename || d.originalFilename, {
    message: "originalFilename is required",
});
/** PATCH /files/:fileUid — user-updateable metadata fields only. */
export const FmFilePatchRequestSchema = z
    .object({
    title: z.string().max(1024).optional(),
    alt_text: z.string().max(2048).optional(),
    altText: z.string().max(2048).optional(), // camelCase alias
    tags: z.array(z.string().max(128)).max(50).optional(),
    is_public: z.union([z.boolean(), z.string(), z.number()]).optional(),
    isPublic: z.union([z.boolean(), z.string(), z.number()]).optional(), // camelCase alias
})
    .strict();
/** POST /files/:fileUid/move */
export const FmMoveRequestSchema = z
    .object({
    toBucket: z.string().min(1).max(128).optional(),
    toFolderPath: z.string().max(512).optional(),
})
    .strict()
    .refine((d) => d.toBucket || d.toFolderPath, {
    message: "At least one of toBucket or toFolderPath is required",
});
/** POST /files/:fileUid/links */
export const FmLinkCreateRequestSchema = z
    .object({
    linked_entity_type: z.string().min(1).max(128).optional(),
    linkedEntityType: z.string().min(1).max(128).optional(), // camelCase alias
    linked_entity_uid: z.string().min(1).max(128).optional(),
    linkedEntityUid: z.string().min(1).max(128).optional(), // camelCase alias
    linked_field: z.string().max(128).optional(),
    linkedField: z.string().max(128).optional(), // camelCase alias
})
    .strict()
    .refine((d) => (d.linked_entity_type || d.linkedEntityType) &&
    (d.linked_entity_uid || d.linkedEntityUid), { message: "linked_entity_type and linked_entity_uid are required" });
/** DELETE /files/:fileUid/links (body or query params) */
export const FmLinkDeleteRequestSchema = z
    .object({
    linked_entity_type: z.string().min(1).max(128).optional(),
    linkedEntityType: z.string().min(1).max(128).optional(),
    linked_entity_uid: z.string().min(1).max(128).optional(),
    linkedEntityUid: z.string().min(1).max(128).optional(),
    linked_field: z.string().max(128).optional(),
    linkedField: z.string().max(128).optional(),
})
    .strict()
    .refine((d) => (d.linked_entity_type || d.linkedEntityType) &&
    (d.linked_entity_uid || d.linkedEntityUid), { message: "linked_entity_type and linked_entity_uid are required" });
