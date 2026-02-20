import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography, Card, CardContent, Button } from "@mui/material";
import { WifiOff as WifiOffIcon } from "@mui/icons-material";
const mergeSx = (base, extra) => {
    if (!extra) {
        return base;
    }
    const baseArr = (Array.isArray(base) ? base : [base]);
    const extraArr = (Array.isArray(extra) ? extra : [extra]);
    return [...baseArr, ...extraArr];
};
const Disconnected = ({ message = "Please check your network connection and try again.", onRetry, sx, }) => {
    const baseRootSx = {
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };
    const rootSx = mergeSx(baseRootSx, sx);
    return (_jsx(Box, { sx: rootSx, children: _jsx(Card, { sx: { display: "flex", maxWidth: 400 }, children: _jsxs(CardContent, { sx: {
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    p: 4,
                }, children: [_jsx(WifiOffIcon, { sx: { fontSize: 64, color: "text.secondary", mb: 2 } }), _jsx(Typography, { variant: "h6", gutterBottom: true, sx: { fontWeight: "medium" }, children: "Connection Lost" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: message }), onRetry && (_jsx(Button, { variant: "contained", onClick: onRetry, sx: { mt: 1 }, children: "Try Again" }))] }) }) }));
};
export default Disconnected;
