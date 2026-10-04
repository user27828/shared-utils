import { jsx as _jsx } from "react/jsx-runtime";
import React, { lazy, Suspense } from "react";
import EditorImportFailure from "../src/components/wysiwyg/EditorImportFailure.js";
const LazyMDXEditor = lazy(async () => {
    try {
        return await import("../src/components/wysiwyg/MDXEditor.js");
    }
    catch (error) {
        const FailedMDXEditor = React.forwardRef((props) => (_jsx(EditorImportFailure, { engine: "MDXEditor", error: error, value: props.data, height: props.height, readOnly: props.readOnly, onChange: (value) => props.onChange?.(undefined, { getData: () => value }) })));
        return {
            default: FailedMDXEditor,
        };
    }
});
export const MDXEditor = React.forwardRef((props, ref) => {
    return (_jsx(Suspense, { fallback: null, children: _jsx(LazyMDXEditor, { ...props, ref: ref }) }));
});
MDXEditor.displayName = "MDXEditor";
export const MDXWysiwygAdapter = (props) => {
    const { value, readOnly, height, darkMode, onChange, onEditorInstance, onUploadImage, canonicalizeUrl, editorProps, } = props;
    const options = (editorProps ?? {});
    const uploadImage = onUploadImage
        ? async (request) => {
            return await onUploadImage({
                file: request.file,
                filename: request.filename,
                mimeType: request.mimeType,
                sizeBytes: request.sizeBytes,
            });
        }
        : undefined;
    return (_jsx(LazyMDXEditor, { ...options, data: value, readOnly: readOnly, height: height, darkMode: darkMode, onChange: (event, instance) => {
            onChange?.(instance?.getData?.() ?? "", event);
        }, onEditorInstance: onEditorInstance, onUploadImage: uploadImage, canonicalizeUrl: canonicalizeUrl }));
};
MDXWysiwygAdapter.displayName = "MDXWysiwygAdapter";
export default MDXEditor;
