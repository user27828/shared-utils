/**
 * FM Storage barrel — shared-utils/server/src/fm/storage
 *
 * Re-exports the storage adapter interface, types, local adapter, and factory.
 *
 * NOTE: FmStorageS3 is intentionally NOT exported from this barrel because it
 * statically imports @aws-sdk/client-s3 which is an optional peer dependency.
 * Importing this barrel would fail for consumers who only use local storage.
 *
 * To use FmStorageS3 directly:
 *   import { FmStorageS3 } from "@user27828/shared-utils/fm/server/s3";
 *
 * Or use the async factory which dynamically imports FmStorageS3:
 *   import { createFmStorage } from "@user27828/shared-utils/fm/server";
 */
export type { FmStorageProvider, FmStorageCapabilities, FmPresignedGet, FmHeadObjectResult, FmWriteObjectInput, FmCopyObjectInput, FmDeleteObjectInput, FmStorageAdapter, FmObjectRef, FmPresignedPut, } from "./FmStorageAdapter.js";
export { FmStorageLocal } from "./FmStorageLocal.js";
export { createFmStorage } from "./storageFactory.js";
//# sourceMappingURL=index.d.ts.map