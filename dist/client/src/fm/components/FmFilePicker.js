import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import { FmMediaLibrary } from "./FmMediaLibrary.js";
/** Dialog wrapper around {@link FmMediaLibrary} for file selection. */
export const FmFilePicker = ({ open, onClose, onSelect, title = "Select file", api, }) => {
    return (_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "lg", PaperProps: { sx: { height: "min(85vh, 900px)" } }, children: [_jsx(DialogTitle, { children: _jsxs(Stack, { direction: "row", alignItems: "center", children: [_jsx(Typography, { fontWeight: 800, sx: { flex: 1 }, children: title }), _jsx(IconButton, { onClick: onClose, edge: "end", children: _jsx(CloseIcon, {}) })] }) }), _jsx(DialogContent, { dividers: true, sx: { overflow: "auto" }, children: _jsx(FmMediaLibrary, { onSelect: onSelect, api: api }) })] }));
};
export default FmFilePicker;
