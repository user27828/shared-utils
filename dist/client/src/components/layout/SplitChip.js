import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * SplitChip component.
 * Displays multiple chip sections side by side with dividers in a unified chip appearance.
 */
import React from "react";
import { Chip, Box, Divider, } from "@mui/material";
const mergeSx = (base, extra) => {
    if (!extra) {
        return base;
    }
    const baseArr = (Array.isArray(base) ? base : [base]);
    const extraArr = (Array.isArray(extra) ? extra : [extra]);
    return [...baseArr, ...extraArr];
};
const SplitChip = ({ items, variant = "filled", size = "medium", dividerColor: defaultDividerColor = "rgba(0, 0, 0, 0.12)", dividerProps, sx, }) => {
    if (!items || items.length === 0) {
        return null;
    }
    if (items.length === 1) {
        return _jsx(Chip, { ...items[0], variant: variant, size: size, sx: sx });
    }
    const baseContainerSx = {
        display: "inline-flex",
        alignItems: "center",
        overflow: "hidden",
    };
    const containerSx = mergeSx(baseContainerSx, sx);
    return (_jsx(Box, { sx: containerSx, children: items.map((item, index) => {
            const { label, sx: itemSx, dividerColor: itemDividerColor, customDivider, ...chipProps } = item;
            return (_jsxs(React.Fragment, { children: [_jsx(Chip, { ...chipProps, label: label, variant: variant, size: size, sx: mergeSx({
                            ...(index === 0 && {
                                borderTopRightRadius: 0,
                                borderBottomRightRadius: 0,
                            }),
                            ...(index === items.length - 1 && {
                                borderTopLeftRadius: 0,
                                borderBottomLeftRadius: 0,
                            }),
                            ...(index > 0 && index < items.length - 1 && {
                                borderRadius: 0,
                            }),
                            margin: 0,
                        }, itemSx) }), index < items.length - 1 && (_jsx(_Fragment, { children: customDivider ? (_jsx(Box, { sx: {
                                display: "flex",
                                alignItems: "center",
                                alignSelf: "stretch",
                            }, children: customDivider })) : (_jsx(Divider, { orientation: "vertical", flexItem: true, ...(() => {
                                if (!dividerProps) {
                                    return {};
                                }
                                const { sx: _sx, ...rest } = dividerProps;
                                return rest;
                            })(), sx: mergeSx({
                                my: 0.5,
                                mx: 0,
                                borderColor: itemDividerColor || defaultDividerColor,
                            }, dividerProps?.sx) })) }))] }, index));
        }) }));
};
export default SplitChip;
