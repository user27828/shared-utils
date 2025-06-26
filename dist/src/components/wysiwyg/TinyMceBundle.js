import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Free version of TinyMCE editor
 * Use TinyMceEditor for an component instance
 * @see {@link https://www.tiny.cloud/docs/tinymce/latest/react-pm-bundle/}
 */
import { Editor } from "@tinymce/tinymce-react";
import "tinymce/tinymce.js"; // TinyMCE so the global var exists
import "tinymce/models/dom/model.js"; // DOM model
import "tinymce/themes/silver/index.js"; // Theme
import "tinymce/icons/default/index.js"; // Toolbar icons
import "tinymce/skins/ui/oxide/skin.js"; // Editor styles
// importing the plugin js.
// if you use a plugin that is not listed here the editor will fail to load
import "tinymce/plugins/advlist/index.js";
import "tinymce/plugins/anchor/index.js";
import "tinymce/plugins/autolink/index.js";
import "tinymce/plugins/autoresize/index.js";
import "tinymce/plugins/autosave/index.js";
import "tinymce/plugins/charmap/index.js";
import "tinymce/plugins/code/index.js";
import "tinymce/plugins/codesample/index.js";
import "tinymce/plugins/directionality/index.js";
import "tinymce/plugins/emoticons/index.js";
import "tinymce/plugins/fullscreen/index.js";
import "tinymce/plugins/help/index.js";
import "tinymce/plugins/help/js/i18n/keynav/en.js";
import "tinymce/plugins/image/index.js";
import "tinymce/plugins/importcss/index.js";
import "tinymce/plugins/insertdatetime/index.js";
import "tinymce/plugins/link/index.js";
import "tinymce/plugins/lists/index.js";
import "tinymce/plugins/media/index.js";
import "tinymce/plugins/nonbreaking/index.js";
import "tinymce/plugins/pagebreak/index.js";
import "tinymce/plugins/preview/index.js";
import "tinymce/plugins/quickbars/index.js";
import "tinymce/plugins/save/index.js";
import "tinymce/plugins/searchreplace/index.js";
import "tinymce/plugins/table/index.js";
import "tinymce/plugins/visualblocks/index.js";
import "tinymce/plugins/visualchars/index.js";
import "tinymce/plugins/wordcount/index.js";
// importing plugin resources
import "tinymce/plugins/emoticons/js/emojis.js";
// Content styles, including inline UI like fake cursors
import "tinymce/skins/content/default/content.js";
import "tinymce/skins/ui/oxide/content.js";
export default function TinyMceEditor(props) {
    return _jsx(Editor, { ...props });
}
