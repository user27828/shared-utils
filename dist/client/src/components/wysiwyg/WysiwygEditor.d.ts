import React from "react";
import { type WysiwygEditorAdapterMap, type WysiwygEditorKind, type WysiwygPickRequest, type WysiwygPickResult, type WysiwygImageUploadRequest, type WysiwygImageUploadResult } from "./wysiwyg-common.js";
export type { WysiwygAssetKind, WysiwygEditorAdapter, WysiwygEditorAdapterMap, WysiwygEditorAdapterProps, WysiwygEditorKind, WysiwygImageUploadRequest, WysiwygImageUploadResult, WysiwygPickRequest, WysiwygPickResult, WysiwygProgressFn, } from "./wysiwyg-common.js";
export type WysiwygChangeContext = {
    editor: WysiwygEditorKind;
    instance: unknown;
    rawEvent?: unknown;
};
export interface WysiwygEditorProps {
    /** Editor kind selected from the explicitly supplied adapter map. */
    editor?: WysiwygEditorKind;
    /** Stable adapter components imported by the host application. */
    adapters?: WysiwygEditorAdapterMap;
    value?: string;
    readOnly?: boolean;
    height?: string | number;
    darkMode?: boolean;
    onChange?: (value: string, ctx: WysiwygChangeContext) => void;
    onEditorInstance?: (instance: unknown, ctx: {
        editor: WysiwygEditorKind;
    }) => void;
    onPickAsset?: (request: WysiwygPickRequest) => Promise<WysiwygPickResult | null>;
    onUploadImage?: (request: WysiwygImageUploadRequest) => Promise<WysiwygImageUploadResult>;
    canonicalizeUrl?: (url: string) => string;
    /** Opaque engine-specific props, read only by the selected adapter. */
    editorProps?: Partial<Record<WysiwygEditorKind, Record<string, unknown>>>;
    /** @deprecated Use `editorProps.tinymce`. */
    tinymce?: Record<string, unknown>;
    /** @deprecated Use `editorProps.ckeditor`. */
    ckeditor?: Record<string, unknown>;
    /** @deprecated Use `editorProps.easymde`. */
    easymde?: Record<string, unknown>;
    /** @deprecated Use `editorProps.mdx`. */
    mdx?: Record<string, unknown>;
    suspenseFallback?: React.ReactNode;
}
declare const WysiwygEditor: React.FC<WysiwygEditorProps>;
export default WysiwygEditor;
