import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
const EmailTemplateListPage = ({ templates, isLoading = false, error, onOpenTemplate, }) => {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const filteredTemplates = useMemo(() => {
        return templates.filter((template) => {
            const matchesCategory = category === "all" || template.category === category;
            const matchesSearch = !search ||
                `${template.name} ${template.uid} ${template.description}`
                    .toLowerCase()
                    .includes(search.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [category, search, templates]);
    const categories = useMemo(() => {
        return Array.from(new Set(templates.map((template) => template.category)));
    }, [templates]);
    return (_jsxs(Stack, { spacing: 3, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h4", gutterBottom: true, children: "Email Templates" }), _jsx(Typography, { color: "text.secondary", children: "Browse registered templates, preview fixtures, and validate rendered HTML and plain text output." })] }), _jsxs(Stack, { direction: { xs: "column", md: "row" }, spacing: 2, children: [_jsx(TextField, { label: "Search", value: search, onChange: (event) => {
                            setSearch(event.target.value);
                        }, fullWidth: true }), _jsxs(TextField, { select: true, label: "Category", value: category, onChange: (event) => {
                            setCategory(event.target.value);
                        }, sx: { minWidth: 220 }, children: [_jsx(MenuItem, { value: "all", children: "All categories" }), categories.map((option) => (_jsx(MenuItem, { value: option, children: option }, option)))] })] }), error ? (_jsx(Alert, { severity: "error", children: typeof error === "string" ? error : error.message })) : null, isLoading ? (_jsx(Box, { sx: { py: 8, display: "flex", justifyContent: "center" }, children: _jsx(CircularProgress, {}) })) : null, !isLoading && filteredTemplates.length === 0 ? (_jsx(Alert, { severity: "info", children: "No email templates matched your filters." })) : null, _jsx(Stack, { spacing: 2, children: filteredTemplates.map((template) => (_jsx(Card, { variant: "outlined", children: _jsx(CardContent, { children: _jsxs(Stack, { spacing: 2, children: [_jsxs(Stack, { direction: { xs: "column", md: "row" }, spacing: 2, justifyContent: "space-between", children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", children: template.name }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: template.uid })] }), _jsxs(Stack, { direction: "row", spacing: 1, useFlexGap: true, flexWrap: "wrap", children: [_jsx(Chip, { label: template.category, size: "small" }), _jsx(Chip, { label: `${template.fixtureCount} fixture${template.fixtureCount === 1 ? "" : "s"}`, size: "small", variant: "outlined" })] })] }), _jsx(Typography, { color: "text.secondary", children: template.description }), _jsx(Stack, { direction: "row", spacing: 1, useFlexGap: true, flexWrap: "wrap", children: template.sendScenarios.map((scenario) => (_jsx(Chip, { label: scenario, size: "small", variant: "outlined" }, scenario))) }), _jsx(Box, { children: _jsx(Button, { variant: "contained", onClick: () => {
                                            onOpenTemplate(template);
                                        }, children: "Open preview" }) })] }) }) }, template.uid))) })] }));
};
export default EmailTemplateListPage;
