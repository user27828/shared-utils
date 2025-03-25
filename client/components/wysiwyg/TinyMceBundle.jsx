/**
 * Free version of TinyMCE editor
 * Use TinyMceEditor for an component instance
 * @see {@link https://www.tiny.cloud/docs/tinymce/latest/react-pm-bundle/}
 */
import { Editor } from "@tinymce/tinymce-react";

import "tinymce/tinymce"; // TinyMCE so the global var exists
import "tinymce/models/dom/model"; // DOM model
import "tinymce/themes/silver"; // Theme
import "tinymce/icons/default"; // Toolbar icons
import "tinymce/skins/ui/oxide/skin"; // Editor styles

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

export default function TinyMceEditor(props) {
  return <Editor {...props} />;
}
