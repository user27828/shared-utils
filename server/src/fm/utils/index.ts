/**
 * FM Server Utilities barrel — shared-utils/server/src/fm/utils
 */
export {
  sanitizeFmFolderPath,
  buildFmObjectKey,
} from "./objectKey.js";

export {
  encodeFmStorageKey,
  decodeFmStorageKey,
  tryDecodeFmStorageKey,
} from "./storageKey.js";

export {
  buildFmObjectMetadataForInit,
  buildFmObjectMetadataForExistingFile,
} from "./objectMetadata.js";

export {
  resolveClientUrl,
  buildCanonicalMediaUrl,
} from "./url.js";

export type { FmRequestLike } from "./url.js";

export { sniffMimeFromHeader } from "./mimeSniff.js";

export { extractImageDimensionsFromHeader } from "./imageDimensions.js";
