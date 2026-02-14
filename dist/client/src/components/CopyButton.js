import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useState, useRef, useCallback, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
const CopyButton = ({ value, tooltip = "Copy", copiedTooltip = "Copied!", successDuration = 2000, size = "small", sx, iconFontSize, onCopy, onError, disabled = false, ariaLabel, snackbar = false, snackbarMessage = "Copied to clipboard", snackbarDuration = 2000, color = "default", }) => {
    const [copied, setCopied] = useState(false);
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
    const handleCopy = useCallback(async () => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            }
            else {
                // Fallback for older browsers / insecure contexts
                const textarea = document.createElement("textarea");
                textarea.value = value;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand("copy");
                }
                finally {
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
        }
        catch (err) {
            onError?.(err);
        }
    }, [value, successDuration, snackbar, onCopy, onError]);
    const handleSnackbarClose = useCallback(() => {
        setSnackbarOpen(false);
    }, []);
    const iconProps = iconFontSize ? { fontSize: iconFontSize } : {};
    return (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: copied ? copiedTooltip : tooltip, children: _jsx("span", { children: _jsx(IconButton, { onClick: handleCopy, size: size, disabled: disabled, color: copied ? "success" : color, "aria-label": ariaLabel || tooltip, sx: sx, children: copied ? (_jsx(CheckCircleIcon, { ...iconProps })) : (_jsx(ContentCopyIcon, { ...iconProps })) }) }) }), snackbar && (_jsx(Snackbar, { open: snackbarOpen, autoHideDuration: snackbarDuration, onClose: handleSnackbarClose, message: snackbarMessage, anchorOrigin: { vertical: "bottom", horizontal: "center" } }))] }));
};
export default CopyButton;
