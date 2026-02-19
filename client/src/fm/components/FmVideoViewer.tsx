/**
 * FmVideoViewer — Full-width video viewing dialog with fullscreen support.
 *
 * Used by FmMediaLibrary to expand video previews from grid and detail views
 * into a larger, more immersive player.
 *
 * @module @user27828/shared-utils/fm/client
 */
import React, { useCallback, useRef } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import CloseIcon from "@mui/icons-material/Close";

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
export const FmVideoViewer: React.FC<FmVideoViewerProps> = ({
  open,
  onClose,
  src,
  mimeType,
  title,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFullscreen = useCallback(() => {
    const el = videoRef.current;
    if (!el) {
      return;
    }
    try {
      if (el.requestFullscreen) {
        void el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        void (el as any).webkitRequestFullscreen();
      } else if ((el as any).webkitEnterFullscreen) {
        // iOS Safari
        void (el as any).webkitEnterFullscreen();
      }
    } catch {
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { bgcolor: "background.default" } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1 }}
      >
        <Typography fontWeight={700} noWrap sx={{ flex: 1, minWidth: 0 }}>
          {title || "Video"}
        </Typography>
        <Tooltip title="Fullscreen">
          <IconButton size="small" onClick={handleFullscreen}>
            <FullscreenIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close">
          <IconButton size="small" edge="end" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <DialogContent sx={{ p: 0, lineHeight: 0 }}>
        <Box
          component="video"
          ref={videoRef}
          controls
          autoPlay
          preload="metadata"
          sx={{ width: "100%", display: "block" }}
        >
          <source src={src} type={mimeType} />
          Your browser cannot play this video.
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FmVideoViewer;
