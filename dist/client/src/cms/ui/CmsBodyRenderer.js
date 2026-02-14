import { jsx as _jsx } from "react/jsx-runtime";
import { Box, Typography } from "@mui/material";
/**
 * Pure function that returns a React node for the given CMS payload,
 * dispatching on `content_type`.
 */
export const renderCmsBody = (payload) => {
    const contentType = String(payload.content_type || "");
    if (contentType === "text/html") {
        const html = String(payload.sanitized_html || "");
        return _jsx(Box, { dangerouslySetInnerHTML: { __html: html } });
    }
    if (contentType === "text/markdown") {
        const html = String(payload.markdown_html || "");
        return _jsx(Box, { dangerouslySetInnerHTML: { __html: html } });
    }
    if (contentType === "application/json") {
        return (_jsx(Box, { component: "pre", sx: { overflowX: "auto", m: 0 }, children: JSON.stringify(payload.json, null, 2) }));
    }
    // Default: plain text
    const text = String(payload.text || "");
    return _jsx(Typography, { sx: { whiteSpace: "pre-wrap" }, children: text });
};
/**
 * React component wrapper around `renderCmsBody`.
 */
const CmsBodyRenderer = ({ payload, sx }) => {
    return _jsx(Box, { sx: sx, children: renderCmsBody(payload) });
};
export default CmsBodyRenderer;
