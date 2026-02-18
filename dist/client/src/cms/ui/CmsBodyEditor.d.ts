/**
 * CMS Body Editor — shared-utils
 *
 * Multi-format content editor that switches between:
 * - HTML: TinyMCE or CKEditor (from shared-utils/client/wysiwyg)
 * - Markdown: MDXEditor (from shared-utils/client/wysiwyg)
 * - JSON/Text: Plain textarea
 *
 * Media picker integration is injectable via callbacks.
 */
import React from "react";
import type { CmsEditorPreference, CmsImageUploadHandler } from "./CmsAdminUiConfig.js";
export type CmsEditorContentType = "html" | "markdown" | "json" | "text";
export declare const contentTypeToMime: (shorthand: CmsEditorContentType) => "text/html" | "text/markdown" | "application/json" | "text/plain";
export declare const mimeToContentType: (mime: string | undefined) => CmsEditorContentType;
export interface CmsBodyEditorProps {
    contentType: CmsEditorContentType;
    value: string;
    onChange: (nextValue: string) => void;
    height?: number;
    label?: string;
    /** Which WYSIWYG editor to use for HTML content. Defaults to "ckeditor". */
    editor?: CmsEditorPreference;
    /** Callback to pick a media file (opens host-provided media picker). */
    onPickAsset?: () => Promise<{
        uid: string;
        name?: string;
        url?: string;
        width?: number;
        height?: number;
    } | null>;
    /** Callback to upload an image directly. */
    onUploadImage?: CmsImageUploadHandler;
}
declare const CmsBodyEditor: React.FC<CmsBodyEditorProps>;
export default CmsBodyEditor;
//# sourceMappingURL=CmsBodyEditor.d.ts.map