import React from "react";
import type { TinyMceEditorProps } from "./TinyMceEditor.js";
import type { CKEditor5ClassicProps } from "./CKEditor5Classic.js";
import type { EasyMDEEditorProps } from "./EasyMDEEditor.js";
import { type WysiwygEditorKind, type WysiwygImageUploadRequest, type WysiwygImageUploadResult, type WysiwygPickRequest, type WysiwygPickResult } from "./wysiwyg-common.js";
export type { WysiwygAssetKind, WysiwygEditorKind } from "./wysiwyg-common.js";
export type { WysiwygImageUploadRequest, WysiwygImageUploadResult, WysiwygPickRequest, WysiwygPickResult, WysiwygProgressFn, } from "./wysiwyg-common.js";
export type WysiwygChangeContext = {
    editor: WysiwygEditorKind;
    instance: any;
    rawEvent?: any;
};
export type WysiwygTinymceOverrides = Omit<TinyMceEditorProps, "data" | "onChange" | "onEditorInstance" | "onPickFile" | "onUploadImage" | "canonicalizeUrl">;
export type WysiwygCkeditorOverrides = Omit<CKEditor5ClassicProps, "data" | "onChange" | "onEditorInstance" | "onPickFile" | "onUploadImage" | "canonicalizeUrl" | "readOnly" | "height">;
export type WysiwygEasyMdeOverrides = Omit<EasyMDEEditorProps, "value" | "onChange" | "onEditorInstance" | "onPickAsset" | "onUploadImage" | "canonicalizeUrl" | "readOnly" | "height">;
export interface WysiwygEditorProps {
    editor?: WysiwygEditorKind;
    value?: string;
    readOnly?: boolean;
    height?: string | number;
    onChange?: (value: string, ctx: WysiwygChangeContext) => void;
    onEditorInstance?: (instance: any, ctx: {
        editor: WysiwygEditorKind;
    }) => void;
    onPickAsset?: (request: WysiwygPickRequest) => Promise<WysiwygPickResult | null>;
    onUploadImage?: (request: WysiwygImageUploadRequest) => Promise<WysiwygImageUploadResult>;
    canonicalizeUrl?: (url: string) => string;
    tinymce?: WysiwygTinymceOverrides;
    ckeditor?: WysiwygCkeditorOverrides;
    easymde?: WysiwygEasyMdeOverrides;
    /**
     * Suspense fallback used while lazily loading editor implementations.
     */
    suspenseFallback?: React.ReactNode;
}
declare const WysiwygEditor: React.FC<WysiwygEditorProps>;
export default WysiwygEditor;
//# sourceMappingURL=WysiwygEditor.d.ts.map