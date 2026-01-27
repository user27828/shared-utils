/**
 * WYSIWYG Components - Import this separately if you need TinyMCE or MDXEditor functionality
 *
 * Required peer dependencies for TinyMCE:
 * - @tinymce/tinymce-react
 * - tinymce
 *
 * Required peer dependencies for MDXEditor:
 * - @mdxeditor/editor
 *
 * Usage:
 * import { TinyMceEditor, MDXEditor } from "@shared-utils/client/wysiwyg";
 */
export { default as TinyMceEditor, } from "./src/components/wysiwyg/TinyMceEditor.js";
export { default as MDXEditor, } from "./src/components/wysiwyg/MDXEditor.js";
