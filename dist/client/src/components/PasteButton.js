import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useState, useRef, useCallback, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
const PasteButton = ({ onPaste, tooltip = "Paste from clipboard", pastedTooltip = "Pasted!", successDuration = 2000, size = "small", sx, iconFontSize, onError, disabled = false, ariaLabel, snackbar = false, snackbarMessage = "Pasted from clipboard", snackbarDuration = 2000, color = "default", }) => {
    const [pasted, setPasted] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const timerRef = useRef(null);
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
        }
        catch (err) {
            onError?.(err);
        }
    }, [onPaste, successDuration, snackbar, onError]);
    const handleSnackbarClose = useCallback(() => {
        setSnackbarOpen(false);
    }, []);
    const iconProps = iconFontSize ? { fontSize: iconFontSize } : {};
    return (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: pasted ? pastedTooltip : tooltip, children: _jsx("span", { children: _jsx(IconButton, { onClick: handlePaste, size: size, disabled: disabled, color: pasted ? "success" : color, "aria-label": ariaLabel || tooltip, sx: sx, children: pasted ? (_jsx(CheckCircleIcon, { ...iconProps })) : (_jsx(ContentPasteIcon, { ...iconProps })) }) }) }), snackbar && (_jsx(Snackbar, { open: snackbarOpen, autoHideDuration: snackbarDuration, onClose: handleSnackbarClose, message: snackbarMessage, anchorOrigin: { vertical: "bottom", horizontal: "center" } }))] }));
};
export default PasteButton;
