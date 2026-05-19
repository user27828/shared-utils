import React from "react";
import type { SxProps, Theme } from "@mui/material/styles";
export interface TimezoneSelectProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    id?: string;
    name?: string;
    required?: boolean;
    disabled?: boolean;
    error?: boolean;
    helperText?: React.ReactNode;
    sx?: SxProps<Theme>;
    fullWidth?: boolean;
    size?: "small" | "medium";
    variant?: "standard" | "outlined" | "filled";
    placeholder?: string;
    topTimezones?: string[];
    disableClearable?: boolean;
}
declare const TimezoneSelect: React.FC<TimezoneSelectProps>;
export default TimezoneSelect;
//# sourceMappingURL=TimezoneSelect.d.ts.map