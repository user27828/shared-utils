import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CMS Body Editor — shared-utils
 *
 * Multi-format content editor that switches between:
 * - HTML: a host-injected TinyMCE or CKEditor adapter
 * - Markdown: a host-injected MDXEditor adapter
 * - JSON/Text: Plain textarea
 *
 * Media picker integration is injectable via callbacks.
 */
import React, { useMemo, useRef, Suspense, useCallback, useEffect, } from "react";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
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
const CmsBodyEditor = React.memo(({ contentType, value, onChange, height = 500, label, editor = "ckeditor", editorAdapters, editorProps, onPickAsset, onUploadImage, }) => {
    const latestHtmlRef = useRef(value);
    const htmlNormalizationRunRef = useRef(0);
    const mountedRef = useRef(true);
    const normTimerRef = useRef(undefined);
    React.useEffect(() => {
        latestHtmlRef.current = value;
    }, [value]);
    // Cleanup normalization timer on unmount.
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (normTimerRef.current !== undefined) {
                clearTimeout(normTimerRef.current);
                normTimerRef.current = undefined;
            }
        };
    }, []);
    /**
     * Kick off base64 image normalization after a 500ms debounce.
     * This avoids redundant upload attempts during rapid typing while
     * images are embedded.  The epoch guard (htmlNormalizationRunRef) still
     * protects against stale results from earlier runs.
     */
    const scheduleNormalization = useCallback((nextValue) => {
        if (!mountedRef.current) {
            return;
        }
        if (normTimerRef.current !== undefined) {
            clearTimeout(normTimerRef.current);
        }
        normTimerRef.current = setTimeout(() => {
            normTimerRef.current = undefined;
            if (!mountedRef.current) {
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
                if (!mountedRef.current) {
                    return;
                }
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
        }, 500);
    }, [onChange, onUploadImage]);
    const handleHtmlEditorChange = React.useCallback((nextValue) => {
        latestHtmlRef.current = nextValue;
        onChange(nextValue);
        if (!onUploadImage) {
            return;
        }
        if (!hasEmbeddedBase64Image(nextValue)) {
            return;
        }
        scheduleNormalization(nextValue);
    }, [onChange, onUploadImage, scheduleNormalization]);
    const containerSx = useMemo(() => ({
        minHeight: height,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
    }), [height]);
    if (contentType === "html") {
        return (_jsxs(Box, { children: [label && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 0.5 }, children: label })), _jsx(Box, { sx: containerSx, children: _jsx(Suspense, { fallback: _jsx(LinearProgress, {}), children: _jsx(HtmlEditor, { value: value, onChange: handleHtmlEditorChange, height: height, editor: editor, editorAdapters: editorAdapters, editorProps: editorProps, onPickAsset: onPickAsset, onUploadImage: onUploadImage }) }) })] }));
    }
    if (contentType === "markdown") {
        return (_jsxs(Box, { children: [label && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 0.5 }, children: label })), _jsx(Box, { sx: containerSx, children: _jsx(Suspense, { fallback: _jsx(LinearProgress, {}), children: _jsx(MarkdownEditor, { value: value, onChange: onChange, editorAdapter: editorAdapters?.mdx, editorProps: editorProps?.mdx, onPickAsset: onPickAsset, onUploadImage: onUploadImage }) }) })] }));
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
});
// ─── Injected editor adapters ─────────────────────────────────────────────
const DEFAULT_CMS_TINYMCE_PROPS = {
    init: {
        license_key: "gpl",
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
        paste_data_images: true,
        automatic_uploads: true,
        paste_preprocess: (_pluginApi, data) => {
            data.content = stripLocalFileImages(data.content);
        },
    },
};
const useCmsEditorHandlers = (onPickAsset, onUploadImage) => {
    const pickAsset = useCallback(async (request) => {
        if (!onPickAsset) {
            return null;
        }
        const picked = await onPickAsset();
        if (!picked?.url) {
            return null;
        }
        return {
            url: picked.url,
            kind: request.kind,
            title: picked.name,
            text: picked.name,
            alt: picked.name,
            mimeType: picked.mimeType,
        };
    }, [onPickAsset]);
    const uploadImage = useCallback(async (request) => {
        if (!onUploadImage) {
            throw new Error("CMS image upload requires an onUploadImage handler");
        }
        const file = request.file ??
            (request.blob
                ? new File([request.blob], request.filename, {
                    type: request.mimeType || "application/octet-stream",
                })
                : undefined);
        if (!file) {
            throw new Error("CMS image upload requires a file or blob");
        }
        const url = await onUploadImage(file, { source: "editor-upload" });
        if (!url) {
            throw new Error("Upload failed");
        }
        return { url };
    }, [onUploadImage]);
    return {
        pickAsset: onPickAsset ? pickAsset : undefined,
        uploadImage: onUploadImage ? uploadImage : undefined,
    };
};
const HtmlEditor = ({ value, onChange, height, editor, editorAdapters, editorProps, onPickAsset, onUploadImage, }) => {
    const { mode, systemMode } = useColorScheme();
    const isDark = (mode === "system" ? systemMode : mode) === "dark";
    const Adapter = editorAdapters?.[editor];
    const editorSpecificProps = editorProps?.[editor] ??
        (editor === "tinymce" ? DEFAULT_CMS_TINYMCE_PROPS : undefined);
    const handlers = useCmsEditorHandlers(onPickAsset, onUploadImage);
    if (!Adapter) {
        return (_jsx(Box, { component: "textarea", value: value, onChange: (event) => onChange(event.target.value), sx: {
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
    return (_jsx(Adapter, { value: value, height: height, darkMode: isDark, editorProps: editorSpecificProps, onChange: onChange, onPickAsset: handlers.pickAsset, onUploadImage: handlers.uploadImage }));
};
const MarkdownEditor = ({ value, onChange, editorAdapter: Adapter, editorProps, onPickAsset, onUploadImage, }) => {
    const { mode, systemMode } = useColorScheme();
    const isDark = (mode === "system" ? systemMode : mode) === "dark";
    const handlers = useCmsEditorHandlers(onPickAsset, onUploadImage);
    if (!Adapter) {
        return (_jsx(Box, { component: "textarea", value: value, onChange: (event) => onChange(event.target.value), sx: {
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
    return (_jsx(Adapter, { value: value, height: 400, darkMode: isDark, editorProps: editorProps, onChange: onChange, onPickAsset: handlers.pickAsset, onUploadImage: handlers.uploadImage }));
};
CmsBodyEditor.displayName = "CmsBodyEditor";
export default CmsBodyEditor;
