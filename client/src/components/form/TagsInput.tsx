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
import React, { useCallback, useState } from "react";
import { Chip, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

/** Props for the {@link TagsInput} component. */
export interface TagsInputProps {
  /** Current tag values. */
  value: string[];
  /** Called with the updated tag array on add or remove. */
  onChange: (tags: string[]) => void;
  /** Label for the text input. Defaults to "Add tag". */
  label?: string;
  /** Placeholder for the text input. */
  placeholder?: string;
  /** Maximum number of tags allowed. Defaults to 50. */
  maxTags?: number;
  /** Maximum character length per tag. Defaults to 128. */
  maxLength?: number;
  /** MUI size for TextField and Chips. Defaults to "small". */
  size?: "small" | "medium";
  /** If true, disables all interactions. */
  disabled?: boolean;
  /**
   * If true, normalize tags to lowercase before adding.
   * Defaults to false.
   */
  lowercase?: boolean;
}

/**
 * Chip-based tag input with add (Enter / button) and delete support.
 *
 * - Trims whitespace and rejects empty/blank tags
 * - Deduplicates (case-insensitive when `lowercase` is true)
 * - Configurable max tags and max tag length
 * - Fully controlled via `value` + `onChange`
 */
export const TagsInput: React.FC<TagsInputProps> = ({
  value,
  onChange,
  label = "Add tag",
  placeholder,
  maxTags = 50,
  maxLength = 128,
  size = "small",
  disabled = false,
  lowercase = false,
}) => {
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
    const exists = value.some(
      (t) => t.toLowerCase() === truncated.toLowerCase(),
    );
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

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag],
  );

  return (
    <Stack spacing={1}>
      {value.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {value.map((tag, idx) => (
            <Chip
              key={`${tag}-${idx}`}
              label={tag}
              size={size}
              onDelete={disabled ? undefined : () => removeTag(idx)}
              disabled={disabled}
              sx={{ mb: 0.5 }}
            />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          label={label}
          placeholder={placeholder}
          size={size}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || value.length >= maxTags}
          sx={{ flex: 1 }}
        />
        <Tooltip title="Add tag">
          <span>
            <IconButton
              size={size}
              color="primary"
              onClick={addTag}
              disabled={disabled || !input.trim() || value.length >= maxTags}
              aria-label="Add tag"
            >
              <AddIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

export default TagsInput;
