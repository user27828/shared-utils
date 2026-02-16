/**
 * Server FM barrel — shared-utils/server/src/fm
 *
 * Re-exports the server-side FM surface:
 *  - FmConnector interface (port for DB adapters)
 *  - Type guards for optional connector capabilities
 *  - Configuration parser (pure function)
 *  - Utility functions (object keys, storage keys, metadata, URLs)
 *  - Upload policy (allowlists, validation)
 *  - Storage adapter interface + local adapter + async factory
 *  - MIME sniffing + image dimension extraction utilities
 *  - FmServiceCore (upload orchestration, lifecycle, URL resolution)
 *
 * NOTE: FmStorageS3 is NOT exported here (requires optional @aws-sdk deps).
 * Import it directly from "@user27828/shared-utils/fm/server/s3".
 */
export { hasTransaction, hasBatchVariantDelete } from "./FmConnector.js";
// ── Configuration ─────────────────────────────────────────────────────────
export { parseFmServerConfig, assertValidFmServerConfig, resolveFmLocalUploadRootAbsPath, getFmUploadPathPresetsFromConfig, FM_SERVER_CONFIG_KEYS, } from "./config.js";
// ── Utilities ─────────────────────────────────────────────────────────────
export { sanitizeFmFolderPath, buildFmObjectKey, encodeFmStorageKey, decodeFmStorageKey, tryDecodeFmStorageKey, buildFmObjectMetadataForInit, buildFmObjectMetadataForExistingFile, resolveClientUrl, buildCanonicalMediaUrl, } from "./utils/index.js";
// ── Upload Policy ─────────────────────────────────────────────────────────
export { FM_PURPOSE_POLICIES, FmUploadValidationResultSchema, validateFmUploadInputs, } from "./policy/index.js";
export { FmStorageLocal } from "./storage/index.js";
export { createFmStorage } from "./storage/index.js";
// ── MIME / Image Dimension Utilities ──────────────────────────────────────
export { sniffMimeFromHeader } from "./utils/mimeSniff.js";
export { extractImageDimensionsFromHeader } from "./utils/imageDimensions.js";
// ── FmServiceCore ─────────────────────────────────────────────────────────
export { FmServiceCore } from "./FmServiceCore.js";
// ── Express Router Factories ──────────────────────────────────────────────
export { createFmAuthz } from "./express/authz.js";
export { createFmRouter } from "./express/adminRouter.js";
export { createFmPublicRouter } from "./express/publicRouter.js";
export { createFmContentRouter } from "./express/contentRouter.js";
// ── Conformance Test Harness ──────────────────────────────────────────────
export { runFmConnectorConformanceTests } from "./test/fmConformance.js";
//# sourceMappingURL=index.js.map