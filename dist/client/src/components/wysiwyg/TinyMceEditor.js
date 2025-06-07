"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * WYSIWYG editor component using TinyMCE (Free Version)
 * @see {@link ./TinyMceBundle.jsx}
 * @module TinyMceEditor
 */
const react_1 = __importStar(require("react"));
const TinyMceBundle_1 = __importDefault(require("./TinyMceBundle"));
/**
 * Rich text editor component based on TinyMCE's free version
 * @param {Object} props - Component props
 * @param {string} props.data - Initial editor content
 * @param {Function} props.onChange - Change handler function
 */
const TinyMceEditor = (props) => {
    const { data, onChange } = props;
    const editorRef = (0, react_1.useRef)(null);
    const initialValueRef = (0, react_1.useRef)(data || "");
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
    return ((0, jsx_runtime_1.jsx)(TinyMceBundle_1.default
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
exports.default = TinyMceEditor;
