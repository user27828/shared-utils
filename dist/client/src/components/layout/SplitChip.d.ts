/**
 * SplitChip component.
 * Displays multiple chip sections side by side with dividers in a unified chip appearance.
 */
import React from "react";
import { type ChipProps, type DividerProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
export interface SplitChipItem extends Omit<ChipProps, "variant"> {
    label: React.ReactNode;
    dividerColor?: string;
    customDivider?: React.ReactNode;
}
export interface SplitChipProps {
    items: SplitChipItem[];
    variant?: "filled" | "outlined";
    size?: "small" | "medium";
    dividerColor?: string;
    dividerProps?: Omit<DividerProps, "orientation" | "flexItem">;
    sx?: SxProps<Theme>;
}
declare const SplitChip: React.FC<SplitChipProps>;
export default SplitChip;
//# sourceMappingURL=SplitChip.d.ts.map