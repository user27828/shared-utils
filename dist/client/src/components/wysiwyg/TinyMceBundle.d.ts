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
import "./tinymce/features/full.js";
declare const TinyMceEditor: React.ForwardRefExoticComponent<Omit<any, "ref"> & React.RefAttributes<any>>;
export default TinyMceEditor;
