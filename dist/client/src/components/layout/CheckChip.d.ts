/**
 * CheckChip component - checkbox semantics rendered with a Chip visual shell.
 */
import React from "react";
import type { ChipProps } from "@mui/material/Chip";
export type CheckChipInputProps = Omit<React.ComponentPropsWithoutRef<"input">, "type" | "checked" | "defaultChecked" | "disabled" | "onChange">;
export interface CheckChipProps extends Omit<ChipProps, "label" | "icon" | "onClick" | "onDelete" | "onChange" | "clickable" | "component"> {
    label: React.ReactNode;
    checked?: boolean;
    defaultChecked?: boolean;
    indeterminate?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    inputProps?: CheckChipInputProps;
    icon?: React.ReactElement;
    checkedIcon?: React.ReactElement;
    indeterminateIcon?: React.ReactElement;
}
export declare const CheckChip: React.ForwardRefExoticComponent<Omit<CheckChipProps, "ref"> & React.RefAttributes<HTMLInputElement>>;
export default CheckChip;
//# sourceMappingURL=CheckChip.d.ts.map