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
import React from "react";
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
declare const PasteButton: React.FC<PasteButtonProps>;
export default PasteButton;
//# sourceMappingURL=PasteButton.d.ts.map