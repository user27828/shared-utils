/**
 * FM Core Utilities — shared-utils/utils/fm
 *
 * Barrel export for all FM types, Zod schemas, errors, and validation helpers.
 * This is the isomorphic entry point (usable in both server and client).
 */

export { FM_PURPOSES, FM_VISIBILITY, FM_VARIANT_KINDS } from "./constants.js";

// Types & Schemas

export {
  FmPurposeSchema,
  FmVisibilitySchema,
  FmVariantKindSchema,
  FmUploadModeSchema,
  FmStorageLocationSchema,
  FmFileRowSchema,
  FmFileVariantRowSchema,
  FmObjectRefSchema,
  FmPresignedPutSchema,
  FmDestinationHintSchema,
  FmUploadInitRequestSchema,
  FmUploadInitResponseSchema,
  FmUploadFinalizeRequestSchema,
  FmUploadFinalizeResponseSchema,
  FmVariantUploadInitRequestSchema,
  FmVariantUploadInitResponseSchema,
  FmVariantUploadFinalizeRequestSchema,
  FmVariantUploadFinalizeResponseSchema,
  FmFilePatchRequestSchema,
  FmMoveRequestSchema,
  FmLinkCreateRequestSchema,
  FmLinkDeleteRequestSchema,
} from "./types.js";

export type {
  // Enum types
  FmPurpose,
  FmVisibility,
  FmVariantKind,
  FmUploadMode,
  FmStorageLocation,

  // Row types
  FmFileRow,
  FmFileVariantRow,
  FmFileLinkRow,

  // Object ref types
  FmObjectRef,
  FmPresignedPut,
  FmDestinationHint,

  // Upload DTOs
  FmUploadInitRequest,
  FmUploadInitResponse,
  FmUploadFinalizeRequest,
  FmUploadFinalizeResponse,
  FmVariantUploadInitRequest,
  FmVariantUploadInitResponse,
  FmVariantUploadFinalizeRequest,
  FmVariantUploadFinalizeResponse,

  // Patch / Move / Link request types
  FmFilePatchRequest,
  FmMoveRequest,
  FmLinkCreateRequest,
  FmLinkDeleteRequest,

  // Connector types
  FmFileInsert,
  FmFilePatch,
  FmVariantInsert,
  FmVariantPatch,
  FmFileLinkInsert,
  FmFileListFilters,
  FmFileListResult,
  FmFileLinkListFilters,
  FmFileLinkListResult,
  FmFilesOrderBy,
  FmOrderDirection,

  // Context & event types
  FmContext,
  FmWriteEvent,
  FmUploadProgressCallback,
} from "./types.js";

// -- Errors -------------------------------------------------------------------

export {
  FmError,
  FmNotFoundError,
  FmValidationError,
  FmConflictError,
  FmAuthorizationError,
  FmAuthenticationError,
  FmStorageError,
  FmPolicyError,
  isFmError,
  sendFmError,
  fmErrorToStatus,
} from "./errors.js";

// -- Validation ---------------------------------------------------------------

export {
  isUuid,
  isSafeUid,
  coerceFmBoolean,
  normalizeFmTags,
  extractExtension,
  normalizeMimeType,
} from "./validation.js";
