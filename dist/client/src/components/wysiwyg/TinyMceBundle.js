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
// importing the plugin js.
// if you use a plugin that is not listed here the editor will fail to load
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
// importing plugin resources
import "tinymce/plugins/emoticons/js/emojis";
// Content styles, including inline UI like fake cursors
import "tinymce/skins/content/default/content";
import "tinymce/skins/ui/oxide/content";
// Dark theme content styles
import "tinymce/skins/content/dark/content";
import "tinymce/skins/ui/oxide-dark/content";
// Use React.forwardRef to properly handle refs
const TinyMceEditor = React.forwardRef((props, ref) => {
    return _jsx(Editor, { ref: ref, ...props });
});
TinyMceEditor.displayName = "TinyMceEditor";
export default TinyMceEditor;
