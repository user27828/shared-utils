import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Suspense, useCallback, useEffect, useRef } from "react";
const legacyEditorProps = (props, editor) => {
    switch (editor) {
        case "tinymce":
            return props.tinymce;
        case "ckeditor":
            return props.ckeditor;
        case "easymde":
            return props.easymde;
        case "mdx":
            return props.mdx;
    }
};
const WysiwygEditor = (props) => {
    const { editor = "tinymce", adapters, value, readOnly, height, darkMode, onChange, onEditorInstance, onPickAsset, onUploadImage, canonicalizeUrl, editorProps, suspenseFallback = null, } = props;
    const instanceRef = useRef(null);
    const Adapter = adapters?.[editor];
    useEffect(() => {
        instanceRef.current = null;
    }, [editor]);
    const handleChange = useCallback((nextValue, rawEvent) => {
        onChange?.(nextValue, {
            editor,
            instance: instanceRef.current,
            rawEvent,
        });
    }, [editor, onChange]);
    const handleInstance = useCallback((instance) => {
        instanceRef.current = instance;
        onEditorInstance?.(instance, { editor });
    }, [editor, onEditorInstance]);
    if (!Adapter) {
        return (_jsxs("div", { role: "alert", "data-editor-adapter-missing": editor, children: ["No WYSIWYG adapter is configured for ", editor, "."] }));
    }
    const selectedEditorProps = editorProps?.[editor] ?? legacyEditorProps(props, editor);
    const adapterProps = {
        value,
        readOnly,
        height,
        darkMode,
        onChange: handleChange,
        onEditorInstance: handleInstance,
        onPickAsset,
        onUploadImage,
        canonicalizeUrl,
        editorProps: selectedEditorProps,
    };
    return (_jsx(Suspense, { fallback: suspenseFallback, children: _jsx(Adapter, { ...adapterProps }, editor) }));
};
WysiwygEditor.displayName = "WysiwygEditor";
export default WysiwygEditor;
