/**
 * Direct TinyMCE implementation that bypasses @tinymce/tinymce-react
 * This ensures complete control over the loading order and prevents CDN fallback
 */
import React from "react";
declare module "tinymce/models/dom/model";
declare module "tinymce/themes/silver";
declare module "tinymce/icons/default";
declare module "tinymce/skins/ui/oxide/skin";
declare module "tinymce/skins/content/default/content";
declare module "tinymce/skins/ui/oxide/content";
declare module "tinymce/plugins/*";
declare module "tinymce/plugins/emoticons/js/emojis";
declare module "tinymce/plugins/help/js/i18n/keynav/en";
interface TinyMceDirectProps {
    value?: string;
    init?: any;
    onInit?: (evt: any, editor: any) => void;
    onEditorChange?: (content: string, editor: any) => void;
    disabled?: boolean;
    [key: string]: any;
}
declare const TinyMceDirectEditor: React.ForwardRefExoticComponent<Omit<TinyMceDirectProps, "ref"> & React.RefAttributes<any>>;
export default TinyMceDirectEditor;
//# sourceMappingURL=TinyMceDirectEditor.d.ts.map