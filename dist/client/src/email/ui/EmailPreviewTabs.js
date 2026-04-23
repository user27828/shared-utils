import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import EmailHtmlPreviewFrame from "./EmailHtmlPreviewFrame.js";
import EmailTextPreviewPanel from "./EmailTextPreviewPanel.js";
const TabPanel = ({ active, value, children }) => {
    if (active !== value) {
        return null;
    }
    return _jsx(Box, { sx: { pt: 2 }, children: children });
};
const EmailPreviewTabs = ({ subject, html, text, warnings, }) => {
    const [tab, setTab] = useState("html");
    const warningChips = useMemo(() => {
        const chips = [];
        if (warnings?.missingExplicitTextRenderer) {
            chips.push("Generated text fallback");
        }
        if (warnings?.usedGeneratedText) {
            chips.push("Auto-derived plain text");
        }
        return chips;
    }, [warnings]);
    return (_jsxs(Stack, { spacing: 2, children: [_jsx(Paper, { variant: "outlined", sx: { p: 2 }, children: _jsxs(Stack, { spacing: 1, children: [_jsx(Typography, { variant: "overline", color: "text.secondary", children: "Subject" }), _jsx(Typography, { variant: "h6", children: subject }), warningChips.length > 0 ? (_jsx(Stack, { direction: "row", spacing: 1, useFlexGap: true, flexWrap: "wrap", children: warningChips.map((warning) => (_jsx(Chip, { label: warning, size: "small" }, warning))) })) : null] }) }), _jsxs(Box, { children: [_jsxs(Tabs, { value: tab, onChange: (_event, value) => {
                            setTab(value);
                        }, children: [_jsx(Tab, { value: "html", label: "HTML Preview" }), _jsx(Tab, { value: "text", label: "Plain Text" }), _jsx(Tab, { value: "rawHtml", label: "Raw HTML" }), _jsx(Tab, { value: "rawText", label: "Raw Text" })] }), _jsx(TabPanel, { active: tab, value: "html", children: _jsx(EmailHtmlPreviewFrame, { html: html }) }), _jsx(TabPanel, { active: tab, value: "text", children: _jsx(EmailTextPreviewPanel, { text: text }) }), _jsx(TabPanel, { active: tab, value: "rawHtml", children: _jsx(EmailTextPreviewPanel, { text: html, minHeight: 520 }) }), _jsx(TabPanel, { active: tab, value: "rawText", children: _jsx(EmailTextPreviewPanel, { text: text, minHeight: 520 }) })] })] }));
};
export default EmailPreviewTabs;
