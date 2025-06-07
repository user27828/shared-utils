"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TinyMceEditor;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Free version of TinyMCE editor
 * Use TinyMceEditor for an component instance
 * @see {@link https://www.tiny.cloud/docs/tinymce/latest/react-pm-bundle/}
 */
const tinymce_react_1 = require("@tinymce/tinymce-react");
require("tinymce/tinymce"); // TinyMCE so the global var exists
require("tinymce/models/dom/model"); // DOM model
require("tinymce/themes/silver"); // Theme
require("tinymce/icons/default"); // Toolbar icons
require("tinymce/skins/ui/oxide/skin"); // Editor styles
// importing the plugin js.
// if you use a plugin that is not listed here the editor will fail to load
require("tinymce/plugins/advlist");
require("tinymce/plugins/anchor");
require("tinymce/plugins/autolink");
require("tinymce/plugins/autoresize");
require("tinymce/plugins/autosave");
require("tinymce/plugins/charmap");
require("tinymce/plugins/code");
require("tinymce/plugins/codesample");
require("tinymce/plugins/directionality");
require("tinymce/plugins/emoticons");
require("tinymce/plugins/fullscreen");
require("tinymce/plugins/help");
require("tinymce/plugins/help/js/i18n/keynav/en");
require("tinymce/plugins/image");
require("tinymce/plugins/importcss");
require("tinymce/plugins/insertdatetime");
require("tinymce/plugins/link");
require("tinymce/plugins/lists");
require("tinymce/plugins/media");
require("tinymce/plugins/nonbreaking");
require("tinymce/plugins/pagebreak");
require("tinymce/plugins/preview");
require("tinymce/plugins/quickbars");
require("tinymce/plugins/save");
require("tinymce/plugins/searchreplace");
require("tinymce/plugins/table");
require("tinymce/plugins/visualblocks");
require("tinymce/plugins/visualchars");
require("tinymce/plugins/wordcount");
// importing plugin resources
require("tinymce/plugins/emoticons/js/emojis");
// Content styles, including inline UI like fake cursors
require("tinymce/skins/content/default/content");
require("tinymce/skins/ui/oxide/content");
function TinyMceEditor(props) {
    return (0, jsx_runtime_1.jsx)(tinymce_react_1.Editor, { ...props });
}
