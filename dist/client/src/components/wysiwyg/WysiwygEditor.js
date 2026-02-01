import { jsx as _jsx } from "react/jsx-runtime";
import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { normalizeCssSize, } from "./wysiwyg-common.js";
const CKEditor5ClassicLazy = React.lazy(() => import("./CKEditor5Classic.js"));
const EasyMDEEditorLazy = React.lazy(() => import("./EasyMDEEditor.js"));
const TinyMceEditorLazy = React.lazy(() => import("./TinyMceEditor.js"));
const filetypeToAssetKind = (filetype) => {
    if (filetype === "image") {
        return "image";
    }
    if (filetype === "media") {
        return "media";
    }
    return "file";
};
const normalizePickResultForTinyMce = (pick) => {
    return {
        url: pick.url,
        title: pick.title,
        text: pick.text,
        alt: pick.alt,
    };
};
const normalizePickResultForCkeditor = (pick) => {
    return {
        url: pick.url,
        title: pick.title,
        text: pick.text,
        alt: pick.alt,
        kind: pick.kind,
    };
};
const WysiwygEditor = (props) => {
    const { editor = "tinymce", value, readOnly, height, onChange, onEditorInstance, onPickAsset, onUploadImage, canonicalizeUrl, tinymce, ckeditor, easymde, suspenseFallback, } = props;
    const instanceRef = useRef(null);
    // Clear stale instance ref when editor type changes
    useEffect(() => {
        instanceRef.current = null;
    }, [editor]);
    const normalizedHeight = useMemo(() => {
        return normalizeCssSize(height);
    }, [height]);
    const handleInstance = (kind) => {
        return (instance) => {
            instanceRef.current = instance;
            if (onEditorInstance) {
                onEditorInstance(instance, { editor: kind });
            }
        };
    };
    const handleChange = (kind) => {
        return (rawEvent, editorLike) => {
            if (!onChange) {
                return;
            }
            const nextValue = editorLike?.getData?.() || "";
            onChange(nextValue, {
                editor: kind,
                instance: instanceRef.current,
                rawEvent,
            });
        };
    };
    const tinymcePickFile = useMemo(() => {
        if (!onPickAsset) {
            return undefined;
        }
        return async (request) => {
            const kind = filetypeToAssetKind(request.meta?.filetype);
            const pick = await onPickAsset({
                value: request.value,
                kind,
            });
            if (!pick) {
                return null;
            }
            return normalizePickResultForTinyMce(pick);
        };
    }, [onPickAsset]);
    const tinymceUploadImage = useMemo(() => {
        if (!onUploadImage) {
            return undefined;
        }
        return async (request) => {
            return await onUploadImage({
                blob: request.blob,
                filename: request.filename,
                mimeType: request.mimeType,
                sizeBytes: request.sizeBytes,
                progress: request.progress,
            });
        };
    }, [onUploadImage]);
    const ckeditorPickFile = useMemo(() => {
        if (!onPickAsset) {
            return undefined;
        }
        return async (request) => {
            const kind = filetypeToAssetKind(request.meta?.filetype);
            const pick = await onPickAsset({
                value: request.value,
                kind,
            });
            if (!pick) {
                return null;
            }
            return normalizePickResultForCkeditor(pick);
        };
    }, [onPickAsset]);
    const ckeditorUploadImage = useMemo(() => {
        if (!onUploadImage) {
            return undefined;
        }
        return async (request) => {
            return await onUploadImage({
                file: request.file,
                filename: request.filename,
                mimeType: request.mimeType,
                sizeBytes: request.sizeBytes,
                progress: request.progress,
            });
        };
    }, [onUploadImage]);
    if (editor === "tinymce") {
        const init = {
            ...(tinymce?.init || {}),
            ...(normalizedHeight ? { height: normalizedHeight } : {}),
            ...(typeof readOnly === "boolean" ? { readonly: readOnly } : {}),
        };
        return (_jsx(Suspense, { fallback: suspenseFallback || null, children: _jsx(TinyMceEditorLazy, { ...tinymce, init: init, disabled: !!readOnly, data: value, canonicalizeUrl: canonicalizeUrl, onChange: handleChange("tinymce"), onEditorInstance: handleInstance("tinymce"), onPickFile: tinymcePickFile, onUploadImage: tinymceUploadImage }) }));
    }
    if (editor === "ckeditor") {
        return (_jsx(Suspense, { fallback: suspenseFallback || null, children: _jsx(CKEditor5ClassicLazy, { ...ckeditor, data: value, height: normalizedHeight, readOnly: readOnly, canonicalizeUrl: canonicalizeUrl, onChange: handleChange("ckeditor"), onEditorInstance: handleInstance("ckeditor"), onPickFile: ckeditorPickFile, onUploadImage: ckeditorUploadImage }) }));
    }
    return (_jsx(Suspense, { fallback: suspenseFallback || null, children: _jsx(EasyMDEEditorLazy, { ...easymde, value: value, height: normalizedHeight, readOnly: readOnly, canonicalizeUrl: canonicalizeUrl, onChange: (next) => {
                if (!onChange) {
                    return;
                }
                onChange(next, {
                    editor: "easymde",
                    instance: instanceRef.current,
                });
            }, onEditorInstance: handleInstance("easymde"), onPickAsset: onPickAsset, onUploadImage: onUploadImage }) }));
};
WysiwygEditor.displayName = "WysiwygEditor";
export default WysiwygEditor;
