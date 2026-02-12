/**
 * CMS UI Adapter — shared-utils
 *
 * Injectable host-app integrations for the shared CMS admin UI.
 * The host provides media picker, navigation, and toast functionality.
 */
import type { CmsApi } from "../CmsApi.js";
export interface CmsMediaPickerProps {
    open: boolean;
    title?: string;
    selectedFileUid?: string | null;
    onClose: () => void;
    onSelect: (file: {
        uid: string;
        name?: string;
        url?: string;
    }) => void;
}
export interface CmsToastAdapter {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}
export interface CmsNavigationAdapter {
    /** Navigate to the CMS list page. */
    goToList: () => void;
    /** Navigate to a CMS edit page for the given UID. */
    goToEdit: (uid: string) => void;
    /** Navigate to the CMS create page. */
    goToCreate: () => void;
}
/** WYSIWYG editor choices for the CMS body editor. */
export type CmsEditorPreference = "ckeditor" | "tinymce";
export interface CmsAdminUiConfig {
    /** CMS API implementation (defaults to CmsClient with default URLs). */
    api?: CmsApi;
    /** Reserved slugs list for validation. */
    reservedSlugs?: string[];
    /** Locale options for the locale selector. */
    localeOptions?: Array<{
        value: string;
        label: string;
    }>;
    /** Post type options for the post type selector. Falls back to built-in list. */
    postTypeOptions?: Array<{
        value: string;
        label: string;
    }>;
    /** Toast adapter for showing notifications (defaults to console). */
    toast?: CmsToastAdapter;
    /** Navigation adapter. */
    navigation?: CmsNavigationAdapter;
    /**
     * Render a media picker dialog. If not provided, media picker buttons
     * are disabled in the editor.
     */
    renderMediaPicker?: (props: CmsMediaPickerProps) => React.ReactNode;
    /**
     * Get a content URL for a file UID (for image previews).
     * If not provided, raw UIDs are used as src.
     */
    getContentUrl?: (fileUid: string, variant?: string) => string;
    /**
     * Preferred WYSIWYG editor for HTML content.
     * Defaults to "ckeditor".
     */
    editorPreference?: CmsEditorPreference;
}
export declare const defaultToast: CmsToastAdapter;
//# sourceMappingURL=CmsAdminUiConfig.d.ts.map