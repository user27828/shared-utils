import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CmsContentNotes — Persistent content notes (not tied to revisions).
 *
 * Displays existing notes in ascending chronological order (limit 3)
 * with a "View all" link for the full list in a dialog. An auto-growing
 * textarea with a save button adds new notes.
 *
 * Similar pattern to TagsInput for add/display UX.
 *
 * @module @user27828/shared-utils/client
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Link, Stack, TextField, Tooltip, Typography, } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
// ─── Constants ────────────────────────────────────────────────────────────
/** Maximum notes shown inline before "View all" link. */
const INLINE_LIMIT = 3;
// ─── Helpers ──────────────────────────────────────────────────────────────
const formatNoteDate = (iso) => {
    try {
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(iso));
    }
    catch {
        return iso;
    }
};
const NoteItem = ({ note, index, onRemove, compact = false, }) => (_jsx(Box, { sx: {
        py: compact ? 0.5 : 0.75,
        px: 1,
        borderRadius: 1,
        bgcolor: "action.hover",
        "&:hover .note-delete": { opacity: 1 },
    }, children: _jsxs(Stack, { direction: "row", alignItems: "flex-start", spacing: 0.5, children: [_jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [_jsx(Typography, { variant: "body2", sx: {
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: compact ? "0.8rem" : "0.85rem",
                        }, children: note.note }), _jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "baseline", children: [_jsx(Typography, { variant: "caption", color: "text.disabled", sx: { fontSize: "0.7rem" }, children: formatNoteDate(note.dt_updated) }), note.user_email && (_jsxs(Typography, { variant: "caption", color: "text.disabled", sx: { fontSize: "0.7rem" }, noWrap: true, children: ["\u2014 ", note.user_email] }))] })] }), onRemove && (_jsx(Tooltip, { title: "Remove note", children: _jsx(IconButton, { className: "note-delete", size: "small", onClick: () => onRemove(index), sx: {
                        opacity: 0,
                        transition: "opacity 150ms",
                        mt: -0.5,
                    }, children: _jsx(DeleteOutlineIcon, { sx: { fontSize: "0.9rem" } }) }) }))] }) }));
// ─── Component ────────────────────────────────────────────────────────────
const CmsContentNotes = ({ notes, onAddNote, onRemoveNote, disabled = false, }) => {
    const [input, setInput] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const inputRef = useRef(null);
    /** Notes sorted ascending by date (oldest first). */
    const sorted = useMemo(() => [...notes].sort((a, b) => new Date(a.dt_updated).getTime() - new Date(b.dt_updated).getTime()), [notes]);
    /** Last N notes for inline display. */
    const inlineNotes = useMemo(() => sorted.slice(-INLINE_LIMIT), [sorted]);
    const hasMore = sorted.length > INLINE_LIMIT;
    const handleAdd = useCallback(() => {
        const trimmed = input.trim();
        if (!trimmed) {
            return;
        }
        onAddNote(trimmed);
        setInput("");
        // Re-focus the input for rapid entry
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [input, onAddNote]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleAdd();
        }
    }, [handleAdd]);
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", sx: { mb: 0.75 }, children: "Notes" }), inlineNotes.length > 0 && (_jsx(Stack, { spacing: 0.5, sx: { mb: 1 }, children: inlineNotes.map((note, idx) => {
                    // Compute real index in the full sorted array
                    const realIdx = sorted.length - INLINE_LIMIT + idx;
                    const actualIdx = realIdx < 0 ? idx : realIdx;
                    return (_jsx(NoteItem, { note: note, index: actualIdx, onRemove: onRemoveNote, compact: true }, `${note.dt_updated}-${idx}`));
                }) })), hasMore && (_jsxs(Link, { component: "button", variant: "caption", onClick: () => setDialogOpen(true), sx: { mb: 1, display: "block" }, children: ["View all ", sorted.length, " notes..."] })), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "flex-start", children: [_jsx(TextField, { inputRef: inputRef, placeholder: "Add a note...", value: input, onChange: (e) => setInput(e.target.value), onKeyDown: handleKeyDown, size: "small", fullWidth: true, multiline: true, minRows: 1, maxRows: 4, disabled: disabled, inputProps: { maxLength: 4096 } }), _jsx(Tooltip, { title: "Save note (Ctrl+Enter)", children: _jsx("span", { children: _jsx(IconButton, { color: "primary", onClick: handleAdd, disabled: disabled || !input.trim(), "aria-label": "Save note", sx: { mt: 0.25 }, children: _jsx(SaveIcon, {}) }) }) })] }), _jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [_jsxs(DialogTitle, { children: ["All Notes (", sorted.length, ")"] }), _jsx(DialogContent, { dividers: true, children: _jsxs(Stack, { spacing: 1, children: [sorted.map((note, idx) => (_jsxs(React.Fragment, { children: [_jsx(NoteItem, { note: note, index: idx, onRemove: onRemoveNote }), idx < sorted.length - 1 && _jsx(Divider, {})] }, `${note.dt_updated}-${idx}`))), sorted.length === 0 && (_jsx(Typography, { color: "text.secondary", variant: "body2", children: "No notes yet." }))] }) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setDialogOpen(false), children: "Close" }) })] })] }));
};
export default CmsContentNotes;
