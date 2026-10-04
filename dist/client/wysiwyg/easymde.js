import { jsx as _jsx } from "react/jsx-runtime";
import { lazy, Suspense } from "react";
import EditorImportFailure from "../src/components/wysiwyg/EditorImportFailure.js";
const LazyEasyMDEEditor = lazy(async () => {
    try {
        return await import("../src/components/wysiwyg/EasyMDEEditor.js");
    }
    catch (error) {
        return {
            default: (props) => (_jsx(EditorImportFailure, { engine: "EasyMDE", error: error, value: props.value, height: props.height, readOnly: props.readOnly, onChange: (value) => props.onChange?.(value) })),
        };
    }
});
export const EasyMDEEditor = (props) => {
    return (_jsx(Suspense, { fallback: null, children: _jsx(LazyEasyMDEEditor, { ...props }) }));
};
EasyMDEEditor.displayName = "EasyMDEEditor";
export const EasyMDEWysiwygAdapter = (props) => {
    const { value, readOnly, height, onChange, onEditorInstance, onPickAsset, onUploadImage, canonicalizeUrl, editorProps, } = props;
    const options = (editorProps ?? {});
    return (_jsx(LazyEasyMDEEditor, { ...options, value: value, readOnly: readOnly, height: height, onChange: (nextValue) => onChange?.(nextValue), onEditorInstance: onEditorInstance, onPickAsset: onPickAsset, onUploadImage: onUploadImage, canonicalizeUrl: canonicalizeUrl }));
};
EasyMDEWysiwygAdapter.displayName = "EasyMDEWysiwygAdapter";
export default EasyMDEEditor;
