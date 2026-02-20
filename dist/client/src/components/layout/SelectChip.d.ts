/**
 * SelectChip Component - Multi-select or single-select dropdown using Chip + Popper.
 */
import React from "react";
import type { SxProps, Theme } from "@mui/material/styles";
export interface SelectChipOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    endIcon?: React.ReactNode;
    tooltip?: React.ReactNode;
    rowSx?: SxProps<Theme>;
    color?: string;
    disabled?: boolean;
}
export interface SelectChipProps {
    selectedValues: string[];
    options: SelectChipOption[];
    onChange: (selectedValues: string[]) => void;
    /**
     * Single-select only: called when the user clicks the already-selected option.
     * Useful for "edit" flows where re-selecting the same value should open a dialog.
     */
    onOptionReselect?: (value: string) => void;
    isLoading?: boolean;
    emptyLabel?: string;
    getDisplayText?: (selectedValues: string[], options: SelectChipOption[]) => string;
    placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
    minMenuWidth?: number;
    disabled?: boolean;
    showApplyButton?: boolean;
    onMenuOpen?: () => void;
    onMenuClose?: () => void;
    error?: boolean;
    size?: "small" | "medium";
    color?: "default" | "primary" | "secondary" | "error" | "warning" | "info" | "success";
    sx?: SxProps<Theme>;
    /** Whether to allow multiple selections. Default true. Set false for single-select mode with radio buttons. */
    multiple?: boolean;
}
export declare const SelectChip: React.ForwardRefExoticComponent<SelectChipProps & React.RefAttributes<HTMLDivElement>>;
export default SelectChip;
//# sourceMappingURL=SelectChip.d.ts.map