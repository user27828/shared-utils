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
        return (_jsx(EditorComponent, { value: value, onEditorChange: onChange, darkMode: isDark, init: {
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
                file_picker_callback: onPickAsset
                    ? (_cb, _value, _meta) => {
                        onPickAsset().then((result) => {
                            if (result?.url) {
                                _cb(result.url, {
                                    title: result.name || "",
                                    ...(result.width ? { width: String(result.width) } : {}),
                                    ...(result.height
                                        ? { height: String(result.height) }
                                        : {}),
                                });
                            }
                        });
                    }
                    : undefined,
                images_upload_handler: onUploadImage
                    ? async (blobInfo) => {
                        const url = await onUploadImage(blobInfo.blob(), {
                            source: "editor-upload",
                        });
                        if (!url) {
                            throw new Error("Upload failed");
                        }
                        return url;
                    }
                    : undefined,
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
