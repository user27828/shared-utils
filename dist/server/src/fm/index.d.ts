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
export type { FmConnector, FmConnectorWithTransaction, FmConnectorWithBatchVariantDelete, FmConnectorWithEntityLinks, } from "./FmConnector.js";
export { hasTransaction, hasBatchVariantDelete, hasEntityLinks, } from "./FmConnector.js";
export { parseFmServerConfig, assertValidFmServerConfig, resolveFmLocalUploadRootAbsPath, getFmUploadPathPresetsFromConfig, FM_SERVER_CONFIG_KEYS, } from "./config.js";
export type { FmServerConfig, FmUploadPathPreset, FmServerConfigKey, } from "./config.js";
export { sanitizeFmFolderPath, buildFmObjectKey, encodeFmStorageKey, decodeFmStorageKey, tryDecodeFmStorageKey, buildFmObjectMetadataForInit, buildFmObjectMetadataForExistingFile, resolveClientUrl, buildCanonicalMediaUrl, } from "./utils/index.js";
export type { FmRequestLike } from "./utils/index.js";
export { FM_PURPOSE_POLICIES, FmUploadValidationResultSchema, validateFmUploadInputs, } from "./policy/index.js";
export type { FmPurposePolicy, FmUploadValidationResult, } from "./policy/index.js";
export type { FmStorageProvider, FmStorageCapabilities, FmPresignedGet, FmHeadObjectResult, FmWriteObjectInput, FmCopyObjectInput, FmDeleteObjectInput, FmStorageAdapter, } from "./storage/index.js";
export { FmStorageLocal } from "./storage/index.js";
export { createFmStorage } from "./storage/index.js";
export { sniffMimeFromHeader } from "./utils/mimeSniff.js";
export { extractImageDimensionsFromHeader } from "./utils/imageDimensions.js";
export { FmServiceCore } from "./FmServiceCore.js";
export type { FmServiceCoreConfig, FmDeleteOutcome } from "./FmServiceCore.js";
export { createFmAuthz } from "./express/authz.js";
export type { FmAuthzConfig, FmAuthzResult } from "./express/authz.js";
export { createFmRouter } from "./express/adminRouter.js";
export type { CreateFmRouterConfig } from "./express/adminRouter.js";
export { createFmPublicRouter } from "./express/publicRouter.js";
export type { CreateFmPublicRouterConfig, FmPublicRouterCacheConfig, } from "./express/publicRouter.js";
export { createFmContentRouter } from "./express/contentRouter.js";
export type { CreateFmContentRouterConfig } from "./express/contentRouter.js";
export { runFmConnectorConformanceTests } from "./test/fmConformance.js";
export type { FmConformanceConfig } from "./test/fmConformance.js";
export { extractFmFileUids, reconcileFmLinks, createCmsFmLinkTracker, } from "./linkTracker.js";
export type { FmLinkReconcileResult, CmsFmLinkTrackerConfig, CmsFmLinkTracker, } from "./linkTracker.js";
//# sourceMappingURL=index.d.ts.map