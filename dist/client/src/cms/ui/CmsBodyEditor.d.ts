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
/**
 * Parse `html` and replace any `<img>` tags whose `src` is a local-file URL
 * with a visible inline text placeholder.  The browser can never load these
 * paths from a web origin (they are Windows `file:///` temp paths produced by
 * Microsoft Word on paste), so replacing them early prevents broken-image
 * icons from being saved into CMS content.
 *
 * Operates on a detached DOM fragment — no side-effects on the live document.
 * A fast regex pre-check skips the DOM work in the common (no local-file) case.
 */
export declare const stripLocalFileImages: (html: string) => string;
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