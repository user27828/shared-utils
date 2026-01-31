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
const SuspenseNull = ({ children }) => {
    return React.createElement(Suspense, { fallback: null }, children);
};
// Lazy editor exports: keep the wysiwyg entrypoint importable without installing all editor peer deps.
const LazyTinyMceEditor = lazy(async () => await import("./src/components/wysiwyg/TinyMceEditor.js"));
export const TinyMceEditor = (props) => {
    return React.createElement(SuspenseNull, null, React.createElement(LazyTinyMceEditor, props));
};
const LazyEasyMDEEditor = lazy(async () => await import("./src/components/wysiwyg/EasyMDEEditor.js"));
export const EasyMDEEditor = (props) => {
    return React.createElement(SuspenseNull, null, React.createElement(LazyEasyMDEEditor, props));
};
const LazyCKEditor5Classic = lazy(async () => await import("./src/components/wysiwyg/CKEditor5Classic.js"));
export const CKEditor5Classic = (props) => {
    return React.createElement(SuspenseNull, null, React.createElement(LazyCKEditor5Classic, props));
};
const LazyMDXEditor = lazy(async () => await import("./src/components/wysiwyg/MDXEditor.js"));
export const MDXEditor = (props) => {
    return React.createElement(SuspenseNull, null, React.createElement(LazyMDXEditor, props));
};
export { default as WysiwygEditor, } from "./src/components/wysiwyg/WysiwygEditor.js";
export { default } from "./src/components/wysiwyg/WysiwygEditor.js";
