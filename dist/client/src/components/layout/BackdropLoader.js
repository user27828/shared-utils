import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Backdrop, CircularProgress, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
const mergeSx = (base, extra) => {
    if (!extra) {
        return base;
    }
    const baseArr = (Array.isArray(base) ? base : [base]);
    const extraArr = (Array.isArray(extra) ? extra : [extra]);
    return [...baseArr, ...extraArr];
};
/**
 * Backdrop loader component that can be used globally or within specific containers.
 */
const BackdropLoader = ({ open, message = "", localized = false, containerSx, size, }) => {
    const theme = useTheme();
    const mode = theme.palette.mode;
    const spinnerSize = size ?? (localized ? 24 : 60);
    if (localized) {
        if (!open) {
            return null;
        }
        const baseLocalizedSx = {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: mode === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
            zIndex: 1,
            borderRadius: 1,
            flexDirection: "column",
            gap: 1,
        };
        const localizedSx = mergeSx(baseLocalizedSx, containerSx);
        return (_jsxs(Box, { sx: localizedSx, children: [_jsx(CircularProgress, { color: "primary", size: spinnerSize }), message && (_jsx(Typography, { variant: "caption", color: "text.secondary", children: message }))] }));
    }
    return (_jsxs(Backdrop, { sx: {
            color: "primary.contrastText",
            zIndex: (t) => t.zIndex.drawer + 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
        }, open: open, children: [_jsx(CircularProgress, { color: "primary", size: spinnerSize }), message && (_jsx(Typography, { variant: "h6", color: "text.primary", children: message }))] }));
};
export default BackdropLoader;
