import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CheckChip component - checkbox semantics rendered with a Chip visual shell.
 */
import React from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import IndeterminateCheckBoxIcon from "@mui/icons-material/IndeterminateCheckBox";
const mergeSx = (base, extra) => {
    if (!extra) {
        return base;
    }
    const baseArr = (Array.isArray(base) ? base : [base]);
    const extraArr = (Array.isArray(extra) ? extra : [extra]);
    return [...baseArr, ...extraArr];
};
export const CheckChip = React.forwardRef(({ label, checked, defaultChecked = false, indeterminate = false, onChange, inputProps, icon, checkedIcon, indeterminateIcon, disabled = false, size = "medium", color, sx, ...chipProps }, ref) => {
    const inputRef = React.useRef(null);
    const isControlled = checked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const [isFocused, setIsFocused] = React.useState(false);
    const resolvedChecked = isControlled ? checked : uncontrolledChecked;
    const { onBlur: inputOnBlur, onFocus: inputOnFocus, className: inputClassName, style: inputStyle, ...restInputProps } = inputProps ?? {};
    React.useImperativeHandle(ref, () => inputRef.current);
    React.useEffect(() => {
        if (!inputRef.current) {
            return;
        }
        inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);
    const handleChange = React.useCallback((event) => {
        if (!isControlled) {
            setUncontrolledChecked(event.target.checked);
        }
        onChange?.(event, event.target.checked);
    }, [isControlled, onChange]);
    const handleFocus = React.useCallback((event) => {
        setIsFocused(true);
        inputOnFocus?.(event);
    }, [inputOnFocus]);
    const handleBlur = React.useCallback((event) => {
        setIsFocused(false);
        inputOnBlur?.(event);
    }, [inputOnBlur]);
    const iconFontSize = size === "small" ? "small" : "medium";
    const checkboxIcon = indeterminate
        ? indeterminateIcon || (_jsx(IndeterminateCheckBoxIcon, { fontSize: iconFontSize }))
        : resolvedChecked
            ? checkedIcon || _jsx(CheckBoxIcon, { fontSize: iconFontSize })
            : icon || _jsx(CheckBoxOutlineBlankIcon, { fontSize: iconFontSize });
    const baseChipSx = ((theme) => ({
        cursor: disabled ? "not-allowed" : "pointer",
        transition: theme.transitions.create(["background-color", "border-color"], {
            duration: theme.transitions.duration.shorter,
        }),
        ...(color === "default" || !color
            ? {
                backgroundColor: resolvedChecked
                    ? theme.palette.action.selected
                    : theme.palette.background.paper,
                border: "1px solid",
                borderColor: resolvedChecked
                    ? theme.palette.action.selected
                    : theme.palette.divider,
            }
            : {}),
        ...(isFocused
            ? {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
            }
            : {}),
    }));
    const mergedChipSx = mergeSx(baseChipSx, sx);
    return (_jsxs(Box, { component: "label", sx: {
            display: "inline-flex",
            position: "relative",
            alignItems: "center",
            cursor: disabled ? "not-allowed" : "pointer",
        }, children: [_jsx("input", { ...restInputProps, ref: inputRef, type: "checkbox", checked: resolvedChecked, disabled: disabled, onChange: handleChange, onFocus: handleFocus, onBlur: handleBlur, className: inputClassName, style: {
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    margin: 0,
                    opacity: 0,
                    cursor: disabled ? "not-allowed" : "pointer",
                    zIndex: 1,
                    ...inputStyle,
                } }), _jsx(Chip, { ...chipProps, label: label, icon: checkboxIcon, disabled: disabled, size: size, color: color, tabIndex: -1, sx: mergedChipSx })] }));
});
CheckChip.displayName = "CheckChip";
export default CheckChip;
