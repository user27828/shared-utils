import type React from "react";
export type WysiwygEditorKind = "tinymce" | "ckeditor" | "easymde" | "mdx";
export type WysiwygAssetKind = "file" | "image" | "media";
export type WysiwygPickRequest = {
    value: string;
    kind: WysiwygAssetKind;
};
export type WysiwygPickResult = {
    url: string;
    title?: string;
    text?: string;
    alt?: string;
    kind?: WysiwygAssetKind;
    /** MIME type of the picked asset (e.g. "video/mp4", "image/png"). */
    mimeType?: string;
};
export type WysiwygProgressFn = (percent: number) => void;
export type WysiwygImageUploadRequest = {
    file?: File;
    blob?: Blob;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    progress?: WysiwygProgressFn;
};
export type WysiwygImageUploadResult = {
    url: string;
};
/** Stable, engine-neutral contract implemented by an explicitly imported editor adapter. */
export interface WysiwygEditorAdapterProps {
    value?: string;
    readOnly?: boolean;
    height?: string | number;
    darkMode?: boolean;
    onChange?: (value: string, rawEvent?: unknown) => void;
    onEditorInstance?: (instance: unknown) => void;
    onPickAsset?: (request: WysiwygPickRequest) => Promise<WysiwygPickResult | null>;
    onUploadImage?: (request: WysiwygImageUploadRequest) => Promise<WysiwygImageUploadResult>;
    canonicalizeUrl?: (url: string) => string;
    editorProps?: Record<string, unknown>;
}
export type WysiwygEditorAdapter = React.ComponentType<WysiwygEditorAdapterProps>;
export type WysiwygEditorAdapterMap = Partial<Record<WysiwygEditorKind, WysiwygEditorAdapter>>;
export declare const normalizeCssSize: (value: string | number | undefined) => string | undefined;
export declare const pickLocalFile: (options: {
    accept?: string;
}) => Promise<File | null>;
