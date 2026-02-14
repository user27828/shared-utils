/**
 * @file PasteButton - Reusable paste-from-clipboard IconButton with visual feedback
 *
 * Displays a paste icon that, when clicked, reads text from the clipboard
 * and passes it to the onPaste callback. Temporarily shows a green success
 * indicator (icon swap + color change + tooltip change).
 *
 * @example
 * // Minimal
 * <PasteButton onPaste={(text) => setValue(text)} />
 *
 * // With custom tooltips
 * <PasteButton
 *   onPaste={(text) => setField(text)}
 *   tooltip="Paste job description"
 *   pastedTooltip="Pasted!"
 * />
 *
 * // With snackbar
 * <PasteButton onPaste={handlePaste} snackbar snackbarMessage="Content pasted!" />
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { SxProps, Theme } from "@mui/material/styles";

export interface PasteButtonProps {
  /** Callback fired with the pasted text on success */
  onPaste: (text: string) => void;
  /** Tooltip text shown on hover (default: "Paste from clipboard") */
  tooltip?: string;
  /** Tooltip text shown after successful paste (default: "Pasted!") */
  pastedTooltip?: string;
  /** Duration in ms to show success state (default: 2000) */
  successDuration?: number;
  /** MUI IconButton size (default: "small") */
  size?: "small" | "medium" | "large";
  /** Additional sx props for the IconButton */
  sx?: SxProps<Theme>;
  /** MUI icon fontSize for the inner icon (default: inherits from size) */
  iconFontSize?: "small" | "medium" | "large" | "inherit";
  /** Callback fired on paste failure */
  onError?: (error: unknown) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** aria-label for accessibility (default: tooltip value) */
  ariaLabel?: string;
  /** Show a built-in MUI Snackbar notification on paste (default: false) */
  snackbar?: boolean;
  /** Message shown in the built-in Snackbar (default: "Pasted from clipboard") */
  snackbarMessage?: string;
  /** Auto-hide duration for the Snackbar in ms (default: 2000) */
  snackbarDuration?: number;
  /** IconButton color when idle (default: "default") */
  color?: "default" | "inherit" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
}

const PasteButton: React.FC<PasteButtonProps> = ({
  onPaste,
  tooltip = "Paste from clipboard",
  pastedTooltip = "Pasted!",
  successDuration = 2000,
  size = "small",
  sx,
  iconFontSize,
  onError,
  disabled = false,
  ariaLabel,
  snackbar = false,
  snackbarMessage = "Pasted from clipboard",
  snackbarDuration = 2000,
  color = "default",
}) => {
  const [pasted, setPasted] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onPaste(text);

      setPasted(true);
      if (snackbar) {
        setSnackbarOpen(true);
      }

      // Clear any existing timer before setting a new one
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setPasted(false);
        timerRef.current = null;
      }, successDuration);
    } catch (err) {
      onError?.(err);
    }
  }, [onPaste, successDuration, snackbar, onError]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  const iconProps = iconFontSize ? { fontSize: iconFontSize as any } : {};

  return (
    <>
      <Tooltip title={pasted ? pastedTooltip : tooltip}>
        <span>
          <IconButton
            onClick={handlePaste}
            size={size}
            disabled={disabled}
            color={pasted ? "success" : color}
            aria-label={ariaLabel || tooltip}
            sx={sx}
          >
            {pasted ? (
              <CheckCircleIcon {...iconProps} />
            ) : (
              <ContentPasteIcon {...iconProps} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      {snackbar && (
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={snackbarDuration}
          onClose={handleSnackbarClose}
          message={snackbarMessage}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />
      )}
    </>
  );
};

export default PasteButton;
