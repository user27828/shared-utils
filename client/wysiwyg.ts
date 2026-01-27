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

export {
  default as TinyMceEditor,
  type TinyMceEditorProps,
  type TinyMcePickRequest,
  type TinyMcePickResult,
  type TinyMceImageUploadRequest,
  type TinyMceImageUploadResult,
} from "./src/components/wysiwyg/TinyMceEditor.js";
export {
  default as MDXEditor,
  type MDXEditorComponentProps,
  type MDXEditorImageUploadRequest,
  type MDXEditorImageUploadResult,
  type MDXEditorMethods,
} from "./src/components/wysiwyg/MDXEditor.js";
