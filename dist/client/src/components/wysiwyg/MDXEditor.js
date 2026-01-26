import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * WYSIWYG editor component using MDXEditor
 * @module MDXEditor
 */
import { useRef, useEffect, useImperativeHandle, forwardRef, } from "react";
import { MDXEditor as BaseMDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, linkPlugin, linkDialogPlugin, imagePlugin, tablePlugin, toolbarPlugin, markdownShortcutPlugin, UndoRedo, BoldItalicUnderlineToggles, BlockTypeSelect, CreateLink, InsertImage, InsertTable, InsertThematicBreak, ListsToggle, } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
/**
 * Dark theme CSS variables for MDXEditor
 * Injected as a style element when darkMode is enabled
 */
const DARK_THEME_STYLES = `
.mdx-editor-dark-theme {
  --baseBase: #111113;
  --baseBgSubtle: #18191b;
  --baseBg: #212225;
  --baseBgHover: #272a2d;
  --baseBgActive: #2e3135;
  --baseLine: #363a3f;
  --baseBorder: #43484e;
  --baseBorderHover: #5a6169;
  --baseSolid: #696e77;
  --baseSolidHover: #777b84;
  --baseText: #b0b4ba;
  --baseTextContrast: #edeef0;
  --accentBase: #0d1520;
  --accentBgSubtle: #111927;
  --accentBg: #0d2847;
  --accentBgHover: #003362;
  --accentBgActive: #004074;
  --accentLine: #104d87;
  --accentBorder: #205d9e;
  --accentBorderHover: #2870bd;
  --accentSolid: #0090ff;
  --accentSolidHover: #3b9eff;
  --accentText: #70b8ff;
  --accentTextContrast: #c2e6ff;
  --basePageBg: #1a1a1a;
  background: var(--basePageBg);
  color: var(--baseText);
}
.mdx-editor-dark-theme .mdxeditor-toolbar {
  background: #18191b;
  border-bottom: 1px solid #43484e;
}
.mdx-editor-dark-theme [class*="ContentEditable"] {
  background: #1a1a1a;
  color: #edeef0;
}
`;
/**
 * Hook to inject dark theme styles into the document head
 */
const useDarkThemeStyles = (enabled) => {
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const styleId = "mdx-editor-dark-theme-styles";
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = styleId;
            styleElement.textContent = DARK_THEME_STYLES;
            document.head.appendChild(styleElement);
        }
        // Cleanup is optional - we leave the styles in place for performance
        // since they may be reused by other MDXEditor instances
    }, [enabled]);
};
/**
 * Default toolbar component for MDXEditor
 */
const DefaultToolbarContents = () => (_jsxs(_Fragment, { children: [_jsx(UndoRedo, {}), _jsx(BlockTypeSelect, {}), _jsx(BoldItalicUnderlineToggles, {}), _jsx(ListsToggle, {}), _jsx(CreateLink, {}), _jsx(InsertImage, {}), _jsx(InsertTable, {}), _jsx(InsertThematicBreak, {})] }));
/**
 * Rich text/markdown editor component based on MDXEditor
 */
const MDXEditorComponent = forwardRef((props, ref) => {
    const { data, onChange, onEditorInstance, onUploadImage, canonicalizeUrl, darkMode = false, height = 400, imageAutocompleteSuggestions, showToolbar = true, className, placeholder, readOnly = false, additionalPlugins = [], } = props;
    const editorRef = useRef(null);
    const initialContentRef = useRef(data || "");
    // Inject dark theme styles when needed
    useDarkThemeStyles(darkMode);
    // Expose the editor ref through the forwarded ref
    useImperativeHandle(ref, () => editorRef.current, []);
    // Update content when data prop changes (if editor not focused)
    useEffect(() => {
        if (editorRef.current && data !== undefined) {
            // Only update if content differs to prevent cursor jumping
            const currentContent = editorRef.current.getMarkdown();
            if (currentContent !== data) {
                editorRef.current.setMarkdown(data);
            }
        }
    }, [data]);
    // Notify parent when editor is ready
    useEffect(() => {
        if (editorRef.current && onEditorInstance) {
            onEditorInstance(editorRef.current);
        }
    }, [onEditorInstance]);
    /**
     * Handle content changes - wraps in TinyMCE-compatible callback pattern
     */
    const handleChange = (markdown) => {
        if (onChange) {
            const editorInstance = {
                getData: () => markdown,
            };
            onChange(null, editorInstance);
        }
    };
    /**
     * Image upload handler - bridges MDXEditor's File-based API to our typed interface
     */
    const imageUploadHandler = async (file) => {
        if (!onUploadImage) {
            // No upload handler provided - return a placeholder or throw
            console.warn("MDXEditor: No onUploadImage handler provided for image upload");
            return URL.createObjectURL(file);
        }
        try {
            const result = await onUploadImage({
                file,
                filename: file.name,
                mimeType: file.type || "application/octet-stream",
                sizeBytes: file.size,
            });
            const url = canonicalizeUrl ? canonicalizeUrl(result.url) : result.url;
            return url;
        }
        catch (err) {
            console.error("MDXEditor: Image upload failed", err);
            throw new Error(err?.message || "Image upload failed");
        }
    };
    // Build plugins array
    const plugins = [
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        markdownShortcutPlugin(),
        imagePlugin({
            imageUploadHandler: onUploadImage ? imageUploadHandler : undefined,
            imageAutocompleteSuggestions,
        }),
        ...(showToolbar
            ? [toolbarPlugin({ toolbarContents: () => _jsx(DefaultToolbarContents, {}) })]
            : []),
        ...additionalPlugins,
    ];
    // Build className for theming
    const editorClassName = [
        darkMode ? "dark-theme mdx-editor-dark-theme" : "",
        className || "",
    ]
        .filter(Boolean)
        .join(" ");
    // Height style
    const heightValue = typeof height === "number" ? `${height}px` : height;
    return (_jsx("div", { style: {
            minHeight: heightValue,
            border: "1px solid",
            borderColor: darkMode ? "#555" : "#ccc",
            borderRadius: "4px",
            overflow: "hidden",
        }, children: _jsx(BaseMDXEditor, { ref: editorRef, markdown: initialContentRef.current, onChange: handleChange, plugins: plugins, className: editorClassName, placeholder: placeholder, readOnly: readOnly, contentEditableClassName: "mdxeditor-content-editable" }) }));
});
MDXEditorComponent.displayName = "MDXEditor";
export default MDXEditorComponent;
