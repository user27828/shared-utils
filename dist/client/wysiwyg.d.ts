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
export { default as TinyMceEditor, type TinyMceEditorProps, type TinyMcePickRequest, type TinyMcePickResult, type TinyMceImageUploadRequest, type TinyMceImageUploadResult, } from "./src/components/wysiwyg/TinyMceEditor.js";
export { default as CKEditor5Classic, type CKEditor5ClassicProps, type CKEditor5PickRequest, type CKEditor5PickResult, type CKEditor5ImageUploadRequest, type CKEditor5ImageUploadResult, } from "./src/components/wysiwyg/CKEditor5Classic.js";
export { default as MDXEditor, type MDXEditorComponentProps, type MDXEditorImageUploadRequest, type MDXEditorImageUploadResult, type MDXEditorMethods, } from "./src/components/wysiwyg/MDXEditor.js";
//# sourceMappingURL=wysiwyg.d.ts.map