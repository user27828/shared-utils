import { jsx as _jsx } from "react/jsx-runtime";
/**
 * WYSIWYG editor component using TinyMCE (Free Version)
 * @module TinyMceEditor
 */
import { useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { merge } from "lodash-es";
// TinyMCE so the global var exists
import "tinymce/tinymce";
// DOM model
import "tinymce/models/dom/model";
// Theme
import "tinymce/themes/silver";
// Toolbar icons
import "tinymce/icons/default";
// Editor styles
import "tinymce/skins/ui/oxide/skin";
// Dark theme styles
import "tinymce/skins/ui/oxide-dark/skin";
// Plugins
import "tinymce/plugins/advlist";
import "tinymce/plugins/anchor";
import "tinymce/plugins/autolink";
import "tinymce/plugins/autoresize";
import "tinymce/plugins/autosave";
import "tinymce/plugins/charmap";
import "tinymce/plugins/code";
import "tinymce/plugins/codesample";
import "tinymce/plugins/directionality";
import "tinymce/plugins/emoticons";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/help";
import "tinymce/plugins/help/js/i18n/keynav/en";
import "tinymce/plugins/image";
import "tinymce/plugins/importcss";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/media";
import "tinymce/plugins/nonbreaking";
import "tinymce/plugins/pagebreak";
import "tinymce/plugins/preview";
import "tinymce/plugins/quickbars";
import "tinymce/plugins/save";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/table";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/visualchars";
import "tinymce/plugins/wordcount";
// Plugin resources
import "tinymce/plugins/emoticons/js/emojis";
// Content styles
import "tinymce/skins/content/default/content";
import "tinymce/skins/ui/oxide/content";
// Dark theme content styles
import "tinymce/skins/content/dark/content";
import "tinymce/skins/ui/oxide-dark/content";
/**
 * Rich text editor component based on TinyMCE's free version
 */
const TinyMceEditor = (props) => {
    const { data, onChange, onEditorInstance, onPickFile, onUploadImage, canonicalizeUrl, skinUrl, contentCss, darkMode, init: initOverride, ...otherProps } = props;
    const editorRef = useRef(null);
    const initialValueRef = useRef(data || "");
    useEffect(() => {
        if (editorRef.current && !editorRef.current.hasFocus()) {
            initialValueRef.current = data || "";
        }
    }, [data]);
    const handleEditorChange = (content) => {
        if (onChange) {
            const editorInstance = {
                getData: () => content,
            };
            onChange(null, editorInstance);
        }
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
        }, initialValue: initialValueRef.current, value: data || "", onEditorChange: handleEditorChange, init: merge({}, defaultInit, initOverride, {
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
        }), ...otherProps }, darkMode ? "dark" : "light"));
};
TinyMceEditor.displayName = "TinyMceEditor";
export default TinyMceEditor;
