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
import React from "react";
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
declare const CopyButton: React.FC<CopyButtonProps>;
export default CopyButton;
//# sourceMappingURL=CopyButton.d.ts.map