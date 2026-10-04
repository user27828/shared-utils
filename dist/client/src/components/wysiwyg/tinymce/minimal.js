// TinyMCE global must be evaluated before the model, theme, icons, and plugins.
import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
// Both skins are supported by TinyMceEditor.darkMode. Content skins style the
// editor document and the UI elements rendered inside it.
import "tinymce/skins/ui/oxide/skin";
import "tinymce/skins/ui/oxide-dark/skin";
import "tinymce/skins/content/default/content";
import "tinymce/skins/ui/oxide/content";
import "tinymce/skins/content/dark/content";
import "tinymce/skins/ui/oxide-dark/content";
// Plugins required by TinyMceEditor.defaultInit and its default toolbar.
import "tinymce/plugins/advlist";
import "tinymce/plugins/anchor";
import "tinymce/plugins/autolink";
import "tinymce/plugins/help";
import "tinymce/plugins/help/js/i18n/keynav/en";
import "tinymce/plugins/image";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";
