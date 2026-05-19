import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import Autocomplete, { createFilterOptions, } from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DEFAULT_PRIORITY_TIMEZONES, getTimezoneOptions, } from "../../helpers/timezones.js";
const timezoneFilterOptions = createFilterOptions({
    stringify: (option) => option.keywords,
});
const TimezoneSelect = ({ value, onChange, label = "Timezone", id = "timezone-select", name = "timezone", required = false, disabled = false, error = false, helperText, sx = {}, fullWidth = true, size = "medium", variant = "outlined", placeholder = "Search timezone", topTimezones = DEFAULT_PRIORITY_TIMEZONES, disableClearable = false, ...props }) => {
    const timezoneOptions = useMemo(() => {
        return getTimezoneOptions({
            topTimezones,
            currentValue: value,
        });
    }, [topTimezones, value]);
    const selectedTimezoneOption = useMemo(() => {
        if (!value) {
            return null;
        }
        return (timezoneOptions.find((option) => option.value === value) || null);
    }, [timezoneOptions, value]);
    const resolvedHelperText = selectedTimezoneOption?.isUnknown ? (_jsxs(_Fragment, { children: [helperText || "Select an IANA timezone.", _jsx("br", {}), "Current stored value is not in the runtime-supported timezone list."] })) : (helperText);
    return (_jsx(Autocomplete, { id: id, value: selectedTimezoneOption, onChange: (_event, nextValue) => {
            onChange(nextValue?.value || "");
        }, options: timezoneOptions, autoHighlight: true, openOnFocus: true, disableClearable: disableClearable, fullWidth: fullWidth, disabled: disabled, filterOptions: timezoneFilterOptions, getOptionLabel: (option) => option.label, isOptionEqualToValue: (option, selectedOption) => {
            return option.value === selectedOption.value;
        }, renderOption: (optionProps, option) => {
            const { key, ...listItemProps } = optionProps;
            return (_jsxs(Box, { component: "li", ...listItemProps, sx: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 0.25,
                }, children: [_jsx(Typography, { variant: "body2", children: option.value }), _jsx(Typography, { variant: "caption", color: option.isUnknown ? "warning.main" : "text.secondary", children: option.secondaryLabel })] }, key));
        }, renderInput: (params) => {
            return (_jsx(TextField, { ...params, name: name, label: label, placeholder: placeholder, required: required, error: error, helperText: resolvedHelperText, fullWidth: fullWidth, size: size, variant: variant, disabled: disabled, sx: sx }));
        }, ...props }));
};
export default TimezoneSelect;
