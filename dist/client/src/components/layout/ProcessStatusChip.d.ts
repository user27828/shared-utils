/**
 * Specialized chip component to display determinate or indeterminate process status
 * with optional progress indicators (linear or circular) and percentage display.
 */
import React from "react";
import { type ChipProps, type LinearProgressProps, type CircularProgressProps } from "@mui/material";
export interface ProcessStatusChipProps extends Omit<ChipProps, "label"> {
    /** Raw status value (not transformed) */
    status: string;
    /** Pre-computed display label (via getStatusTextOverride) */
    label: string;
    /** Pre-computed chip color (via getStatusMuiColor) */
    color?: ChipProps["color"];
    /** Array of final statuses where no progress indicator is shown */
    finalStatuses: string[];
    /** Progress percentage (0-100 = determinate, null/undefined = indeterminate) */
    percentage?: number | null;
    /** Show percentage text with divider */
    showPercentage?: boolean;
    /** Placement of percentage text (only for linear progress) */
    linearPercentagePlacement?: "left" | "right";
    /** Progress indicator placement */
    placement?: "top" | "bottom" | "left" | "right";
    /** Props forwarded to LinearProgress or CircularProgress */
    progressProps?: Partial<LinearProgressProps | CircularProgressProps>;
}
declare const ProcessStatusChip: React.FC<ProcessStatusChipProps>;
export default ProcessStatusChip;
//# sourceMappingURL=ProcessStatusChip.d.ts.map