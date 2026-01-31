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
 * Required peer dependencies for EasyMDE:
 * - easymde
 *
 * Required peer dependencies for MDXEditor:
 * - @mdxeditor/editor
 *
 * Usage:
 * import { TinyMceEditor, CKEditor5Classic, MDXEditor } from "@user27828/shared-utils/client/wysiwyg";
 */
import React from "react";
export type TinyMceEditorProps = import("./src/components/wysiwyg/TinyMceEditor.js").TinyMceEditorProps;
export type TinyMcePickRequest = import("./src/components/wysiwyg/TinyMceEditor.js").TinyMcePickRequest;
export type TinyMcePickResult = import("./src/components/wysiwyg/TinyMceEditor.js").TinyMcePickResult;
export type TinyMceImageUploadRequest = import("./src/components/wysiwyg/TinyMceEditor.js").TinyMceImageUploadRequest;
export type TinyMceImageUploadResult = import("./src/components/wysiwyg/TinyMceEditor.js").TinyMceImageUploadResult;
export declare const TinyMceEditor: (props: TinyMceEditorProps) => React.FunctionComponentElement<{
    children: React.ReactNode;
}>;
export type EasyMDEEditorProps = import("./src/components/wysiwyg/EasyMDEEditor.js").EasyMDEEditorProps;
export declare const EasyMDEEditor: (props: EasyMDEEditorProps) => React.FunctionComponentElement<{
    children: React.ReactNode;
}>;
export type CKEditor5ClassicProps = import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5ClassicProps;
export type CKEditor5PickRequest = import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5PickRequest;
export type CKEditor5PickResult = import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5PickResult;
export type CKEditor5ImageUploadRequest = import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5ImageUploadRequest;
export type CKEditor5ImageUploadResult = import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5ImageUploadResult;
export declare const CKEditor5Classic: (props: CKEditor5ClassicProps) => React.FunctionComponentElement<{
    children: React.ReactNode;
}>;
export type MDXEditorComponentProps = import("./src/components/wysiwyg/MDXEditor.js").MDXEditorComponentProps;
export type MDXEditorImageUploadRequest = import("./src/components/wysiwyg/MDXEditor.js").MDXEditorImageUploadRequest;
export type MDXEditorImageUploadResult = import("./src/components/wysiwyg/MDXEditor.js").MDXEditorImageUploadResult;
export type MDXEditorMethods = import("./src/components/wysiwyg/MDXEditor.js").MDXEditorMethods;
export declare const MDXEditor: (props: MDXEditorComponentProps) => React.FunctionComponentElement<{
    children: React.ReactNode;
}>;
export { default as WysiwygEditor, type WysiwygEditorProps, type WysiwygEditorKind, type WysiwygAssetKind, type WysiwygPickRequest, type WysiwygPickResult, type WysiwygImageUploadRequest, type WysiwygImageUploadResult, type WysiwygChangeContext, } from "./src/components/wysiwyg/WysiwygEditor.js";
export { default } from "./src/components/wysiwyg/WysiwygEditor.js";
//# sourceMappingURL=wysiwyg.d.ts.map