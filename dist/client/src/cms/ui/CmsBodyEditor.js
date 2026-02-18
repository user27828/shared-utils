import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import React, { useMemo, useRef, useState, Suspense } from "react";
import { Box, LinearProgress, Typography, useColorScheme } from "@mui/material";
import { hasEmbeddedBase64Image, normalizeEmbeddedHtmlImages, } from "./normalizeEmbeddedHtmlImages.js";
// ─── Paste sanitization helpers ───────────────────────────────────────────
/**
 * Returns true when `src` is a local-filesystem URL that can never be loaded
 * by the browser from a web origin — e.g. the `file:///C:/Users/.../msohtmlclip`
 * temp paths that Microsoft Word embeds when pasting rich content.
 */
const isLocalFileImageSrc = (src) => {
    const trimmed = src.trim().toLowerCase();
    // Covers file:///... and file:\\... (Windows UNC) paths
    return trimmed.startsWith("file://") || trimmed.startsWith("file:\\");
};
const LOCAL_FILE_IMAGE_PLACEHOLDER = "[!! Pasted Image Unavailable - Replace or delete this notice !!]";
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
export const stripLocalFileImages = (html) => {
    // Fast path: nothing to do
    if (!/src\s*=\s*["']\s*file:/i.test(html)) {
        return html;
    }
    if (typeof document === "undefined") {
        // SSR fallback — regex replacement (best effort)
        return html.replace(/<img\b[^>]*\bsrc\s*=\s*["']\s*file:[^"']*["'][^>]*\/?>/gi, LOCAL_FILE_IMAGE_PLACEHOLDER);
    }
    const template = document.createElement("template");
    template.innerHTML = html;
    template.content.querySelectorAll("img[src]").forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (isLocalFileImageSrc(src)) {
            const placeholder = document.createTextNode(LOCAL_FILE_IMAGE_PLACEHOLDER);
            img.parentNode?.replaceChild(placeholder, img);
        }
    });
    return template.innerHTML;
};
export const contentTypeToMime = (shorthand) => {
    switch (shorthand) {
        case "html":
            return "text/html";
        case "markdown":
            return "text/markdown";
        case "json":
            return "application/json";
        case "text":
            return "text/plain";
        default:
            return "text/html";
    }
};
export const mimeToContentType = (mime) => {
    switch (mime) {
        case "text/html":
            return "html";
        case "text/markdown":
            return "markdown";
        case "application/json":
            return "json";
        case "text/plain":
            return "text";
        default:
            return "html";
    }
};
// ─── Component ────────────────────────────────────────────────────────────
const CmsBodyEditor = ({ contentType, value, onChange, height = 500, label, editor = "ckeditor", onPickAsset, onUploadImage, }) => {
    const [editorLoading, setEditorLoading] = useState(true);
    const latestHtmlRef = useRef(value);
    const htmlNormalizationRunRef = useRef(0);
    React.useEffect(() => {
        latestHtmlRef.current = value;
    }, [value]);
    const handleHtmlEditorChange = React.useCallback((nextValue) => {
        latestHtmlRef.current = nextValue;
        onChange(nextValue);
        if (!onUploadImage) {
            return;
        }
        if (!hasEmbeddedBase64Image(nextValue)) {
            return;
        }
        const runId = htmlNormalizationRunRef.current + 1;
        htmlNormalizationRunRef.current = runId;
        void normalizeEmbeddedHtmlImages({
            html: nextValue,
            uploadImage: async (file, context) => {
                return await onUploadImage(file, context);
            },
        })
            .then((normalizedValue) => {
            if (htmlNormalizationRunRef.current !== runId) {
                return;
            }
            if (latestHtmlRef.current !== nextValue) {
                return;
            }
            if (normalizedValue === nextValue) {
                return;
            }
            latestHtmlRef.current = normalizedValue;
            onChange(normalizedValue);
        })
            .catch((err) => {
            console.error("CmsBodyEditor base64 image normalization failed", err);
        });
    }, [onChange, onUploadImage]);
    const containerSx = useMemo(() => ({
        minHeight: height,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
    }), [height]);
    if (contentType === "html") {
        return (_jsxs(Box, { children: [label && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 0.5 }, children: label })), _jsxs(Box, { sx: containerSx, children: [_jsx(Suspense, { fallback: _jsx(LinearProgress, {}), children: _jsx(HtmlEditor, { value: value, onChange: handleHtmlEditorChange, height: height, editor: editor, onPickAsset: onPickAsset, onUploadImage: onUploadImage, onReady: () => setEditorLoading(false) }) }), editorLoading && _jsx(LinearProgress, {})] })] }));
    }
    if (contentType === "markdown") {
        return (_jsxs(Box, { children: [label && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 0.5 }, children: label })), _jsx(Box, { sx: containerSx, children: _jsx(Suspense, { fallback: _jsx(LinearProgress, {}), children: _jsx(MarkdownEditor, { value: value, onChange: onChange, onPickAsset: onPickAsset, onUploadImage: onUploadImage }) }) })] }));
    }
    // JSON or Plain text — use a simple textarea
    return (_jsxs(Box, { children: [label && (_jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 0.5 }, children: [label, " (", contentType === "json" ? "JSON" : "Plain text", ")"] })), _jsx(Box, { component: "textarea", value: value, onChange: (e) => onChange(e.target.value), sx: {
                    ...containerSx,
                    width: "100%",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    p: 2,
                    resize: "vertical",
                    overflow: "auto",
                    background: "transparent",
                    color: "text.primary",
                } })] }));
};
// ─── Sub-editors (lazy-loaded) ────────────────────────────────────────────
/**
 * HTML editor — loads TinyMCE or CKEditor from shared-utils/client/wysiwyg
 * based on the `editor` prop. Falls back to textarea if the import fails.
 */
const HtmlEditor = ({ value, onChange, height, editor, onPickAsset, onUploadImage, onReady, }) => {
    const [EditorComponent, setEditorComponent] = useState(null);
    const loadedRef = useRef(null);
    const { mode, systemMode } = useColorScheme();
    const isDark = (mode === "system" ? systemMode : mode) === "dark";
    // Re-load when editor preference changes
    React.useEffect(() => {
        if (loadedRef.current === editor) {
            return;
        }
        loadedRef.current = editor;
        setEditorComponent(null);
        import("../../../wysiwyg")
            .then((mod) => {
            if (editor === "tinymce") {
                setEditorComponent(() => mod.TinyMceEditor);
            }
            else {
                setEditorComponent(() => mod.CKEditor5Classic);
            }
            onReady?.();
        })
            .catch(() => {
            onReady?.();
        });
    }, [editor, onReady]);
    if (!EditorComponent) {
        return (_jsx(Box, { component: "textarea", value: value, onChange: (e) => onChange(e.target.value), sx: {
                width: "100%",
                height,
                fontFamily: "monospace",
                fontSize: "0.875rem",
                p: 2,
                resize: "none",
                overflow: "auto",
                border: "none",
                background: "transparent",
                color: "text.primary",
            } }));
    }
    if (editor === "tinymce") {
        // Adapt CmsImageUploadHandler → TinyMceImageUploadRequest so we reuse
        // TinyMceEditor's own blobInfo extraction (filename, mimeType, progress).
        const tinyMceUploadImage = onUploadImage
            ? async (request) => {
                const file = new File([request.blob], request.filename, {
                    type: request.mimeType || "application/octet-stream",
                });
                const url = await onUploadImage(file, { source: "editor-upload" });
                if (!url) {
                    throw new Error("Upload failed");
                }
                return { url };
            }
            : undefined;
        // Adapt onPickAsset → TinyMceEditor's onPickFile prop to reuse its
        // file_picker_callback wiring (including per-filetype meta handling).
        const tinyMcePickFile = onPickAsset
            ? async (_request) => {
                const result = await onPickAsset();
                if (!result?.url) {
                    return null;
                }
                return {
                    url: result.url,
                    title: result.name || "",
                    alt: result.name || "",
                };
            }
            : undefined;
        return (_jsx(EditorComponent, { data: value, onChange: (_event, helpers) => onChange(helpers.getData()), darkMode: isDark, onPickFile: tinyMcePickFile, onUploadImage: tinyMceUploadImage, init: {
                license_key: "gpl",
                height,
                menubar: true,
                plugins: [
                    "advlist",
                    "autolink",
                    "lists",
                    "link",
                    "image",
                    "charmap",
                    "preview",
                    "anchor",
                    "searchreplace",
                    "visualblocks",
                    "code",
                    "fullscreen",
                    "insertdatetime",
                    "media",
                    "table",
                    "help",
                    "wordcount",
                ],
                toolbar: "undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | code fullscreen",
                // Allow pasted data-URI blobs to land in the editor so they can
                // be picked up by images_upload_handler and sent to FM.
                paste_data_images: true,
                // Upload images immediately on paste rather than deferring.
                automatic_uploads: true,
                // Strip unresolvable local-file image references from pasted content
                // BEFORE they enter the editor DOM.  This covers Microsoft Word
                // "Insert > Copy HTML" pastes which embed
                // file:///C:/Users/.../msohtmlclip.../clip_image*.jpg paths that the
                // browser can never fetch from a web origin — removing them prevents
                // broken-image placeholders from being saved into CMS content.
                paste_preprocess: (_pluginApi, data) => {
                    data.content = stripLocalFileImages(data.content);
                },
            } }));
    }
    // CKEditor — onChange receives (event, { getData }) per CKEditor5Classic API
    return (_jsx(EditorComponent, { data: value, darkMode: isDark, height: height, onChange: (_event, helpers) => onChange(helpers.getData()), onPickFile: onPickAsset
            ? async (request) => {
                const result = await onPickAsset();
                if (!result?.url) {
                    return null;
                }
                return {
                    url: result.url,
                    title: result.name || "",
                    alt: result.name || "",
                    width: result.width,
                    height: result.height,
                    kind: "image",
                };
            }
            : undefined, onUploadImage: onUploadImage
            ? async (request) => {
                const file = request?.file instanceof File
                    ? request.file
                    : request instanceof File
                        ? request
                        : new File([request?.file || request], request?.filename || "image", {
                            type: request?.mimeType || "application/octet-stream",
                        });
                const url = await onUploadImage(file, {
                    source: "editor-upload",
                });
                if (!url) {
                    throw new Error("Upload failed");
                }
                return { url };
            }
            : undefined }, `ck-${editor}`));
};
/**
 * Markdown editor using MDXEditor from shared-utils/client/wysiwyg.
 */
const MarkdownEditor = ({ value, onChange, onPickAsset, onUploadImage }) => {
    const [MdEditor, setMdEditor] = useState(null);
    const loadedRef = useRef(false);
    React.useEffect(() => {
        if (loadedRef.current) {
            return;
        }
        loadedRef.current = true;
        import("../../../wysiwyg")
            .then((mod) => {
            setMdEditor(() => mod.MDXEditor);
        })
            .catch(() => {
            // Fallback
        });
    }, []);
    if (!MdEditor) {
        return (_jsx(Box, { component: "textarea", value: value, onChange: (e) => onChange(e.target.value), sx: {
                width: "100%",
                minHeight: 400,
                fontFamily: "monospace",
                fontSize: "0.875rem",
                p: 2,
                resize: "vertical",
                border: "none",
                background: "transparent",
                color: "text.primary",
            } }));
    }
    return _jsx(MdEditor, { markdown: value, onChange: onChange });
};
export default CmsBodyEditor;
