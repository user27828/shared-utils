import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Conditional TinyMCE Bundle - only loads if dependencies are available
 * This prevents build errors when TinyMCE dependencies are not installed
 */
import React, { useState, useEffect } from "react";
const MissingDependencyComponent = React.forwardRef((props, ref) => {
    console.warn("TinyMCE components require @tinymce/tinymce-react and tinymce to be installed");
    return (_jsxs("div", { ref: ref, style: {
            padding: "1rem",
            border: "1px dashed #ccc",
            borderRadius: "4px",
            backgroundColor: "#f9f9f9",
        }, children: [_jsx("p", { children: _jsx("strong", { children: "TinyMCE Editor" }) }), _jsxs("p", { children: ["Install ", _jsx("code", { children: "@tinymce/tinymce-react" }), " and ", _jsx("code", { children: "tinymce" }), " to use this component."] })] }));
});
MissingDependencyComponent.displayName = "MissingDependencyComponent";
// Create the wrapper components with proper forwardRef
const TinyMceBundle = React.forwardRef((props, ref) => {
    const [ActualTinyMceBundle, setActualTinyMceBundle] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    useEffect(() => {
        const loadTinyMce = async () => {
            try {
                // Try to use the regular TinyMceBundle
                const module = await import("./TinyMceBundle.tsx");
                setActualTinyMceBundle(() => module.default);
                setIsLoading(false);
            }
            catch (error) {
                console.warn("TinyMCE bundle not available:", error.message);
                setHasError(true);
                setIsLoading(false);
            }
        };
        loadTinyMce();
    }, []);
    if (isLoading) {
        return _jsx("div", { children: "Loading TinyMCE..." });
    }
    if (hasError || !ActualTinyMceBundle) {
        return _jsx(MissingDependencyComponent, { ref: ref, ...props });
    }
    // Forward the ref properly to the actual component using React.createElement
    return React.createElement(ActualTinyMceBundle, { ref, ...props });
});
TinyMceBundle.displayName = "TinyMceBundle";
const TinyMceEditor = TinyMceBundle;
export { TinyMceBundle, TinyMceEditor };
export default TinyMceBundle;
