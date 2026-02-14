/**
 * @file CopyButton - Reusable copy-to-clipboard IconButton with visual feedback
 *
 * Displays a copy icon that, when clicked, copies the given value to the
 * clipboard and temporarily shows a green success indicator (icon swap +
 * color change + tooltip change). Optionally shows a MUI Snackbar as well.
 *
 * @example
 * // Minimal
 * <CopyButton value={someText} />
 *
 * // With custom tooltips
 * <CopyButton value={uid} tooltip="Copy UID" copiedTooltip="UID copied!" />
 *
 * // With snackbar
 * <CopyButton value={email} snackbar snackbarMessage="Email copied!" />
 *
 * // With external callback (e.g. notistack)
 * <CopyButton value={id} onCopy={() => enqueueSnackbar("Copied!")} />
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { SxProps, Theme } from "@mui/material/styles";

export interface CopyButtonProps {
  /** The value to copy to clipboard */
  value: string;
  /** Tooltip text shown on hover (default: "Copy") */
  tooltip?: string;
  /** Tooltip text shown after successful copy (default: "Copied!") */
  copiedTooltip?: string;
  /** Duration in ms to show success state (default: 2000) */
  successDuration?: number;
  /** MUI IconButton size (default: "small") */
  size?: "small" | "medium" | "large";
  /** Additional sx props for the IconButton */
  sx?: SxProps<Theme>;
  /** MUI icon fontSize for the inner icon (default: inherits from size) */
  iconFontSize?: "small" | "medium" | "large" | "inherit";
  /** Callback fired after a successful copy */
  onCopy?: () => void;
  /** Callback fired on copy failure */
  onError?: (error: unknown) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** aria-label for accessibility (default: tooltip value) */
  ariaLabel?: string;
  /** Show a built-in MUI Snackbar notification on copy (default: false) */
  snackbar?: boolean;
  /** Message shown in the built-in Snackbar (default: "Copied to clipboard") */
  snackbarMessage?: string;
  /** Auto-hide duration for the Snackbar in ms (default: 2000) */
  snackbarDuration?: number;
  /** IconButton color when idle (default: "default") */
  color?: "default" | "inherit" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
}

const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  tooltip = "Copy",
  copiedTooltip = "Copied!",
  successDuration = 2000,
  size = "small",
  sx,
  iconFontSize,
  onCopy,
  onError,
  disabled = false,
  ariaLabel,
  snackbar = false,
  snackbarMessage = "Copied to clipboard",
  snackbarDuration = 2000,
  color = "default",
}) => {
  const [copied, setCopied] = useState(false);
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

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for older browsers / insecure contexts
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
        } finally {
          document.body.removeChild(textarea);
        }
      }

      setCopied(true);
      if (snackbar) {
        setSnackbarOpen(true);
      }
      onCopy?.();

      // Clear any existing timer before setting a new one
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, successDuration);
    } catch (err) {
      onError?.(err);
    }
  }, [value, successDuration, snackbar, onCopy, onError]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  const iconProps = iconFontSize ? { fontSize: iconFontSize as any } : {};

  return (
    <>
      <Tooltip title={copied ? copiedTooltip : tooltip}>
        <span>
          <IconButton
            onClick={handleCopy}
            size={size}
            disabled={disabled}
            color={copied ? "success" : color}
            aria-label={ariaLabel || tooltip}
            sx={sx}
          >
            {copied ? (
              <CheckCircleIcon {...iconProps} />
            ) : (
              <ContentCopyIcon {...iconProps} />
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

export default CopyButton;
