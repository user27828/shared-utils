import { jsx as _jsx } from "react/jsx-runtime";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
const EmailHtmlPreviewFrame = ({ html, title = "Email HTML preview", minHeight = 520, }) => {
    return (_jsx(Paper, { variant: "outlined", sx: { overflow: "hidden" }, children: _jsx(Box, { component: "iframe", title: title, srcDoc: html, sandbox: "allow-popups allow-popups-to-escape-sandbox", referrerPolicy: "no-referrer", loading: "lazy", sx: {
                width: "100%",
                minHeight,
                border: 0,
                display: "block",
                backgroundColor: "common.white",
            } }) }));
};
export default EmailHtmlPreviewFrame;
