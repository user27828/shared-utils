import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * FmVideoViewer — Full-width video viewing dialog with fullscreen support.
 *
 * Used by FmMediaLibrary to expand video previews from grid and detail views
 * into a larger, more immersive player.
 *
 * @module @user27828/shared-utils/fm/client
 */
import { useCallback, useRef } from "react";
import { Box, Dialog, DialogContent, IconButton, Stack, Tooltip, Typography, } from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import CloseIcon from "@mui/icons-material/Close";
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
export const FmVideoViewer = ({ open, onClose, src, mimeType, title, }) => {
    const videoRef = useRef(null);
    const handleFullscreen = useCallback(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        try {
            if (el.requestFullscreen) {
                void el.requestFullscreen();
            }
            else if (el.webkitRequestFullscreen) {
                void el.webkitRequestFullscreen();
            }
            else if (el.webkitEnterFullscreen) {
                // iOS Safari
                void el.webkitEnterFullscreen();
            }
        }
        catch {
            // Fullscreen not supported — ignore silently
        }
    }, []);
    const handleClose = useCallback(() => {
        const el = videoRef.current;
        if (el) {
            el.pause();
        }
        onClose();
    }, [onClose]);
    return (_jsxs(Dialog, { open: open, onClose: handleClose, fullWidth: true, maxWidth: "lg", PaperProps: { sx: { bgcolor: "background.default" } }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { px: 2, py: 1 }, children: [_jsx(Typography, { fontWeight: 700, noWrap: true, sx: { flex: 1, minWidth: 0 }, children: title || "Video" }), _jsx(Tooltip, { title: "Fullscreen", children: _jsx(IconButton, { size: "small", onClick: handleFullscreen, children: _jsx(FullscreenIcon, {}) }) }), _jsx(Tooltip, { title: "Close", children: _jsx(IconButton, { size: "small", edge: "end", onClick: handleClose, children: _jsx(CloseIcon, {}) }) })] }), _jsx(DialogContent, { sx: { p: 0, lineHeight: 0 }, children: _jsxs(Box, { component: "video", ref: videoRef, controls: true, autoPlay: true, preload: "metadata", sx: { width: "100%", display: "block" }, children: [_jsx("source", { src: src, type: mimeType }), "Your browser cannot play this video."] }) })] }));
};
export default FmVideoViewer;
