import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @deprecated This TinyMCE editor bundle has been deprecated since 2024-06-10.  Use TinyMceEditor instead
 *
 * Provides a React wrapper for the TinyMCE editor, including all required themes, skins, and plugins.
 * This component is an exact copy of a previously working implementation and is intended for legacy use only.
 *
 * @remarks
 * - All necessary TinyMCE plugins, themes, and skins are imported to ensure the editor loads correctly.
 * - Uses `React.forwardRef` to support ref forwarding.
 * - For new implementations, consider migrating to a maintained or updated editor solution.
 */
/**
 * TinyMCE Bundle - Exact copy of working implementation
 * Based on the successful TinyMCEBundle.jsx from the other project
 */
import React from "react";
import { Editor } from "@tinymce/tinymce-react";
import "./tinymce/features/full.js";
// Use React.forwardRef to properly handle refs
const TinyMceEditor = React.forwardRef((props, ref) => {
    return _jsx(Editor, { ref: ref, ...props });
});
TinyMceEditor.displayName = "TinyMceEditor";
export default TinyMceEditor;
