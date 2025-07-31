/**
 * WYSIWYG editor component using TinyMCE (Free Version)
 * @module TinyMceEditor
 */
import React from "react";
import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin";
import "tinymce/skins/ui/oxide-dark/skin";
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
import "tinymce/plugins/emoticons/js/emojis";
import "tinymce/skins/content/default/content";
import "tinymce/skins/ui/oxide/content";
import "tinymce/skins/content/dark/content";
import "tinymce/skins/ui/oxide-dark/content";
export interface TinyMceEditorProps {
    /**
     * Initial editor content
     */
    data?: string;
    /**
     * Change handler function
     */
    onChange?: (event: any, editor: {
        getData: () => string;
    }) => void;
    /**
     * Callback to receive the TinyMCE editor instance
     */
    onEditorInstance?: (editor: any) => void;
    /**
     * Additional props passed to the TinyMCE editor
     */
    [key: string]: any;
}
/**
 * Rich text editor component based on TinyMCE's free version
 */
declare const TinyMceEditor: React.FC<TinyMceEditorProps>;
export default TinyMceEditor;
//# sourceMappingURL=TinyMceEditor.d.ts.map