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
import React, { Suspense, lazy } from "react";

const SuspenseNull = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(Suspense, { fallback: null }, children);
};

// Lazy editor exports: keep the wysiwyg entrypoint importable without installing all editor peer deps.

const LazyTinyMceEditor = lazy(
  async () => await import("./src/components/wysiwyg/TinyMceEditor.js"),
);
export type TinyMceEditorProps =
  import("./src/components/wysiwyg/TinyMceEditor.js").TinyMceEditorProps;
export type TinyMcePickRequest =
  import("./src/components/wysiwyg/TinyMceEditor.js").TinyMcePickRequest;
export type TinyMcePickResult =
  import("./src/components/wysiwyg/TinyMceEditor.js").TinyMcePickResult;
export type TinyMceImageUploadRequest =
  import("./src/components/wysiwyg/TinyMceEditor.js").TinyMceImageUploadRequest;
export type TinyMceImageUploadResult =
  import("./src/components/wysiwyg/TinyMceEditor.js").TinyMceImageUploadResult;
export const TinyMceEditor = (props: TinyMceEditorProps) => {
  return React.createElement(
    SuspenseNull,
    null,
    React.createElement(
      LazyTinyMceEditor as unknown as React.ComponentType<TinyMceEditorProps>,
      props,
    ),
  );
};

const LazyEasyMDEEditor = lazy(
  async () => await import("./src/components/wysiwyg/EasyMDEEditor.js"),
);
export type EasyMDEEditorProps =
  import("./src/components/wysiwyg/EasyMDEEditor.js").EasyMDEEditorProps;
export const EasyMDEEditor = (props: EasyMDEEditorProps) => {
  return React.createElement(
    SuspenseNull,
    null,
    React.createElement(
      LazyEasyMDEEditor as unknown as React.ComponentType<EasyMDEEditorProps>,
      props,
    ),
  );
};

const LazyCKEditor5Classic = lazy(
  async () => await import("./src/components/wysiwyg/CKEditor5Classic.js"),
);
export type CKEditor5ClassicProps =
  import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5ClassicProps;
export type CKEditor5PickRequest =
  import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5PickRequest;
export type CKEditor5PickResult =
  import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5PickResult;
export type CKEditor5ImageUploadRequest =
  import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5ImageUploadRequest;
export type CKEditor5ImageUploadResult =
  import("./src/components/wysiwyg/CKEditor5Classic.js").CKEditor5ImageUploadResult;
export const CKEditor5Classic = (props: CKEditor5ClassicProps) => {
  return React.createElement(
    SuspenseNull,
    null,
    React.createElement(
      LazyCKEditor5Classic as unknown as React.ComponentType<CKEditor5ClassicProps>,
      props,
    ),
  );
};

const LazyMDXEditor = lazy(
  async () => await import("./src/components/wysiwyg/MDXEditor.js"),
);
export type MDXEditorComponentProps =
  import("./src/components/wysiwyg/MDXEditor.js").MDXEditorComponentProps;
export type MDXEditorImageUploadRequest =
  import("./src/components/wysiwyg/MDXEditor.js").MDXEditorImageUploadRequest;
export type MDXEditorImageUploadResult =
  import("./src/components/wysiwyg/MDXEditor.js").MDXEditorImageUploadResult;
export type MDXEditorMethods =
  import("./src/components/wysiwyg/MDXEditor.js").MDXEditorMethods;
export const MDXEditor = (props: MDXEditorComponentProps) => {
  return React.createElement(
    SuspenseNull,
    null,
    React.createElement(
      LazyMDXEditor as unknown as React.ComponentType<MDXEditorComponentProps>,
      props,
    ),
  );
};

export {
  default as WysiwygEditor,
  type WysiwygEditorProps,
  type WysiwygEditorKind,
  type WysiwygAssetKind,
  type WysiwygPickRequest,
  type WysiwygPickResult,
  type WysiwygImageUploadRequest,
  type WysiwygImageUploadResult,
  type WysiwygChangeContext,
} from "./src/components/wysiwyg/WysiwygEditor.js";

export { default } from "./src/components/wysiwyg/WysiwygEditor.js";
