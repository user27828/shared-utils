import React from "react";
import type { MDXEditorComponentProps, MDXEditorMethods } from "../src/components/wysiwyg/MDXEditor.js";
import type { WysiwygEditorAdapterProps } from "../src/components/wysiwyg/wysiwyg-common.js";
export declare const MDXEditor: React.ForwardRefExoticComponent<MDXEditorComponentProps & React.RefAttributes<MDXEditorMethods>>;
export declare const MDXWysiwygAdapter: React.FC<WysiwygEditorAdapterProps>;
export type { MDXEditorComponentProps, MDXEditorImageUploadRequest, MDXEditorImageUploadResult, MDXEditorMethods, } from "../src/components/wysiwyg/MDXEditor.js";
export type { WysiwygEditorAdapterProps } from "../src/components/wysiwyg/wysiwyg-common.js";
export default MDXEditor;
