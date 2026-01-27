/**
 * WYSIWYG editor component using CKEditor 5 (self-hosted, GPL)
 *
 * Notes:
 * - Uses the new CKEditor 5 npm distribution (`ckeditor5`) and the official React wrapper.
 * - Configured to rely on NO CKEditor cloud components.
 * - Provides TinyMCE-like hooks (onChange/onEditorInstance/onPickFile/onUploadImage).
 */
import React from "react";
import "ckeditor5/ckeditor5.css";
export type CKEditor5FilePickerMeta = {
    filetype?: "file" | "image" | "media";
};
export type CKEditor5PickRequest = {
    value: string;
    meta: CKEditor5FilePickerMeta;
};
export type CKEditor5PickResult = {
    url: string;
    title?: string;
    text?: string;
    alt?: string;
    kind?: "file" | "image" | "media";
};
export type CKEditor5ProgressFn = (percent: number) => void;
export type CKEditor5ImageUploadRequest = {
    file: File;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    progress?: CKEditor5ProgressFn;
};
export type CKEditor5ImageUploadResult = {
    url: string;
};
export interface CKEditor5ClassicProps {
    /**
     * Initial editor HTML content.
     */
    data?: string;
    /**
     * Change handler function (TinyMCE-compatible shape).
     */
    onChange?: (event: any, editor: {
        getData: () => string;
    }) => void;
    /**
     * Callback to receive the CKEditor editor instance.
     */
    onEditorInstance?: (editor: any) => void;
    /**
     * Optional hook to provide a custom picker UI (e.g. asset browser).
     */
    onPickFile?: (request: CKEditor5PickRequest) => Promise<CKEditor5PickResult | null>;
    /**
     * Optional hook to upload images (pasted/dragged/selected) and return a URL.
     */
    onUploadImage?: (request: CKEditor5ImageUploadRequest) => Promise<CKEditor5ImageUploadResult>;
    /**
     * Optional URL canonicalizer.
     */
    canonicalizeUrl?: (url: string) => string;
    /**
     * Enable dark mode styling.
     */
    darkMode?: boolean;
    /**
     * Read-only mode.
     */
    readOnly?: boolean;
    /**
     * Editor height (CSS value).
     */
    height?: string | number;
    /**
     * Additional CKEditor configuration overrides.
     * Arrays are replaced (not merged).
     */
    config?: Record<string, any>;
    /**
     * Additional plugins to include.
     */
    additionalPlugins?: any[];
}
declare const CKEditor5Classic: React.FC<CKEditor5ClassicProps>;
export default CKEditor5Classic;
//# sourceMappingURL=CKEditor5Classic.d.ts.map