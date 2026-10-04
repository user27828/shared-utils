import { jsx as _jsx } from "react/jsx-runtime";
/**
 * WYSIWYG editor component using TinyMCE (Free Version)
 * @module TinyMceEditor
 */
import { useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import merge from "lodash-es/merge.js";
import "./tinymce/minimal.js";
/**
 * Rich text editor component based on TinyMCE's free version
 */
const TinyMceEditor = (props) => {
    const { data, onChange, onEditorInstance, onPickFile, onUploadImage, canonicalizeUrl, skinUrl, contentCss, darkMode, init: initOverride, ...otherProps } = props;
    const editorRef = useRef(null);
    const initialValueRef = useRef(data || "");
    const lastExternalValueRef = useRef(data || "");
    const lastPropagatedValueRef = useRef(data || "");
    const pendingExternalValueRef = useRef(null);
    const pendingLocalValuesRef = useRef([]);
    const editorKey = darkMode ? "dark" : "light";
    const lastEditorKeyRef = useRef(editorKey);
    if (lastEditorKeyRef.current !== editorKey) {
        initialValueRef.current = data || lastExternalValueRef.current || "";
        lastEditorKeyRef.current = editorKey;
    }
    useEffect(() => {
        const editor = editorRef.current;
        const nextValue = data || "";
        const pendingLocalValues = pendingLocalValuesRef.current;
        const matchedPendingIndex = pendingLocalValues.lastIndexOf(nextValue);
        if (matchedPendingIndex !== -1) {
            const hasNewerPendingValue = matchedPendingIndex < pendingLocalValues.length - 1;
            pendingLocalValues.splice(0, matchedPendingIndex + 1);
            if (hasNewerPendingValue) {
                return;
            }
        }
        else if (pendingLocalValues.length > 0 &&
            nextValue !== lastExternalValueRef.current) {
            pendingLocalValues.length = 0;
        }
        if (!editor) {
            initialValueRef.current = nextValue;
            lastExternalValueRef.current = nextValue;
            lastPropagatedValueRef.current = nextValue;
            return;
        }
        if (nextValue === lastExternalValueRef.current) {
            lastPropagatedValueRef.current = nextValue;
            return;
        }
        try {
            if (editor.hasFocus?.()) {
                return;
            }
            const currentValue = editor.getContent?.() || "";
            if (currentValue === nextValue) {
                lastExternalValueRef.current = nextValue;
                lastPropagatedValueRef.current = nextValue;
                return;
            }
            pendingExternalValueRef.current = nextValue;
            editor.setContent(nextValue);
            lastExternalValueRef.current = nextValue;
            lastPropagatedValueRef.current = nextValue;
        }
        catch {
            pendingExternalValueRef.current = null;
        }
    }, [data]);
    const handleEditorChange = (content) => {
        const pendingExternalValue = pendingExternalValueRef.current;
        lastExternalValueRef.current = content;
        if (pendingExternalValue !== null) {
            pendingExternalValueRef.current = null;
            if (content === pendingExternalValue) {
                return;
            }
        }
        if (content === lastPropagatedValueRef.current) {
            return;
        }
        lastPropagatedValueRef.current = content;
        if (onChange) {
            const pendingLocalValues = pendingLocalValuesRef.current;
            if (pendingLocalValues[pendingLocalValues.length - 1] !== content) {
                pendingLocalValues.push(content);
            }
            const editorInstance = {
                getData: () => content,
            };
            onChange(null, editorInstance);
        }
    };
    const handleEditorEvent = (_event, editor) => {
        const content = editor?.getContent?.() || editorRef.current?.getContent?.() || "";
        handleEditorChange(content);
    };
    // Select light or dark skin based on darkMode prop.
    const resolvedSkinUrl = skinUrl ||
        (darkMode ? "/tinymce/skins/ui/oxide-dark" : "/tinymce/skins/ui/oxide");
    const resolvedContentCss = contentCss ||
        (darkMode
            ? "/tinymce/skins/content/dark/content.min.css"
            : "/tinymce/skins/content/default/content.min.css");
    const defaultInit = {
        license_key: "gpl",
        // Absolute skin paths — TinyMCE resolves relative to the page URL by
        // default which breaks on deep routes like /content/cms/:uid.  Host apps
        // using viteStaticCopy put skins at /tinymce/skins/; callers can still
        // override via the `skinUrl` prop or `init.skin_url`.
        skin_url: resolvedSkinUrl,
        content_css: resolvedContentCss,
        height: 500,
        menubar: true,
        plugins: [
            "advlist",
            "anchor",
            "autolink",
            "help",
            "image",
            "link",
            "lists",
            "searchreplace",
            "table",
            "wordcount",
        ],
        toolbar: "undo redo | blocks | " +
            "bold italic forecolor | alignleft aligncenter " +
            "alignright alignjustify | bullist numlist outdent indent | " +
            "removeformat | help",
        content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
        branding: false,
        promotion: false,
    };
    const filePickerCallback = onPickFile &&
        ((callback, value, meta) => {
            void (async () => {
                const pick = await onPickFile({
                    value,
                    meta: {
                        filetype: meta?.filetype,
                        fieldname: meta?.fieldname,
                    },
                });
                if (!pick) {
                    return;
                }
                const url = canonicalizeUrl ? canonicalizeUrl(pick.url) : pick.url;
                const callbackMeta = {};
                // TinyMCE supports a limited set of meta fields per picker type.
                if (meta?.filetype === "image") {
                    if (pick.alt) {
                        callbackMeta.alt = pick.alt;
                    }
                    if (pick.title) {
                        callbackMeta.title = pick.title;
                    }
                }
                else if (meta?.filetype === "file") {
                    if (pick.text) {
                        callbackMeta.text = pick.text;
                    }
                    if (pick.title) {
                        callbackMeta.title = pick.title;
                    }
                }
                else {
                    if (pick.text) {
                        callbackMeta.text = pick.text;
                    }
                    if (pick.title) {
                        callbackMeta.title = pick.title;
                    }
                }
                callback(url, callbackMeta);
            })().catch((err) => {
                // Keep shared-utils standalone; no external logger dependency.
                console.error("TinyMceEditor file_picker_callback failed", err);
            });
        });
    const imagesUploadHandler = onUploadImage &&
        (async (blobInfo, progress) => {
            try {
                const blob = blobInfo?.blob?.() || blobInfo;
                const filename = (typeof blobInfo?.filename === "function" && blobInfo.filename()) ||
                    "image";
                const mimeType = blob?.type || "application/octet-stream";
                const sizeBytes = typeof blob?.size === "number" ? blob.size : 0;
                if (typeof progress === "function") {
                    progress(0);
                }
                const result = await onUploadImage({
                    blob,
                    filename,
                    mimeType,
                    sizeBytes,
                    progress: typeof progress === "function" ? progress : undefined,
                });
                if (typeof progress === "function") {
                    progress(100);
                }
                const url = canonicalizeUrl ? canonicalizeUrl(result.url) : result.url;
                return url;
            }
            catch (err) {
                console.error("TinyMceEditor images_upload_handler failed", err);
                throw new Error(err?.message || "Image upload failed");
            }
        });
    return (_jsx(Editor
    // Force re-mount when dark mode changes so TinyMCE reloads the skin.
    , { 
        // No API key needed for self-hosted or community version
        onInit: (evt, editor) => {
            editorRef.current = editor;
            if (onEditorInstance) {
                onEditorInstance(editor);
            }
        }, initialValue: initialValueRef.current, onEditorChange: handleEditorChange, onUndo: handleEditorEvent, onRedo: handleEditorEvent, init: merge({}, defaultInit, initOverride, {
            // skinUrl/contentCss props already resolved into defaultInit;
            // only override here if caller passed explicit values.
            ...(props.skinUrl ? { skin_url: props.skinUrl } : {}),
            ...(props.contentCss ? { content_css: props.contentCss } : {}),
            ...(filePickerCallback
                ? { file_picker_callback: filePickerCallback }
                : {}),
            ...(imagesUploadHandler
                ? { images_upload_handler: imagesUploadHandler }
                : {}),
        }), ...otherProps }, editorKey));
};
TinyMceEditor.displayName = "TinyMceEditor";
export default TinyMceEditor;
