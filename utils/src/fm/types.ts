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
  "avatar",
  "generic",
] as const;

/** Zod enum schema for {@link FM_PURPOSES}. */
export const FmPurposeSchema = z.enum(FM_PURPOSES);
export type FmPurpose = z.infer<typeof FmPurposeSchema>;

/** File visibility levels. */
export const FM_VISIBILITY = ["private", "public"] as const;
/** Zod enum schema for {@link FM_VISIBILITY}. */
export const FmVisibilitySchema = z.enum(FM_VISIBILITY);
export type FmVisibility = z.infer<typeof FmVisibilitySchema>;

/** Recognised variant kinds for image derivatives. */
export const FM_VARIANT_KINDS = [
  "original",
  "thumb",
  "preview",
  "web",
] as const;

/** Zod enum schema for {@link FM_VARIANT_KINDS}. */
export const FmVariantKindSchema = z.enum(FM_VARIANT_KINDS);
export type FmVariantKind = z.infer<typeof FmVariantKindSchema>;

// =============================================================================
// Row types (match db schema: fm_files, fm_file_variants, fm_file_links)
// =============================================================================

/** Storage location identifier (e.g. "local" or "s3"). 1-64 chars. */
export const FmStorageLocationSchema = z.string().min(1).max(64);
export type FmStorageLocation = z.infer<typeof FmStorageLocationSchema>;

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

export type FmFileRow = z.infer<typeof FmFileRowSchema>;

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

export type FmFileVariantRow = z.infer<typeof FmFileVariantRowSchema>;

/** Plain interface for an `fm_file_links` database row. */
export interface FmFileLinkRow {
  id: number;
  file_uid: string;
  linked_entity_type: string;
  linked_entity_uid: string;
  linked_field?: string | null;
  created_by?: string | null;
  created_at?: string;
}

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

export type FmObjectRef = z.infer<typeof FmObjectRefSchema>;

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

export type FmDestinationHint = z.infer<typeof FmDestinationHintSchema>;

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

export type FmUploadInitRequest = z.infer<typeof FmUploadInitRequestSchema>;

/** Upload mode: "direct" (pre-signed PUT to S3) or "proxied" (server receives bytes). */
export const FmUploadModeSchema = z.enum(["direct", "proxied"]);
export type FmUploadMode = z.infer<typeof FmUploadModeSchema>;

/** Pre-signed PUT URL returned for direct-to-S3 uploads. */
export const FmPresignedPutSchema = z
  .object({
    method: z.literal("PUT"),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).optional(),
    expiresAtIso: z.string().min(10),
  })
  .strict();

export type FmPresignedPut = z.infer<typeof FmPresignedPutSchema>;

/** Response from `POST /files/upload/init`. */
export const FmUploadInitResponseSchema = z
  .object({
    fileUid: z.string().min(1),
    mode: FmUploadModeSchema,
    object: FmObjectRefSchema,
    presignedPut: FmPresignedPutSchema.optional(),
  })
  .strict();

export type FmUploadInitResponse = z.infer<typeof FmUploadInitResponseSchema>;

/** Request body for `POST /files/upload/finalize` — completes a file upload. */
export const FmUploadFinalizeRequestSchema = z
  .object({
    fileUid: z.string().min(1),
    object: FmObjectRefSchema,
    /** Client-computed SHA-256 hex digest (used for S3 direct uploads). */
    sha256: z.string().min(1).optional(),
  })
  .strict();

export type FmUploadFinalizeRequest = z.infer<
  typeof FmUploadFinalizeRequestSchema
>;

/** Response from `POST /files/upload/finalize`. */
export const FmUploadFinalizeResponseSchema = z
  .object({
    file: FmFileRowSchema,
    variants: z.array(FmFileVariantRowSchema).optional(),
  })
  .strict();

export type FmUploadFinalizeResponse = z.infer<
  typeof FmUploadFinalizeResponseSchema
>;

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

export type FmVariantUploadInitRequest = z.infer<
  typeof FmVariantUploadInitRequestSchema
>;

/** Response from `POST /files/:fileUid/variants/upload/init`. */
export const FmVariantUploadInitResponseSchema = z
  .object({
    variantUid: z.string().min(1),
    mode: FmUploadModeSchema,
    object: FmObjectRefSchema,
    presignedPut: FmPresignedPutSchema.optional(),
  })
  .strict();

export type FmVariantUploadInitResponse = z.infer<
  typeof FmVariantUploadInitResponseSchema
>;

/** Request body for `POST /files/:fileUid/variants/upload/finalize`. */
export const FmVariantUploadFinalizeRequestSchema = z
  .object({
    variantUid: z.string().min(1),
    object: FmObjectRefSchema,
  })
  .strict();

export type FmVariantUploadFinalizeRequest = z.infer<
  typeof FmVariantUploadFinalizeRequestSchema
>;

/** Response from `POST /files/:fileUid/variants/upload/finalize`. */
export const FmVariantUploadFinalizeResponseSchema = z
  .object({
    variant: FmFileVariantRowSchema,
  })
  .strict();

export type FmVariantUploadFinalizeResponse = z.infer<
  typeof FmVariantUploadFinalizeResponseSchema
>;

// =============================================================================
// Patch / Move / Link request schemas (Zod)
// =============================================================================

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

export type FmFilePatchRequest = z.infer<typeof FmFilePatchRequestSchema>;

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

export type FmMoveRequest = z.infer<typeof FmMoveRequestSchema>;

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
  .refine(
    (d) =>
      (d.linked_entity_type || d.linkedEntityType) &&
      (d.linked_entity_uid || d.linkedEntityUid),
    { message: "linked_entity_type and linked_entity_uid are required" },
  );

export type FmLinkCreateRequest = z.infer<typeof FmLinkCreateRequestSchema>;

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
  .refine(
    (d) =>
      (d.linked_entity_type || d.linkedEntityType) &&
      (d.linked_entity_uid || d.linkedEntityUid),
    { message: "linked_entity_type and linked_entity_uid are required" },
  );

export type FmLinkDeleteRequest = z.infer<typeof FmLinkDeleteRequestSchema>;

// =============================================================================
// Connector-specific types (insert, patch, filter, result)
// =============================================================================

/**
 * Insert input for fm_files. All required fields for file creation.
 * Excludes server-managed timestamps (created_at, updated_at).
 */
export interface FmFileInsert {
  uid: string;
  owner_user_uid: string | null;
  created_by: string | null;
  original_filename: string;
  title?: string;
  alt_text?: string;
  tags?: string[];
  storage_location: string;
  storage_key: string;
  byte_size: number;
  mime_type: string;
  sha256: string;
  is_public: boolean;
  purpose?: FmPurpose | null;
  archived_at?: string | null;
}

/**
 * Patch input for fm_files. Only user/service-updateable fields.
 */
export interface FmFilePatch {
  title?: string;
  alt_text?: string;
  tags?: string[];
  is_public?: boolean;
  purpose?: FmPurpose | null;
  archived_at?: string | null;
  storage_key?: string;
  storage_location?: string;
  byte_size?: number;
  mime_type?: string;
  sha256?: string;
  updated_at?: string;
}

/**
 * Insert input for fm_file_variants.
 * Excludes server-managed timestamps (created_at).
 */
export interface FmVariantInsert {
  uid: string;
  variant_of_uid: string;
  variant_kind: FmVariantKind;
  width: number | null;
  height: number | null;
  transform: Record<string, unknown>;
  storage_location: string;
  storage_key: string;
  byte_size: number;
  mime_type: string;
}

/**
 * Patch input for fm_file_variants. Only updateable fields.
 */
export interface FmVariantPatch {
  width?: number | null;
  height?: number | null;
  transform?: Record<string, unknown>;
  storage_key?: string;
  storage_location?: string;
  byte_size?: number;
  mime_type?: string;
}

/**
 * Insert input for fm_file_links.
 */
export interface FmFileLinkInsert {
  file_uid: string;
  linked_entity_type: string;
  linked_entity_uid: string;
  linked_field?: string;
  created_by?: string;
}

// =============================================================================
// List / Filter types
// =============================================================================

/** Whitelisted order-by columns for file listing. */
export type FmFilesOrderBy =
  | "created_at"
  | "updated_at"
  | "byte_size"
  | "original_filename"
  | "title";

/** Order direction for file listing. */
export type FmOrderDirection = "asc" | "desc";

/**
 * Filter parameters for listing files.
 * The `search` field is raw user input — connectors MUST sanitize it.
 */
export interface FmFileListFilters {
  /** Full-text search on title, alt_text, original_filename, uid. */
  search?: string;
  /** Scope to files owned by a specific user. */
  ownerUserUid?: string;
  /** Filter by public visibility. */
  isPublic?: boolean;
  /** Include archived files. Default: false. */
  includeArchived?: boolean;
  /** Page size limit. */
  limit?: number;
  /** Page offset. */
  offset?: number;
  /** Sort column. */
  orderBy?: FmFilesOrderBy;
  /** Sort direction. */
  orderDirection?: FmOrderDirection;
}

/**
 * Paginated file listing result.
 */
export interface FmFileListResult {
  items: FmFileRow[];
  totalCount: number;
  limit: number;
  offset: number;
}

/**
 * Filter parameters for listing file links.
 */
export interface FmFileLinkListFilters {
  limit?: number;
  offset?: number;
}

/**
 * Paginated file link listing result.
 */
export interface FmFileLinkListResult {
  items: FmFileLinkRow[];
  totalCount: number;
  limit: number;
  offset: number;
}

// =============================================================================
// Context types (used by FmServiceCore and routers)
// =============================================================================

/**
 * User context for FM operations. Populated from the consuming app's auth layer.
 */
export interface FmContext {
  /** Authenticated user UID. */
  userUid: string;
  /** Whether the user has admin privileges. */
  isAdmin: boolean;
  /** Optional creator identifier for audit trails. */
  createdBy?: string;
  /** Optional request identifier for logging/tracing. */
  requestId?: string;
}

// ─── Upload progress callback ─────────────────────────────────────────────

/** Callback for tracking upload progress (used by FmClient XHR fallback). */
export type FmUploadProgressCallback = (progress: {
  loaded: number;
  total: number;
}) => void;

/**
 * Post-write event emitted by FmServiceCore after mutations.
 * Used for app-specific side effects (e.g., audit logging, cache invalidation).
 */
export interface FmWriteEvent {
  action:
    | "upload"
    | "delete"
    | "move"
    | "archive"
    | "restore"
    | "variant-upload";
  fileUid: string;
  userUid: string;
  metadata?: Record<string, unknown>;
}
