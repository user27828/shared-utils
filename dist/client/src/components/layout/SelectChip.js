import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * SelectChip Component - Multi-select or single-select dropdown using Chip + Popper.
 */
import React, { useCallback, useRef } from "react";
import { Box, Button, Chip, Divider, Paper, Popper, FormControlLabel, Checkbox, Radio, RadioGroup, CircularProgress, Stack, Tooltip, } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
const mergeSx = (base, extra) => {
    if (!extra) {
        return base;
    }
    const baseArr = (Array.isArray(base) ? base : [base]);
    const extraArr = (Array.isArray(extra) ? extra : [extra]);
    return [...baseArr, ...extraArr];
};
export const SelectChip = React.forwardRef(({ selectedValues, options, onChange, onOptionReselect, isLoading = false, emptyLabel = "Select", getDisplayText, placement = "bottom-start", minMenuWidth = 250, disabled = false, showApplyButton = false, onMenuOpen, onMenuClose, error = false, size, color, sx, multiple = true, ...restProps }, ref) => {
    const chipRef = useRef(null);
    const popperRef = useRef(null);
    const anchorElRef = useRef(null);
    const [menuState, setMenuState] = React.useState({
        open: false,
        anchorEl: null,
        pendingSelections: selectedValues,
    });
    const selectionsChangedRef = useRef(false);
    React.useEffect(() => {
        if (!menuState.open) {
            setMenuState((prev) => ({
                ...prev,
                pendingSelections: selectedValues,
            }));
        }
    }, [selectedValues, menuState.open]);
    const getChipLabel = useCallback(() => {
        if (getDisplayText) {
            return getDisplayText(selectedValues, options);
        }
        if (selectedValues.length === 0) {
            return emptyLabel;
        }
        const lastSelectedValue = selectedValues[selectedValues.length - 1];
        const selectedOption = options.find((opt) => opt.value === lastSelectedValue);
        return selectedOption?.label || lastSelectedValue;
    }, [selectedValues, options, getDisplayText, emptyLabel]);
    const getChipIcon = useCallback(() => {
        if (selectedValues.length === 0) {
            return undefined;
        }
        const lastSelectedValue = selectedValues[selectedValues.length - 1];
        const selectedOption = options.find((opt) => opt.value === lastSelectedValue);
        return selectedOption?.icon || undefined;
    }, [selectedValues, options]);
    const handleOpenMenu = useCallback(() => {
        anchorElRef.current = chipRef.current;
        setMenuState((prev) => ({
            ...prev,
            open: true,
            anchorEl: chipRef.current,
            pendingSelections: selectedValues,
        }));
        selectionsChangedRef.current = false;
        onMenuOpen?.();
    }, [selectedValues, onMenuOpen]);
    const handleCloseMenu = useCallback(() => {
        setMenuState((prev) => {
            if (!showApplyButton && selectionsChangedRef.current) {
                onChange(prev.pendingSelections);
            }
            return {
                ...prev,
                open: false,
                anchorEl: null,
            };
        });
        anchorElRef.current = null;
        selectionsChangedRef.current = false;
        onMenuClose?.();
    }, [onChange, showApplyButton, onMenuClose]);
    const toggleOption = useCallback((value) => {
        setMenuState((prev) => {
            if (!multiple) {
                return {
                    ...prev,
                    pendingSelections: [value],
                };
            }
            return {
                ...prev,
                pendingSelections: prev.pendingSelections.includes(value)
                    ? prev.pendingSelections.filter((v) => v !== value)
                    : [...prev.pendingSelections, value],
            };
        });
    }, [multiple]);
    const handleApply = useCallback(() => {
        onChange(menuState.pendingSelections);
        handleCloseMenu();
    }, [menuState.pendingSelections, onChange, handleCloseMenu]);
    const handleOptionChange = useCallback((value) => {
        selectionsChangedRef.current = true;
        toggleOption(value);
    }, [toggleOption]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === "Escape") {
            handleCloseMenu();
        }
    }, [handleCloseMenu]);
    React.useEffect(() => {
        if (!menuState.open) {
            return;
        }
        const handleClickOutside = (e) => {
            const target = e.target;
            if (popperRef.current?.contains(target) || chipRef.current?.contains(target)) {
                return;
            }
            handleCloseMenu();
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuState.open, handleCloseMenu]);
    React.useImperativeHandle(ref, () => chipRef.current);
    const chipLabel = getChipLabel();
    const chipIcon = getChipIcon();
    const isOpen = menuState.open;
    const baseChipSx = (color === "default" || !color
        ? {
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
        }
        : {});
    const mergedChipSx = mergeSx(baseChipSx, sx);
    const renderOptionLabel = (option) => {
        const content = (_jsxs(Box, { sx: {
                display: "flex",
                alignItems: "center",
                gap: 1,
                width: "100%",
            }, children: [option.icon && _jsx(Box, { sx: { display: "flex" }, children: option.icon }), _jsx("span", { children: option.label }), option.endIcon && (_jsx(Box, { sx: {
                        display: "flex",
                        ml: "auto",
                        alignItems: "center",
                    }, children: option.endIcon }))] }));
        if (!option.tooltip) {
            return content;
        }
        return (_jsx(Tooltip, { title: option.tooltip, arrow: true, placement: "left", children: _jsx(Box, { sx: { width: "100%" }, children: content }) }));
    };
    return (_jsxs(_Fragment, { children: [_jsx(Chip, { ref: chipRef, label: chipLabel, icon: chipIcon, onClick: () => {
                    if (isOpen) {
                        handleCloseMenu();
                    }
                    else {
                        handleOpenMenu();
                    }
                }, variant: "filled", disabled: disabled || isLoading, deleteIcon: _jsx(ExpandMoreIcon, {}), onDelete: (e) => {
                    e.stopPropagation();
                    if (isOpen) {
                        handleCloseMenu();
                    }
                    else {
                        handleOpenMenu();
                    }
                }, size: size, color: error ? "error" : color, sx: mergedChipSx, ...restProps }), _jsx(Popper, { open: isOpen, anchorEl: anchorElRef.current, placement: placement, modifiers: [
                    { name: "offset", options: { offset: [0, 8] } },
                    { name: "preventOverflow", options: { padding: 8 } },
                ], onKeyDown: handleKeyDown, style: { zIndex: 1400 }, children: _jsxs(Paper, { ref: popperRef, sx: {
                        p: 1.5,
                        minWidth: minMenuWidth,
                        maxWidth: 400,
                        maxHeight: 400,
                        overflowY: "auto",
                        zIndex: 1400,
                        boxShadow: (theme) => theme.shadows[8],
                    }, children: [_jsx(Stack, { spacing: 0.5, children: options.length === 0 ? (_jsx(Box, { sx: { p: 1, textAlign: "center", color: "text.secondary" }, children: "No options available" })) : !multiple ? (_jsx(RadioGroup, { value: menuState.pendingSelections[0] || "", onChange: (e) => {
                                    handleOptionChange(e.target.value);
                                    if (!showApplyButton) {
                                        setTimeout(() => handleCloseMenu(), 100);
                                    }
                                }, children: options.map((option) => (_jsx(FormControlLabel, { value: option.value, onClick: (e) => {
                                        if (multiple) {
                                            return;
                                        }
                                        const current = menuState.pendingSelections[0] || "";
                                        if (current && current === option.value) {
                                            if (onOptionReselect) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onOptionReselect(option.value);
                                                setTimeout(() => handleCloseMenu(), 0);
                                            }
                                        }
                                    }, control: _jsx(Radio, { disabled: isLoading || option.disabled, size: "small" }), label: renderOptionLabel(option), disabled: isLoading || option.disabled, sx: {
                                        m: 0,
                                        width: "100%",
                                        "&:hover": {
                                            backgroundColor: option.disabled ? "transparent" : "action.hover",
                                        },
                                        borderRadius: 0.5,
                                        pl: 0.5,
                                        ...(option.rowSx || {}),
                                    } }, option.value))) })) : (options.map((option) => (_jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: menuState.pendingSelections.includes(option.value), onChange: () => handleOptionChange(option.value), disabled: isLoading || option.disabled, size: "small" }), label: renderOptionLabel(option), disabled: isLoading || option.disabled, sx: {
                                    m: 0,
                                    width: "100%",
                                    "&:hover": {
                                        backgroundColor: option.disabled ? "transparent" : "action.hover",
                                    },
                                    borderRadius: 0.5,
                                    pl: 0.5,
                                    ...(option.rowSx || {}),
                                } }, option.value)))) }), showApplyButton && menuState.pendingSelections.length > 0 && (_jsxs(_Fragment, { children: [_jsx(Divider, { sx: { my: 1 } }), _jsx(Button, { fullWidth: true, size: "small", onClick: handleApply, disabled: isLoading, startIcon: isLoading ? _jsx(CircularProgress, { size: 16 }) : undefined, children: isLoading ? "Applying..." : "Apply" })] }))] }) })] }));
});
SelectChip.displayName = "SelectChip";
export default SelectChip;
