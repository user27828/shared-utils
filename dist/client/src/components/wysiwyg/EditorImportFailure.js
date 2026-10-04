import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
const EditorImportFailure = ({ engine, error, value = "", height = 320, readOnly, onChange, }) => {
    const message = error instanceof Error ? error.message : String(error);
    const minHeight = typeof height === "number" ? `${height}px` : height;
    return (_jsxs("div", { role: "alert", "data-editor-import-error": engine, children: [_jsxs("p", { children: [engine, " could not be loaded: ", message] }), _jsx("textarea", { "aria-label": `${engine} fallback editor`, value: value, disabled: readOnly, onChange: (event) => onChange(event.target.value), style: { width: "100%", minHeight, resize: "vertical" } })] }));
};
export default EditorImportFailure;
