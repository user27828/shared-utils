import React from "react";
import type { SxProps, Theme } from "@mui/material/styles";
export interface BackdropLoaderProps {
    open: boolean;
    message?: string;
    /** If true, the loader will be positioned absolutely within its container instead of fixed to the viewport */
    localized?: boolean;
    /** Custom container style overrides when using localized mode */
    containerSx?: SxProps<Theme>;
    /** Custom spinner size (defaults to 60 for global, 24 for localized) */
    size?: number;
}
/**
 * Backdrop loader component that can be used globally or within specific containers.
 */
declare const BackdropLoader: React.FC<BackdropLoaderProps>;
export default BackdropLoader;
//# sourceMappingURL=BackdropLoader.d.ts.map