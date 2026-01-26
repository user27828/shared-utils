/**
 * WYSIWYG editor component using MDXEditor
 * @module MDXEditor
 */
import React from "react";
import { type MDXEditorMethods, type MDXEditorProps as BaseMDXEditorProps } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
/**
 * Image upload request matching TinyMCE pattern
 */
export type MDXEditorImageUploadRequest = {
    file: File;
    filename: string;
    mimeType: string;
    sizeBytes: number;
};
/**
 * Image upload result
 */
export type MDXEditorImageUploadResult = {
    url: string;
};
export interface MDXEditorComponentProps {
    /**
     * Initial markdown content
     */
    data?: string;
    /**
     * Change handler function - matches TinyMCE pattern
     */
    onChange?: (event: any, editor: {
        getData: () => string;
    }) => void;
    /**
     * Callback to receive the MDXEditor ref/methods
     */
    onEditorInstance?: (editor: MDXEditorMethods) => void;
    /**
     * Optional hook to upload images and return a URL.
     * Similar to TinyMCE's onUploadImage pattern.
     */
    onUploadImage?: (request: MDXEditorImageUploadRequest) => Promise<MDXEditorImageUploadResult>;
    /**
     * Optional URL canonicalizer for image URLs.
     */
    canonicalizeUrl?: (url: string) => string;
    /**
     * Enable dark mode styling
     */
    darkMode?: boolean;
    /**
     * Editor height (CSS value)
     */
    height?: string | number;
    /**
     * Image autocomplete suggestions
     */
    imageAutocompleteSuggestions?: string[];
    /**
     * Whether to show the toolbar
     */
    showToolbar?: boolean;
    /**
     * Additional className for the editor root
     */
    className?: string;
    /**
     * Placeholder text when editor is empty
     */
    placeholder?: string;
    /**
     * Read-only mode
     */
    readOnly?: boolean;
    /**
     * Additional plugins to include
     */
    additionalPlugins?: BaseMDXEditorProps["plugins"];
}
/**
 * Rich text/markdown editor component based on MDXEditor
 */
declare const MDXEditorComponent: React.ForwardRefExoticComponent<MDXEditorComponentProps & React.RefAttributes<MDXEditorMethods>>;
export default MDXEditorComponent;
export type { MDXEditorMethods };
//# sourceMappingURL=MDXEditor.d.ts.map