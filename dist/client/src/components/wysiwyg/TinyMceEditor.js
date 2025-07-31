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
    const { data, onChange, onEditorInstance, ...otherProps } = props;
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
    const defaultInit = {
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
    };
    return (_jsx(Editor
    // No API key needed for self-hosted or community version
    , { 
        // No API key needed for self-hosted or community version
        onInit: (evt, editor) => {
            editorRef.current = editor;
            if (onEditorInstance)
                onEditorInstance(editor);
        }, initialValue: initialValueRef.current, value: data || "", onEditorChange: handleEditorChange, init: merge({}, defaultInit, otherProps.init), ...otherProps }));
};
TinyMceEditor.displayName = "TinyMceEditor";
export default TinyMceEditor;
