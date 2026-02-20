/**
 * "Disconnected" or network error state component.
 */
import React from "react";
import type { SxProps, Theme } from "@mui/material/styles";
export interface DisconnectedProps {
    message?: string;
    onRetry?: () => void;
    sx?: SxProps<Theme>;
}
declare const Disconnected: React.FC<DisconnectedProps>;
export default Disconnected;
//# sourceMappingURL=Disconnected.d.ts.map