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
// ── Hooks ─────────────────────────────────────────────────────────────────
export { useFmListFiles, } from "./hooks/useFmListFiles.js";
// ── DI / Provider ─────────────────────────────────────────────────────────
export { FmClientProvider, useFmApi, } from "./FmClientProvider.js";
// ── Standalone function adapter ───────────────────────────────────────────
export { createFmApiFunctions, } from "./createFmApiFunctions.js";
// ── Components ────────────────────────────────────────────────────────────
export { FmMediaLibrary, } from "./components/FmMediaLibrary.js";
export { FmFilePicker, } from "./components/FmFilePicker.js";
// ── Image variant utilities ───────────────────────────────────────────────
export { generateImageVariants, constrainToCanvasLimits, supportsOffscreenCanvas, DEFAULT_VARIANT_WIDTHS, MAX_CANVAS_DIMENSION, } from "./utils/imageVariants.js";
