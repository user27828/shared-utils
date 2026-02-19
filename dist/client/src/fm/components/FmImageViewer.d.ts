/**
 * FmImageViewer — Full-width image viewing dialog with variant size selection.
 *
 * Used by FmMediaLibrary to expand image previews from grid and detail views
 * into a larger viewer with a size picker. Lazily loads available variants
 * via the FmApi and displays a toggle group for switching between the original
 * image and generated size variants.
 *
 * @module @user27828/shared-utils/fm/client
 */
import React from "react";
import type { FmFileRow, FmFileVariantRow } from "../../../../utils/src/fm/types.js";
import type { FmApi } from "../FmApi.js";
/** Props for the {@link FmImageViewer} component. */
export interface FmImageViewerProps {
    /** Whether the viewer dialog is open. */
    open: boolean;
    /** Called when the viewer should close. */
    onClose: () => void;
    /** UID of the file to display. */
    fileUid: string;
    /** FmApi instance for content URLs and variant fetching. */
    api: FmApi;
    /** Optional title displayed in the dialog header. */
    title?: string;
    /**
     * Optional file row — required when `onSelect` is provided so the callback
     * can pass the full file row to the picker consumer.
     */
    file?: FmFileRow | null;
    /**
     * When provided, the viewer is in "picker" mode and shows a "Select" button.
     * Clicking it passes the file and (optionally) the selected variant.
     */
    onSelect?: (file: FmFileRow, variant?: FmFileVariantRow) => void;
}
/**
 * Full-width image viewer dialog with variant size selection.
 *
 * Renders the image at maximum horizontal width inside an MUI Dialog.
 * Provides:
 * - A toggle button group showing "Original" + all available variant sizes
 *   (displayed above the image)
 * - Lazy variant loading on first open (cached for lifetime of mount)
 * - Current selection visually indicated via the ToggleButtonGroup value
 * - An optional "Select" button when `onSelect` is provided (picker mode)
 *
 * The dialog content is unmounted when closed (MUI default), so no
 * resources remain loaded while the viewer is hidden.
 */
export declare const FmImageViewer: React.FC<FmImageViewerProps>;
export default FmImageViewer;
//# sourceMappingURL=FmImageViewer.d.ts.map