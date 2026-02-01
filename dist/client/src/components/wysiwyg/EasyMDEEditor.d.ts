/**
 * WYSIWYG editor component using EasyMDE (Markdown)
 *
 * Notes:
 * - This is a lightweight React wrapper around the EasyMDE textarea replacement.
 * - Supports normalized asset insertion hooks (file/image/media) and image uploads.
 */
import React from "react";
import "easymde/dist/easymde.min.css";
import { type WysiwygImageUploadRequest, type WysiwygImageUploadResult, type WysiwygPickRequest, type WysiwygPickResult } from "./wysiwyg-common.js";
export interface EasyMDEEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    onEditorInstance?: (instance: any) => void;
    onPickAsset?: (request: WysiwygPickRequest) => Promise<WysiwygPickResult | null>;
    onUploadImage?: (request: WysiwygImageUploadRequest) => Promise<WysiwygImageUploadResult>;
    canonicalizeUrl?: (url: string) => string;
    readOnly?: boolean;
    height?: string | number;
    /**
     * Additional EasyMDE options (merged last, but common props win).
     *
     * **Note**: This prop is only read at mount time. Changing `options` after
     * the editor has initialized will NOT recreate the editor instance.
     * This is intentional to avoid destroying user state (cursor position, undo history).
     */
    options?: Record<string, any>;
}
declare const EasyMDEEditor: React.FC<EasyMDEEditorProps>;
export default EasyMDEEditor;
//# sourceMappingURL=EasyMDEEditor.d.ts.map