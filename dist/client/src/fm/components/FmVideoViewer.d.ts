/**
 * FmVideoViewer — Full-width video viewing dialog with fullscreen support.
 *
 * Used by FmMediaLibrary to expand video previews from grid and detail views
 * into a larger, more immersive player.
 *
 * @module @user27828/shared-utils/fm/client
 */
import React from "react";
/** Props for the {@link FmVideoViewer} component. */
export interface FmVideoViewerProps {
    /** Whether the viewer dialog is open. */
    open: boolean;
    /** Called when the viewer should close. */
    onClose: () => void;
    /** Video source URL. */
    src: string;
    /** MIME type of the video (e.g. "video/mp4"). */
    mimeType: string;
    /** Optional title displayed in the dialog header. */
    title?: string;
}
/**
 * Full-width video viewer dialog.
 *
 * Renders a `<video>` element at maximum horizontal width inside an MUI
 * Dialog. Provides:
 * - Native browser video controls (play, pause, seek, volume)
 * - Fullscreen button (using Fullscreen API with webkit fallback)
 * - Auto-pause on close
 *
 * The dialog content is unmounted when closed (MUI default), so no
 * video resources remain loaded while the viewer is hidden.
 */
export declare const FmVideoViewer: React.FC<FmVideoViewerProps>;
export default FmVideoViewer;
//# sourceMappingURL=FmVideoViewer.d.ts.map