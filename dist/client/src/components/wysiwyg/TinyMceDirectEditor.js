import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Direct TinyMCE implementation that bypasses @tinymce/tinymce-react
 * This ensures complete control over the loading order and prevents CDN fallback
 */
import React, { useRef, useEffect, useState } from "react";
// Function to dynamically load TinyMCE and all its dependencies
const loadTinyMCE = async () => {
    // Step 1: Load TinyMCE core first
    const tinymce = await import("tinymce/tinymce");
    // Step 2: Make it available globally immediately
    if (typeof window !== "undefined") {
        window.tinymce = tinymce.default;
        globalThis.tinymce = tinymce.default;
        // Add required utility functions
        if (!window.tinymce.util) {
            window.tinymce.util = {};
        }
        if (!window.tinymce.util.Delay) {
            window.tinymce.util.Delay = {
                setEditorTimeout: (editor, callback, time) => {
                    return setTimeout(callback, time);
                }
            };
        }
    }
    // Step 3: Now load all other dependencies
    await Promise.all([
        import("tinymce/models/dom/model"),
        import("tinymce/themes/silver"),
        import("tinymce/icons/default"),
        import("tinymce/skins/ui/oxide/skin"),
        import("tinymce/skins/content/default/content"),
        import("tinymce/skins/ui/oxide/content"),
    ]);
    // Step 4: Load plugins
    await Promise.all([
        import("tinymce/plugins/advlist"),
        import("tinymce/plugins/anchor"),
        import("tinymce/plugins/autolink"),
        import("tinymce/plugins/autoresize"),
        import("tinymce/plugins/autosave"),
        import("tinymce/plugins/charmap"),
        import("tinymce/plugins/code"),
        import("tinymce/plugins/codesample"),
        import("tinymce/plugins/directionality"),
        import("tinymce/plugins/emoticons"),
        import("tinymce/plugins/fullscreen"),
        import("tinymce/plugins/help"),
        import("tinymce/plugins/help/js/i18n/keynav/en"),
        import("tinymce/plugins/image"),
        import("tinymce/plugins/importcss"),
        import("tinymce/plugins/insertdatetime"),
        import("tinymce/plugins/link"),
        import("tinymce/plugins/lists"),
        import("tinymce/plugins/media"),
        import("tinymce/plugins/nonbreaking"),
        import("tinymce/plugins/pagebreak"),
        import("tinymce/plugins/preview"),
        import("tinymce/plugins/quickbars"),
        import("tinymce/plugins/save"),
        import("tinymce/plugins/searchreplace"),
        import("tinymce/plugins/table"),
        import("tinymce/plugins/visualblocks"),
        import("tinymce/plugins/visualchars"),
        import("tinymce/plugins/wordcount"),
        import("tinymce/plugins/emoticons/js/emojis"),
    ]);
    return window.tinymce;
};
// Direct TinyMCE component that doesn't use @tinymce/tinymce-react
const TinyMceDirectEditor = React.forwardRef((props, ref) => {
    const elementRef = useRef(null);
    const editorRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    // Expose editor instance through ref
    React.useImperativeHandle(ref, () => editorRef.current);
    useEffect(() => {
        const initEditor = async () => {
            if (!elementRef.current)
                return;
            try {
                // Load TinyMCE and all dependencies
                const tinymce = await loadTinyMCE();
                console.log("TinyMCE loaded successfully:", {
                    version: tinymce.majorVersion,
                    hasUtil: !!tinymce.util,
                    hasDelay: !!(tinymce.util && tinymce.util.Delay)
                });
                // Default configuration
                const defaultConfig = {
                    height: 400,
                    menubar: true,
                    plugins: [
                        "advlist",
                        "autolink",
                        "lists",
                        "link",
                        "image",
                        "charmap",
                        "preview",
                        "anchor",
                        "searchreplace",
                        "visualblocks",
                        "code",
                        "fullscreen",
                        "insertdatetime",
                        "media",
                        "table",
                        "help",
                        "wordcount",
                    ],
                    toolbar: "undo redo | blocks | " +
                        "bold italic forecolor | alignleft aligncenter " +
                        "alignright alignjustify | bullist numlist outdent indent | " +
                        "removeformat | help",
                    content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                    branding: false,
                    promotion: false,
                    license_key: "gpl",
                    base_url: undefined,
                    suffix: "",
                    setup: (editor) => {
                        editorRef.current = editor;
                        editor.on("init", () => {
                            setIsInitialized(true);
                            if (props.onInit) {
                                props.onInit({}, editor);
                            }
                        });
                        editor.on("change keyup", () => {
                            if (props.onEditorChange) {
                                props.onEditorChange(editor.getContent(), editor);
                            }
                        });
                    },
                };
                // Merge with user config
                const editorConfig = {
                    target: elementRef.current,
                    ...defaultConfig,
                    ...props.init,
                };
                // Initialize TinyMCE
                await tinymce.init(editorConfig);
                setIsLoading(false);
            }
            catch (err) {
                console.error("Failed to initialize TinyMCE:", err);
                setError(err instanceof Error ? err.message : String(err));
                setIsLoading(false);
            }
        };
        initEditor();
        // Cleanup function
        return () => {
            if (editorRef.current) {
                editorRef.current.remove();
            }
        };
    }, []);
    // Update content when props.value changes
    useEffect(() => {
        if (isInitialized && editorRef.current && props.value !== undefined) {
            const currentContent = editorRef.current.getContent();
            if (currentContent !== props.value) {
                editorRef.current.setContent(props.value);
            }
        }
    }, [props.value, isInitialized]);
    if (error) {
        return (_jsxs("div", { style: { padding: "1rem", border: "1px solid #ff0000", borderRadius: "4px", backgroundColor: "#fff5f5" }, children: [_jsx("p", { children: _jsx("strong", { children: "TinyMCE Error:" }) }), _jsx("p", { children: error })] }));
    }
    if (isLoading) {
        return _jsx("div", { children: "Loading TinyMCE..." });
    }
    return _jsx("textarea", { ref: elementRef, style: { width: "100%" }, disabled: props.disabled });
});
TinyMceDirectEditor.displayName = "TinyMceDirectEditor";
export default TinyMceDirectEditor;
