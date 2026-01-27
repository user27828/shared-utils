/**
 * WYSIWYG Components - Import this separately if you need TinyMCE or MDXEditor functionality
 *
 * Required peer dependencies for TinyMCE:
 * - @tinymce/tinymce-react
 * - tinymce
 *
 * Required peer dependencies for CKEditor 5:
 * - @ckeditor/ckeditor5-react
 * - ckeditor5
 *
 * Required peer dependencies for MDXEditor:
 * - @mdxeditor/editor
 *
 * Usage:
 * import { TinyMceEditor, CKEditor5Classic, MDXEditor } from "@user27828/shared-utils/client/wysiwyg";
 */
export { default as TinyMceEditor, } from "./src/components/wysiwyg/TinyMceEditor.js";
export { default as CKEditor5Classic, } from "./src/components/wysiwyg/CKEditor5Classic.js";
export { default as MDXEditor, } from "./src/components/wysiwyg/MDXEditor.js";
