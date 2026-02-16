/**
 * FM Core Utilities — shared-utils/utils/fm
 *
 * Barrel export for all FM types, Zod schemas, errors, and validation helpers.
 * This is the isomorphic entry point (usable in both server and client).
 */
// ── Types & Schemas ───────────────────────────────────────────────────────
export { 
// Enums / constants
FM_PURPOSES, FmPurposeSchema, FM_VISIBILITY, FmVisibilitySchema, FM_VARIANT_KINDS, FmVariantKindSchema, FmUploadModeSchema, FmStorageLocationSchema, 
// Row schemas
FmFileRowSchema, FmFileVariantRowSchema, 
// Object ref
FmObjectRefSchema, FmPresignedPutSchema, FmDestinationHintSchema, 
// Upload request/response schemas
FmUploadInitRequestSchema, FmUploadInitResponseSchema, FmUploadFinalizeRequestSchema, FmUploadFinalizeResponseSchema, FmVariantUploadInitRequestSchema, FmVariantUploadInitResponseSchema, FmVariantUploadFinalizeRequestSchema, FmVariantUploadFinalizeResponseSchema, 
// Patch / Move / Link schemas
FmFilePatchRequestSchema, FmMoveRequestSchema, FmLinkCreateRequestSchema, FmLinkDeleteRequestSchema, } from "./types.js";
// ── Errors ────────────────────────────────────────────────────────────────
export { FmError, FmNotFoundError, FmValidationError, FmConflictError, FmAuthorizationError, FmAuthenticationError, FmStorageError, FmPolicyError, isFmError, sendFmError, fmErrorToStatus, } from "./errors.js";
// ── Validation ────────────────────────────────────────────────────────────
export { isUuid, isSafeUid, coerceFmBoolean, normalizeFmTags, extractExtension, normalizeMimeType, } from "./validation.js";
