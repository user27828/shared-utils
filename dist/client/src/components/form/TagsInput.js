import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TagsInput — Reusable chip-based tag input component.
 *
 * Renders existing tags as MUI Chips with delete buttons, plus a text field
 * with Enter-key and "+" button support for adding new tags. Handles
 * deduplication, trimming, and configurable limits.
 *
 * Used by FmMediaLibrary (file tags) and CmsEditPage (content tags).
 *
 * @module @user27828/shared-utils/client
 */
import { useCallback, useState } from "react";
import { Chip, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
/**
 * Chip-based tag input with add (Enter / button) and delete support.
 *
 * - Trims whitespace and rejects empty/blank tags
 * - Deduplicates (case-insensitive when `lowercase` is true)
 * - Configurable max tags and max tag length
 * - Fully controlled via `value` + `onChange`
 */
export const TagsInput = ({ value, onChange, label = "Add tag", placeholder, maxTags = 50, maxLength = 128, size = "small", disabled = false, lowercase = false, }) => {
    const [input, setInput] = useState("");
    const addTag = useCallback(() => {
        const raw = input.trim();
        if (!raw) {
            return;
        }
        const tag = lowercase ? raw.toLowerCase() : raw;
        const truncated = tag.slice(0, maxLength);
        if (!truncated) {
            return;
        }
        // Deduplicate: compare case-insensitively to prevent near-duplicates.
        const exists = value.some((t) => t.toLowerCase() === truncated.toLowerCase());
        if (exists) {
            setInput("");
            return;
        }
        if (value.length >= maxTags) {
            setInput("");
            return;
        }
        onChange([...value, truncated]);
        setInput("");
    }, [input, value, onChange, maxTags, maxLength, lowercase]);
    const removeTag = useCallback((index) => {
        onChange(value.filter((_, i) => i !== index));
    }, [value, onChange]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag();
        }
    }, [addTag]);
    return (_jsxs(Stack, { spacing: 1, children: [value.length > 0 && (_jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, children: value.map((tag, idx) => (_jsx(Chip, { label: tag, size: size, onDelete: disabled ? undefined : () => removeTag(idx), disabled: disabled, sx: { mb: 0.5 } }, `${tag}-${idx}`))) })), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(TextField, { label: label, placeholder: placeholder, size: size, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: handleKeyDown, disabled: disabled || value.length >= maxTags, sx: { flex: 1 } }), _jsx(Tooltip, { title: "Add tag", children: _jsx("span", { children: _jsx(IconButton, { size: size, color: "primary", onClick: addTag, disabled: disabled || !input.trim() || value.length >= maxTags, "aria-label": "Add tag", children: _jsx(AddIcon, {}) }) }) })] })] }));
};
export default TagsInput;
