import { jsx as _jsx } from "react/jsx-runtime";
import { lazy, Suspense, useCallback } from "react";
import EditorImportFailure from "../src/components/wysiwyg/EditorImportFailure.js";
const LazyCKEditor5Classic = lazy(async () => {
    try {
        return await import("../src/components/wysiwyg/CKEditor5Classic.js");
    }
    catch (error) {
        return {
            default: (props) => (_jsx(EditorImportFailure, { engine: "CKEditor 5", error: error, value: props.data, height: props.height, readOnly: props.readOnly, onChange: (value) => props.onChange?.(undefined, { getData: () => value }) })),
        };
    }
});
export const CKEditor5Classic = (props) => {
    return (_jsx(Suspense, { fallback: null, children: _jsx(LazyCKEditor5Classic, { ...props }) }));
};
CKEditor5Classic.displayName = "CKEditor5Classic";
export const CKEditorWysiwygAdapter = (props) => {
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
        if (!picked) {
            return null;
        }
        return {
            url: picked.url,
            title: picked.title,
            text: picked.text,
            alt: picked.alt,
            kind: picked.kind,
            mimeType: picked.mimeType,
        };
    }, [onPickAsset]);
    const uploadImage = useCallback(async (request) => {
        if (!onUploadImage) {
            throw new Error("CKEditor image upload requires an onUploadImage handler");
        }
        return await onUploadImage({
            file: request.file,
            filename: request.filename,
            mimeType: request.mimeType,
            sizeBytes: request.sizeBytes,
            progress: request.progress,
        });
    }, [onUploadImage]);
    return (_jsx(LazyCKEditor5Classic, { ...options, data: value, readOnly: readOnly, height: height, darkMode: darkMode, canonicalizeUrl: canonicalizeUrl, onChange: (event, instance) => {
            onChange?.(instance?.getData?.() ?? "", event);
        }, onEditorInstance: onEditorInstance, onPickFile: onPickAsset ? pickFile : undefined, onUploadImage: onUploadImage ? uploadImage : undefined }));
};
CKEditorWysiwygAdapter.displayName = "CKEditorWysiwygAdapter";
export default CKEditor5Classic;
