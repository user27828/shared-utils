import { jsx as _jsx } from "react/jsx-runtime";
/**
 * WYSIWYG editor component using TinyMCE (Free Version)
 * @see {@link ./TinyMceBundle.jsx}
 * @module TinyMceEditor
 */
import React, { useRef } from "react";
import { default as Editor } from "./TinyMceBundle";
/**
 * Rich text editor component based on TinyMCE's free version
 * @param {Object} props - Component props
 * @param {string} props.data - Initial editor content
 * @param {Function} props.onChange - Change handler function
 */
const TinyMceEditor = (props) => {
    const { data, onChange } = props;
    const editorRef = useRef(null);
    const initialValueRef = useRef(data || "");
    // Update initialValueRef when data prop changes, but only when the editor isn't focused
    // This prevents cursor jumping during typing while still allowing content updates on edit
    useEffect(() => {
        if (editorRef.current && !editorRef.current.hasFocus()) {
            initialValueRef.current = data || "";
        }
    }, [data]);
    // For compatibility with the previous API that used editor.getData()
    const handleEditorChange = (content) => {
        if (onChange) {
            // Create an object similar to CKEditor's structure to maintain backward compatibility
            const editorInstance = {
                getData: () => content,
            };
            onChange(null, editorInstance);
        }
    };
    return (_jsx(Editor
    // No API key needed for self-hosted or community version
    , { 
        // No API key needed for self-hosted or community version
        onInit: (evt, editor) => {
            editorRef.current = editor;
        }, initialValue: initialValueRef.current, value: data || "", onEditorChange: handleEditorChange, init: {
            license_key: "gpl",
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
        } }));
};
export default TinyMceEditor;
