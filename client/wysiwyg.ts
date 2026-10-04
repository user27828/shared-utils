/**
 * Engine-neutral WYSIWYG adapter and shared API.
 *
 * Import a per-engine adapter from `client/wysiwyg/<engine>` and pass it in the
 * `adapters` map. Applications that intentionally install every engine can
 * use the separate `client/wysiwyg/all` entrypoint.
 */
export {
  default,
  default as WysiwygEditor,
  type WysiwygChangeContext,
  type WysiwygEditorProps,
} from "./src/components/wysiwyg/WysiwygEditor.js";
export {
  type WysiwygAssetKind,
  type WysiwygEditorAdapter,
  type WysiwygEditorAdapterMap,
  type WysiwygEditorAdapterProps,
  type WysiwygEditorKind,
  type WysiwygImageUploadRequest,
  type WysiwygImageUploadResult,
  type WysiwygPickRequest,
  type WysiwygPickResult,
  type WysiwygProgressFn,
  normalizeCssSize,
} from "./src/components/wysiwyg/wysiwyg-common.js";
