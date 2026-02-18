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
/** All recognised upload/file purpose values. */
export declare const FM_PURPOSES: readonly ["resume", "job", "cms_asset", "cms_b64", "avatar", "generic"];
/** Zod enum schema for {@link FM_PURPOSES}. */
export declare const FmPurposeSchema: z.ZodEnum<{
    resume: "resume";
    job: "job";
    cms_asset: "cms_asset";
    cms_b64: "cms_b64";
    avatar: "avatar";
    generic: "generic";
}>;
export type FmPurpose = z.infer<typeof FmPurposeSchema>;
/** File visibility levels. */
export declare const FM_VISIBILITY: readonly ["private", "public"];
/** Zod enum schema for {@link FM_VISIBILITY}. */
export declare const FmVisibilitySchema: z.ZodEnum<{
    private: "private";
    public: "public";
}>;
export type FmVisibility = z.infer<typeof FmVisibilitySchema>;
/** Recognised variant kinds for image derivatives. */
export declare const FM_VARIANT_KINDS: readonly ["original", "thumb", "preview", "web"];
/** Zod enum schema for {@link FM_VARIANT_KINDS}. */
export declare const FmVariantKindSchema: z.ZodEnum<{
    original: "original";
    thumb: "thumb";
    preview: "preview";
    web: "web";
}>;
export type FmVariantKind = z.infer<typeof FmVariantKindSchema>;
/** Storage location identifier (e.g. "local" or "s3"). 1-64 chars. */
export declare const FmStorageLocationSchema: z.ZodString;
export type FmStorageLocation = z.infer<typeof FmStorageLocationSchema>;
/** Zod schema for an `fm_files` database row. */
export declare const FmFileRowSchema: z.ZodObject<{
    uid: z.ZodString;
    owner_user_uid: z.ZodNullable<z.ZodString>;
    created_by: z.ZodNullable<z.ZodString>;
    original_filename: z.ZodString;
    title: z.ZodString;
    alt_text: z.ZodString;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    storage_location: z.ZodString;
    storage_key: z.ZodString;
    byte_size: z.ZodNumber;
    mime_type: z.ZodString;
    sha256: z.ZodString;
    is_public: z.ZodBoolean;
    purpose: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        resume: "resume";
        job: "job";
        cms_asset: "cms_asset";
        cms_b64: "cms_b64";
        avatar: "avatar";
        generic: "generic";
    }>>>;
    archived_at: z.ZodNullable<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type FmFileRow = z.infer<typeof FmFileRowSchema>;
/** Zod schema for an `fm_file_variants` database row. */
export declare const FmFileVariantRowSchema: z.ZodObject<{
    uid: z.ZodString;
    variant_of_uid: z.ZodString;
    variant_kind: z.ZodEnum<{
        original: "original";
        thumb: "thumb";
        preview: "preview";
        web: "web";
    }>;
    width: z.ZodNullable<z.ZodNumber>;
    height: z.ZodNullable<z.ZodNumber>;
    transform: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    storage_location: z.ZodString;
    storage_key: z.ZodString;
    byte_size: z.ZodNumber;
    mime_type: z.ZodString;
    created_at: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
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
/** Zod schema for a storage object reference (bucket + objectKey). */
export declare const FmObjectRefSchema: z.ZodObject<{
    bucket: z.ZodString;
    objectKey: z.ZodString;
}, z.core.$strict>;
export type FmObjectRef = z.infer<typeof FmObjectRefSchema>;
/** Optional client-supplied hint for where to store the uploaded file. */
export declare const FmDestinationHintSchema: z.ZodObject<{
    bucket: z.ZodOptional<z.ZodString>;
    prefix: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type FmDestinationHint = z.infer<typeof FmDestinationHintSchema>;
/** Request body for `POST /files/upload/init` — starts a new file upload. */
export declare const FmUploadInitRequestSchema: z.ZodObject<{
    purpose: z.ZodOptional<z.ZodEnum<{
        resume: "resume";
        job: "job";
        cms_asset: "cms_asset";
        cms_b64: "cms_b64";
        avatar: "avatar";
        generic: "generic";
    }>>;
    originalFilename: z.ZodString;
    mimeType: z.ZodString;
    sizeBytes: z.ZodNumber;
    visibility: z.ZodOptional<z.ZodEnum<{
        private: "private";
        public: "public";
    }>>;
    folderPath: z.ZodOptional<z.ZodString>;
    destinationHint: z.ZodOptional<z.ZodObject<{
        bucket: z.ZodOptional<z.ZodString>;
        prefix: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type FmUploadInitRequest = z.infer<typeof FmUploadInitRequestSchema>;
/** Upload mode: "direct" (pre-signed PUT to S3) or "proxied" (server receives bytes). */
export declare const FmUploadModeSchema: z.ZodEnum<{
    direct: "direct";
    proxied: "proxied";
}>;
export type FmUploadMode = z.infer<typeof FmUploadModeSchema>;
/** Pre-signed PUT URL returned for direct-to-S3 uploads. */
export declare const FmPresignedPutSchema: z.ZodObject<{
    method: z.ZodLiteral<"PUT">;
    url: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    expiresAtIso: z.ZodString;
}, z.core.$strict>;
export type FmPresignedPut = z.infer<typeof FmPresignedPutSchema>;
/** Response from `POST /files/upload/init`. */
export declare const FmUploadInitResponseSchema: z.ZodObject<{
    fileUid: z.ZodString;
    mode: z.ZodEnum<{
        direct: "direct";
        proxied: "proxied";
    }>;
    object: z.ZodObject<{
        bucket: z.ZodString;
        objectKey: z.ZodString;
    }, z.core.$strict>;
    presignedPut: z.ZodOptional<z.ZodObject<{
        method: z.ZodLiteral<"PUT">;
        url: z.ZodString;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        expiresAtIso: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type FmUploadInitResponse = z.infer<typeof FmUploadInitResponseSchema>;
/** Request body for `POST /files/upload/finalize` — completes a file upload. */
export declare const FmUploadFinalizeRequestSchema: z.ZodObject<{
    fileUid: z.ZodString;
    object: z.ZodObject<{
        bucket: z.ZodString;
        objectKey: z.ZodString;
    }, z.core.$strict>;
    sha256: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type FmUploadFinalizeRequest = z.infer<typeof FmUploadFinalizeRequestSchema>;
/** Response from `POST /files/upload/finalize`. */
export declare const FmUploadFinalizeResponseSchema: z.ZodObject<{
    file: z.ZodObject<{
        uid: z.ZodString;
        owner_user_uid: z.ZodNullable<z.ZodString>;
        created_by: z.ZodNullable<z.ZodString>;
        original_filename: z.ZodString;
        title: z.ZodString;
        alt_text: z.ZodString;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        storage_location: z.ZodString;
        storage_key: z.ZodString;
        byte_size: z.ZodNumber;
        mime_type: z.ZodString;
        sha256: z.ZodString;
        is_public: z.ZodBoolean;
        purpose: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
            resume: "resume";
            job: "job";
            cms_asset: "cms_asset";
            cms_b64: "cms_b64";
            avatar: "avatar";
            generic: "generic";
        }>>>;
        archived_at: z.ZodNullable<z.ZodString>;
        created_at: z.ZodOptional<z.ZodString>;
        updated_at: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>;
    variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        variant_of_uid: z.ZodString;
        variant_kind: z.ZodEnum<{
            original: "original";
            thumb: "thumb";
            preview: "preview";
            web: "web";
        }>;
        width: z.ZodNullable<z.ZodNumber>;
        height: z.ZodNullable<z.ZodNumber>;
        transform: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        storage_location: z.ZodString;
        storage_key: z.ZodString;
        byte_size: z.ZodNumber;
        mime_type: z.ZodString;
        created_at: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>>;
}, z.core.$strict>;
export type FmUploadFinalizeResponse = z.infer<typeof FmUploadFinalizeResponseSchema>;
/** Request body for `POST /files/:fileUid/variants/upload/init`. */
export declare const FmVariantUploadInitRequestSchema: z.ZodObject<{
    purpose: z.ZodOptional<z.ZodEnum<{
        resume: "resume";
        job: "job";
        cms_asset: "cms_asset";
        cms_b64: "cms_b64";
        avatar: "avatar";
        generic: "generic";
    }>>;
    variantOfUid: z.ZodString;
    variantKind: z.ZodEnum<{
        original: "original";
        thumb: "thumb";
        preview: "preview";
        web: "web";
    }>;
    originalFilename: z.ZodString;
    mimeType: z.ZodString;
    sizeBytes: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    transform: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
export type FmVariantUploadInitRequest = z.infer<typeof FmVariantUploadInitRequestSchema>;
/** Response from `POST /files/:fileUid/variants/upload/init`. */
export declare const FmVariantUploadInitResponseSchema: z.ZodObject<{
    variantUid: z.ZodString;
    mode: z.ZodEnum<{
        direct: "direct";
        proxied: "proxied";
    }>;
    object: z.ZodObject<{
        bucket: z.ZodString;
        objectKey: z.ZodString;
    }, z.core.$strict>;
    presignedPut: z.ZodOptional<z.ZodObject<{
        method: z.ZodLiteral<"PUT">;
        url: z.ZodString;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        expiresAtIso: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type FmVariantUploadInitResponse = z.infer<typeof FmVariantUploadInitResponseSchema>;
/** Request body for `POST /files/:fileUid/variants/upload/finalize`. */
export declare const FmVariantUploadFinalizeRequestSchema: z.ZodObject<{
    variantUid: z.ZodString;
    object: z.ZodObject<{
        bucket: z.ZodString;
        objectKey: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export type FmVariantUploadFinalizeRequest = z.infer<typeof FmVariantUploadFinalizeRequestSchema>;
/** Response from `POST /files/:fileUid/variants/upload/finalize`. */
export declare const FmVariantUploadFinalizeResponseSchema: z.ZodObject<{
    variant: z.ZodObject<{
        uid: z.ZodString;
        variant_of_uid: z.ZodString;
        variant_kind: z.ZodEnum<{
            original: "original";
            thumb: "thumb";
            preview: "preview";
            web: "web";
        }>;
        width: z.ZodNullable<z.ZodNumber>;
        height: z.ZodNullable<z.ZodNumber>;
        transform: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        storage_location: z.ZodString;
        storage_key: z.ZodString;
        byte_size: z.ZodNumber;
        mime_type: z.ZodString;
        created_at: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>;
}, z.core.$strict>;
export type FmVariantUploadFinalizeResponse = z.infer<typeof FmVariantUploadFinalizeResponseSchema>;
/** POST /files/:fileUid/rename — rename original filename (metadata). */
export declare const FmFileRenameRequestSchema: z.ZodObject<{
    original_filename: z.ZodOptional<z.ZodString>;
    originalFilename: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type FmFileRenameRequest = z.infer<typeof FmFileRenameRequestSchema>;
/** PATCH /files/:fileUid — user-updateable metadata fields only. */
export declare const FmFilePatchRequestSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    is_public: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString, z.ZodNumber]>>;
    isPublic: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString, z.ZodNumber]>>;
}, z.core.$strict>;
export type FmFilePatchRequest = z.infer<typeof FmFilePatchRequestSchema>;
/** POST /files/:fileUid/move */
export declare const FmMoveRequestSchema: z.ZodObject<{
    toBucket: z.ZodOptional<z.ZodString>;
    toFolderPath: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type FmMoveRequest = z.infer<typeof FmMoveRequestSchema>;
/** POST /files/:fileUid/links */
export declare const FmLinkCreateRequestSchema: z.ZodObject<{
    linked_entity_type: z.ZodOptional<z.ZodString>;
    linkedEntityType: z.ZodOptional<z.ZodString>;
    linked_entity_uid: z.ZodOptional<z.ZodString>;
    linkedEntityUid: z.ZodOptional<z.ZodString>;
    linked_field: z.ZodOptional<z.ZodString>;
    linkedField: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type FmLinkCreateRequest = z.infer<typeof FmLinkCreateRequestSchema>;
/** DELETE /files/:fileUid/links (body or query params) */
export declare const FmLinkDeleteRequestSchema: z.ZodObject<{
    linked_entity_type: z.ZodOptional<z.ZodString>;
    linkedEntityType: z.ZodOptional<z.ZodString>;
    linked_entity_uid: z.ZodOptional<z.ZodString>;
    linkedEntityUid: z.ZodOptional<z.ZodString>;
    linked_field: z.ZodOptional<z.ZodString>;
    linkedField: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type FmLinkDeleteRequest = z.infer<typeof FmLinkDeleteRequestSchema>;
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
    original_filename?: string;
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
/** Whitelisted order-by columns for file listing. */
export type FmFilesOrderBy = "created_at" | "updated_at" | "byte_size" | "original_filename" | "title";
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
    /**
     * When true, each returned file row will include a `variants` array
     * with its `fm_file_variants` rows. Useful for UI components that
     * need variant info (e.g. image-size picker) without extra round-trips.
     */
    includeVariants?: boolean;
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
    action: "upload" | "patch" | "delete" | "move" | "archive" | "restore" | "variant-upload";
    fileUid: string;
    userUid: string;
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map