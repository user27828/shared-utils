import { jsx as _jsx } from "react/jsx-runtime";
import "./tinymce/features/full.js";
import WysiwygEditorBase from "../wysiwyg.js";
import { CKEditorWysiwygAdapter } from "./ckeditor.js";
import { EasyMDEWysiwygAdapter } from "./easymde.js";
import { MDXWysiwygAdapter } from "./mdx.js";
import { TinyMceWysiwygAdapter } from "./tinymce.js";
export const ALL_WYSIWYG_EDITOR_ADAPTERS = {
    tinymce: TinyMceWysiwygAdapter,
    ckeditor: CKEditorWysiwygAdapter,
    easymde: EasyMDEWysiwygAdapter,
    mdx: MDXWysiwygAdapter,
};
export const WysiwygEditor = (props) => {
    return (_jsx(WysiwygEditorBase, { ...props, adapters: {
            ...ALL_WYSIWYG_EDITOR_ADAPTERS,
            ...props.adapters,
        } }));
};
WysiwygEditor.displayName = "WysiwygEditorWithAllAdapters";
export { CKEditor5Classic, CKEditorWysiwygAdapter } from "./ckeditor.js";
export { EasyMDEEditor, EasyMDEWysiwygAdapter } from "./easymde.js";
export { MDXEditor, MDXWysiwygAdapter } from "./mdx.js";
export { TinyMceEditor, TinyMceWysiwygAdapter } from "./tinymce.js";
export default WysiwygEditor;
