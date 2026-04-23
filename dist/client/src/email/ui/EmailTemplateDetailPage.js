import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EmailPreviewTabs from "./EmailPreviewTabs.js";
const EmailTemplateDetailPage = ({ template, preview, selectedFixtureUid, isLoading = false, isSendingTest = false, error, onBack, onFixtureChange, onSendTestEmail, }) => {
    if (isLoading) {
        return (_jsx(Box, { sx: { py: 8, display: "flex", justifyContent: "center" }, children: _jsx(CircularProgress, {}) }));
    }
    if (error) {
        return (_jsx(Alert, { severity: "error", children: typeof error === "string" ? error : error.message }));
    }
    if (!template || !preview) {
        return _jsx(Alert, { severity: "info", children: "No email template selected." });
    }
    return (_jsxs(Stack, { spacing: 3, children: [_jsxs(Stack, { direction: "row", spacing: 2, justifyContent: "space-between", children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: template.name }), _jsx(Typography, { color: "text.secondary", children: template.uid })] }), _jsxs(Stack, { direction: "row", spacing: 1, children: [onBack ? (_jsx(Button, { variant: "outlined", onClick: onBack, children: "Back" })) : null, onSendTestEmail ? (_jsx(Button, { variant: "contained", onClick: onSendTestEmail, disabled: isSendingTest, children: isSendingTest ? "Queueing..." : "Send test email" })) : null] })] }), _jsx(Paper, { variant: "outlined", sx: { p: 2 }, children: _jsxs(Stack, { spacing: 2, children: [_jsxs(Stack, { direction: "row", spacing: 1, useFlexGap: true, flexWrap: "wrap", children: [_jsx(Chip, { label: template.category, size: "small" }), template.sendScenarios.map((scenario) => (_jsx(Chip, { label: scenario, size: "small", variant: "outlined" }, scenario)))] }), _jsx(Typography, { color: "text.secondary", children: template.description }), _jsx(TextField, { select: true, label: "Preview fixture", value: selectedFixtureUid ?? preview.fixtureUid ?? "", onChange: (event) => {
                                onFixtureChange(event.target.value || null);
                            }, sx: { maxWidth: 360 }, children: template.previewFixtures.map((fixture) => (_jsx(MenuItem, { value: fixture.uid, children: fixture.label }, fixture.uid))) })] }) }), _jsx(EmailPreviewTabs, { subject: preview.subject, html: preview.html, text: preview.text, warnings: preview.warnings })] }));
};
export default EmailTemplateDetailPage;
