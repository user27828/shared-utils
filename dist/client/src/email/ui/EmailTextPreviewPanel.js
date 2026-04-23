import { jsx as _jsx } from "react/jsx-runtime";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
const EmailTextPreviewPanel = ({ text, minHeight = 320, }) => {
    return (_jsx(Paper, { variant: "outlined", children: _jsx(Box, { component: "pre", sx: {
                m: 0,
                p: 2,
                minHeight,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "Monaco, Menlo, Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.6,
            }, children: text }) }));
};
export default EmailTextPreviewPanel;
