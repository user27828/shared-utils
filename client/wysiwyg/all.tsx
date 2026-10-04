import React from "react";
import "./tinymce/features/full.js";
import WysiwygEditorBase, { type WysiwygEditorProps } from "../wysiwyg.js";
import { CKEditorWysiwygAdapter } from "./ckeditor.js";
import { EasyMDEWysiwygAdapter } from "./easymde.js";
import { MDXWysiwygAdapter } from "./mdx.js";
import { TinyMceWysiwygAdapter } from "./tinymce.js";

export const ALL_WYSIWYG_EDITOR_ADAPTERS = {
  tinymce: TinyMceWysiwygAdapter,
  ckeditor: CKEditorWysiwygAdapter,
  easymde: EasyMDEWysiwygAdapter,
  mdx: MDXWysiwygAdapter,
} as const;

export const WysiwygEditor: React.FC<WysiwygEditorProps> = (
  props: WysiwygEditorProps,
) => {
  return (
    <WysiwygEditorBase
      {...props}
      adapters={{
        ...ALL_WYSIWYG_EDITOR_ADAPTERS,
        ...props.adapters,
      }}
    />
  );
};

WysiwygEditor.displayName = "WysiwygEditorWithAllAdapters";

export type { WysiwygEditorProps } from "../wysiwyg.js";
export { CKEditor5Classic, CKEditorWysiwygAdapter } from "./ckeditor.js";
export type {
  CKEditor5ClassicProps,
  CKEditor5FilePickerMeta,
  CKEditor5ImageUploadRequest,
  CKEditor5ImageUploadResult,
  CKEditor5PickRequest,
  CKEditor5PickResult,
  CKEditor5ProgressFn,
} from "./ckeditor.js";
export { EasyMDEEditor, EasyMDEWysiwygAdapter } from "./easymde.js";
export type { EasyMDEEditorProps } from "./easymde.js";
export { MDXEditor, MDXWysiwygAdapter } from "./mdx.js";
export type {
  MDXEditorComponentProps,
  MDXEditorImageUploadRequest,
  MDXEditorImageUploadResult,
  MDXEditorMethods,
} from "./mdx.js";
export { TinyMceEditor, TinyMceWysiwygAdapter } from "./tinymce.js";
export type {
  TinyMceEditorProps,
  TinyMceFilePickerMeta,
  TinyMceImageUploadRequest,
  TinyMceImageUploadResult,
  TinyMcePickRequest,
  TinyMcePickResult,
  TinyMceProgressFn,
} from "./tinymce.js";

export default WysiwygEditor;
