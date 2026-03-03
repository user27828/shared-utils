import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
const CmsConflictDialog = ({ open, title = "Update conflict", description = "This content was updated elsewhere while you were editing. You can reload the latest version or overwrite it with your changes.", onCancel, onReload, onOverwrite, }) => {
    return (_jsxs(Dialog, { open: open, onClose: onCancel, fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: title }), _jsx(DialogContent, { dividers: true, children: _jsxs(Stack, { spacing: 2, children: [_jsx(Typography, { children: description }), _jsx(Divider, {}), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "Tip: If you overwrite, you may clobber someone else's recent edits." })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onCancel, children: "Keep editing" }), _jsx(Button, { variant: "outlined", onClick: onReload, children: "Reload latest" }), _jsx(Button, { color: "warning", variant: "contained", onClick: onOverwrite, children: "Overwrite with my changes" })] })] }));
};
export default CmsConflictDialog;
