import { jsx as _jsx } from "react/jsx-runtime";
import { lazy, Suspense, useCallback, useMemo } from "react";
import { normalizeCssSize, } from "../src/components/wysiwyg/wysiwyg-common.js";
import EditorImportFailure from "../src/components/wysiwyg/EditorImportFailure.js";
const LazyTinyMceEditor = lazy(async () => {
    try {
        return await import("../src/components/wysiwyg/TinyMceEditor.js");
    }
    catch (error) {
        return {
            default: (props) => (_jsx(EditorImportFailure, { engine: "TinyMCE", error: error, value: props.data, height: props.init?.height, readOnly: props.disabled, onChange: (value) => props.onChange?.(undefined, { getData: () => value }) })),
        };
    }
});
export const TinyMceEditor = (props) => {
    return (_jsx(Suspense, { fallback: null, children: _jsx(LazyTinyMceEditor, { ...props }) }));
};
TinyMceEditor.displayName = "TinyMceEditor";
export const TinyMceWysiwygAdapter = (props) => {
    const { value, readOnly, height, darkMode, onChange, onEditorInstance, onPickAsset, onUploadImage, canonicalizeUrl, editorProps, } = props;
    const options = (editorProps ?? {});
    const pickFile = useCallback(async (request) => {
        if (!onPickAsset) {
            return null;
        }
        const kind = request.meta?.filetype === "image" || request.meta?.filetype === "media"
            ? request.meta.filetype
            : "file";
        const picked = await onPickAsset({ value: request.value, kind });
        return picked ? toTinyMcePickResult(picked) : null;
    }, [onPickAsset]);
    const uploadImage = useCallback(async (request) => {
        if (!onUploadImage) {
            throw new Error("TinyMCE image upload requires an onUploadImage handler");
        }
        return await onUploadImage({
            blob: request.blob,
            filename: request.filename,
            mimeType: request.mimeType,
            sizeBytes: request.sizeBytes,
            progress: request.progress,
        });
    }, [onUploadImage]);
    const init = useMemo(() => {
        return {
            ...options.init,
            ...(height === undefined ? {} : { height: normalizeCssSize(height) }),
            ...(readOnly === undefined ? {} : { readonly: readOnly }),
        };
    }, [height, options.init, readOnly]);
    return (_jsx(LazyTinyMceEditor, { ...options, init: init, data: value, disabled: !!readOnly, darkMode: darkMode, canonicalizeUrl: canonicalizeUrl, onChange: (event, instance) => {
            onChange?.(instance?.getData?.() ?? "", event);
        }, onEditorInstance: onEditorInstance, onPickFile: onPickAsset ? pickFile : undefined, onUploadImage: onUploadImage ? uploadImage : undefined }));
};
TinyMceWysiwygAdapter.displayName = "TinyMceWysiwygAdapter";
const toTinyMcePickResult = (picked) => {
    return {
        url: picked.url,
        title: picked.title,
        text: picked.text,
        alt: picked.alt,
    };
};
export default TinyMceEditor;
