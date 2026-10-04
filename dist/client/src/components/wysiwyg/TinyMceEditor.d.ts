/**
 * WYSIWYG editor component using TinyMCE (Free Version)
 * @module TinyMceEditor
 */
import React from "react";
import "./tinymce/minimal.js";
export type TinyMceFilePickerMeta = {
    filetype?: "file" | "image" | "media";
    fieldname?: string;
};
export type TinyMcePickRequest = {
    value: string;
    meta: TinyMceFilePickerMeta;
};
export type TinyMcePickResult = {
    url: string;
    title?: string;
    text?: string;
    alt?: string;
};
export type TinyMceProgressFn = (percent: number) => void;
export type TinyMceImageUploadRequest = {
    blob: Blob;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    progress?: TinyMceProgressFn;
};
export type TinyMceImageUploadResult = {
    url: string;
};
export interface TinyMceEditorProps {
    /**
     * Initial editor content
     */
    data?: string;
    /**
     * Change handler function
     */
    onChange?: (event: any, editor: {
        getData: () => string;
    }) => void;
    /**
     * Callback to receive the TinyMCE editor instance
     */
    onEditorInstance?: (editor: any) => void;
    /**
     * Optional hook to provide a custom file picker (e.g. open a media library).
     *
     * If provided, TinyMceEditor will wire this into TinyMCE's `file_picker_callback`.
     */
    onPickFile?: (request: TinyMcePickRequest) => Promise<TinyMcePickResult | null>;
    /**
     * Optional hook to upload images (pasted/dragged/selected) and return a URL.
     *
     * If provided, TinyMceEditor will wire this into TinyMCE's `images_upload_handler`.
     */
    onUploadImage?: (request: TinyMceImageUploadRequest) => Promise<TinyMceImageUploadResult>;
    /**
     * Optional URL canonicalizer.
     * Useful when you want inserted URLs to always use a canonical public route.
     */
    canonicalizeUrl?: (url: string) => string;
    /**
     * Optional URL path to TinyMCE UI skin directory.
     * Use this when serving skins as static files (required for Vite).
     * Example: "/tinymce/skins/ui/oxide" or "/tinymce/skins/ui/oxide-dark"
     */
    skinUrl?: string;
    /**
     * Optional URL path to TinyMCE content CSS file.
     * Use this when serving skins as static files (required for Vite).
     * Example: "/tinymce/skins/content/default/content.css"
     */
    contentCss?: string;
    /**
     * When true, use the dark TinyMCE skin (oxide-dark) and dark content CSS.
     * The component will re-mount when this value changes.
     */
    darkMode?: boolean;
    /**
     * Additional props passed to the TinyMCE editor
     */
    [key: string]: any;
}
/**
 * Rich text editor component based on TinyMCE's free version
 */
declare const TinyMceEditor: React.FC<TinyMceEditorProps>;
export default TinyMceEditor;
