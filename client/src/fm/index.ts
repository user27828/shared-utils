/**
 * Client FM barrel — shared-utils/client/src/fm
 *
 * Re-exports the full client-side FM surface:
 *  - FmApi interface + FmClient implementation
 *  - React hooks (useFmListFiles)
 *  - Image variant generation utilities
 *  - Isomorphic types from utils/fm
 */

// ── Isomorphic types ──────────────────────────────────────────────────────
export * from "../../../utils/src/fm/index.js";

// ── API layer ─────────────────────────────────────────────────────────────
export { FmClient, FmClientError } from "./FmClient.js";
export type { FmClientConfig } from "./FmClient.js";
export type { FmApi, FmReadUrlResult, FmDeleteResult } from "./FmApi.js";

// ── Hooks ─────────────────────────────────────────────────────────────────
export {
  useFmListFiles,
  type UseFmListFilesParams,
  type UseFmListFilesResult,
} from "./hooks/useFmListFiles.js";

// ── DI / Provider ─────────────────────────────────────────────────────────
export {
  FmClientProvider,
  useFmApi,
  type FmClientProviderProps,
} from "./FmClientProvider.js";

// ── Standalone function adapter ───────────────────────────────────────────
export {
  createFmApiFunctions,
  type FmApiFunctions,
} from "./createFmApiFunctions.js";

// ── Components ────────────────────────────────────────────────────────────
export {
  FmMediaLibrary,
  type FmMediaLibraryProps,
} from "./components/FmMediaLibrary.js";
export {
  FmVideoViewer,
  type FmVideoViewerProps,
} from "./components/FmVideoViewer.js";
export {
  FmImageViewer,
  type FmImageViewerProps,
} from "./components/FmImageViewer.js";
export {
  FmFilePicker,
  type FmFilePickerProps,
} from "./components/FmFilePicker.js";

// ── Image variant utilities ───────────────────────────────────────────────
export {
  generateImageVariants,
  constrainToCanvasLimits,
  supportsOffscreenCanvas,
  DEFAULT_VARIANT_WIDTHS,
  MAX_CANVAS_DIMENSION,
  type ImageVariantResult,
  type GenerateImageVariantsResult,
} from "./utils/imageVariants.js";
