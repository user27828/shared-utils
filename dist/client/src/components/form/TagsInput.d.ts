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
import React from "react";
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
export declare const TagsInput: React.FC<TagsInputProps>;
export default TagsInput;
//# sourceMappingURL=TagsInput.d.ts.map