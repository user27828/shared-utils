import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Chip, CircularProgress, LinearProgress, Box, Divider, } from "@mui/material";
const mergeSx = (base, extra) => {
    if (!extra) {
        return base;
    }
    const baseArr = (Array.isArray(base) ? base : [base]);
    const extraArr = (Array.isArray(extra) ? extra : [extra]);
    return [...baseArr, ...extraArr];
};
const ProcessStatusChip = ({ status, label, color = "default", finalStatuses, percentage, showPercentage = false, linearPercentagePlacement = "left", placement = "bottom", progressProps = {}, size = "medium", sx, ...chipProps }) => {
    const isFinalStatus = finalStatuses &&
        finalStatuses.length > 0 &&
        finalStatuses.map((s) => s.toLowerCase()).includes(status.toLowerCase());
    const isDeterminate = typeof percentage === "number" && percentage >= 0 && percentage <= 100;
    const progressValue = isDeterminate ? percentage : undefined;
    const isLinearProgress = placement === "top" || placement === "bottom";
    const isCircularProgress = placement === "left" || placement === "right";
    const shouldShowPercentage = showPercentage && size !== "small";
    const chipLabel = shouldShowPercentage && percentage !== null && percentage !== undefined ? (_jsxs(Box, { sx: {
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            flexDirection: "row",
        }, children: [linearPercentagePlacement === "left" && (_jsxs(_Fragment, { children: [_jsxs(Box, { component: "span", sx: {
                            fontSize: "0.85em",
                            fontStyle: "italic",
                            opacity: 0.8,
                        }, children: [Math.round(percentage), "%"] }), _jsx(Divider, { orientation: "vertical", flexItem: true, sx: { my: 0.25 } })] })), _jsx("span", { children: label }), linearPercentagePlacement === "right" && (_jsxs(_Fragment, { children: [_jsx(Divider, { orientation: "vertical", flexItem: true, sx: { my: 0.25 } }), _jsxs(Box, { component: "span", sx: {
                            fontSize: "0.85em",
                            fontStyle: "italic",
                            opacity: 0.8,
                        }, children: [Math.round(percentage), "%"] })] }))] })) : (label);
    const renderCircularProgress = () => {
        if (isFinalStatus || !isCircularProgress) {
            return null;
        }
        const circularSize = size === "small" ? 14 : 18;
        return (_jsx(CircularProgress, { size: circularSize, variant: isDeterminate ? "determinate" : "indeterminate", value: progressValue, ...progressProps, sx: progressProps.sx }));
    };
    const renderLinearProgress = () => {
        if (isFinalStatus) {
            return null;
        }
        const linearProgressSx = {
            height: "1px",
            backgroundColor: "transparent",
            "& .MuiLinearProgress-bar": {
                height: "1px !important",
            },
            "& .MuiLinearProgress-bar1Indeterminate": {
                height: "1px !important",
            },
            "& .MuiLinearProgress-bar2Indeterminate": {
                height: "1px !important",
            },
        };
        const extraSx = progressProps.sx;
        const mergedLinearSx = mergeSx(linearProgressSx, extraSx);
        return (_jsx(Box, { component: "span", sx: {
                position: "absolute",
                left: "8px",
                right: "8px",
                height: "2px",
                ...(placement === "top" ? { top: 0 } : { bottom: 0 }),
                pointerEvents: "none",
                zIndex: 2,
            }, children: _jsx(LinearProgress, { variant: isDeterminate ? "determinate" : "indeterminate", value: progressValue, ...progressProps, sx: mergedLinearSx }) }));
    };
    return (_jsxs(Box, { sx: {
            position: "relative",
            display: "inline-block",
            overflow: "hidden",
        }, children: [_jsx(Chip, { label: chipLabel, color: color, size: size, sx: mergeSx({
                    position: "relative",
                    overflow: "hidden",
                    ...(color === "default" && {
                        backgroundColor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                    }),
                }, sx), icon: placement === "left" ? renderCircularProgress() || undefined : undefined, deleteIcon: placement === "right"
                    ? renderCircularProgress() || undefined
                    : undefined, onDelete: placement === "right" && !isFinalStatus && isCircularProgress
                    ? () => { }
                    : undefined, ...chipProps }), !isFinalStatus && isLinearProgress && renderLinearProgress()] }));
};
export default ProcessStatusChip;
