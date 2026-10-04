/**
 * Engine-neutral WYSIWYG adapter and shared API.
 *
 * Import a per-engine adapter from `client/wysiwyg/<engine>` and pass it in the
 * `adapters` map. Applications that intentionally install every engine can
 * use the separate `client/wysiwyg/all` entrypoint.
 */
export { default, default as WysiwygEditor, } from "./src/components/wysiwyg/WysiwygEditor.js";
export { normalizeCssSize, } from "./src/components/wysiwyg/wysiwyg-common.js";
