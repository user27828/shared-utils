import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CmsVersionNotesForm — Shared form for version label + notes.
 *
 * Reused by:
 *  - CmsEditPage "Save Version" split-button drawer
 *  - CmsHistoryDrawer per-revision edit dialog
 *
 * At least one of the two fields (version or notes) must be non-empty
 * before the save action is enabled.
 *
 * @module @user27828/shared-utils/client
 */
import { useCallback, useState, useEffect } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
// ─── Component ────────────────────────────────────────────────────────────
const CmsVersionNotesForm = ({ initialVersion = "", initialNotes = "", onSave, onCancel, isSaving = false, disabled = false, saveLabel = "Save", title, }) => {
    const [version, setVersion] = useState(initialVersion);
    const [notes, setNotes] = useState(initialNotes);
    // Sync with external initial values (e.g., when switching revisions)
    useEffect(() => {
        setVersion(initialVersion);
    }, [initialVersion]);
    useEffect(() => {
        setNotes(initialNotes);
    }, [initialNotes]);
    const hasContent = version.trim().length > 0 || notes.trim().length > 0;
    const handleSave = useCallback(() => {
        if (!hasContent) {
            return;
        }
        onSave({ version: version.trim(), notes: notes.trim() });
    }, [hasContent, onSave, version, notes]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && hasContent) {
            e.preventDefault();
            handleSave();
        }
    }, [handleSave, hasContent]);
    return (_jsxs(Box, { onKeyDown: handleKeyDown, children: [title && (_jsx(Typography, { variant: "subtitle2", sx: { mb: 1.5 }, children: title })), _jsxs(Stack, { spacing: 2, children: [_jsx(TextField, { label: "Version", placeholder: 'e.g. "Summer Sale", "Contact update"', value: version, onChange: (e) => setVersion(e.target.value), size: "small", fullWidth: true, disabled: disabled || isSaving, inputProps: { maxLength: 256 }, helperText: "A short human-readable label for this version" }), _jsx(TextField, { label: "Notes", placeholder: "Optional longer description or context...", value: notes, onChange: (e) => setNotes(e.target.value), size: "small", fullWidth: true, multiline: true, minRows: 2, maxRows: 6, disabled: disabled || isSaving, inputProps: { maxLength: 4096 } }), _jsxs(Stack, { direction: "row", spacing: 1, justifyContent: "flex-end", children: [onCancel && (_jsx(Button, { onClick: onCancel, disabled: isSaving, color: "inherit", size: "small", children: "Cancel" })), _jsx(Button, { variant: "contained", size: "small", startIcon: _jsx(SaveIcon, {}), onClick: handleSave, disabled: !hasContent || isSaving || disabled, children: isSaving ? "Saving..." : saveLabel })] })] })] }));
};
export default CmsVersionNotesForm;
