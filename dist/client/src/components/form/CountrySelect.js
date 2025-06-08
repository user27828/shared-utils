import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { FormControl, InputLabel, TextField, MenuItem, ListItemText, Select, Checkbox, Autocomplete, Chip, Box, Typography, FormHelperText, } from "@mui/material";
import { getCountryOptions } from "../../helpers/countries";
/**
 * Country selection component supporting single or multiple country selection
 *
 * @param {Object} props - Component props
 * @param {string|string[]} props.value - Selected country code(s)
 * @param {function} props.onChange - Change handler function
 * @param {boolean} props.multiple - Whether multiple countries can be selected
 * @param {string|string[]} props.topCountries - ISO code(s) to place at the top
 * @param {boolean} props.showEmpty - Whether to show the "Not Selected/Other" option
 * @param {boolean} props.searchable - Whether to enable search functionality
 * @param {string} props.sortBy - Property to sort by (e.g., "name", "population")
 * @param {string} props.order - Sort order: "asc" or "desc"
 * @param {string} props.label - Label for the select
 * @param {string} props.id - ID for the component
 * @param {string} props.name - Name for the form field
 * @param {boolean} props.required - Whether the field is required
 * @param {boolean} props.disabled - Whether the field is disabled
 * @param {string} props.error - Error message
 * @param {string} props.helperText - Helper text
 * @param {Object} props.sx - Additional styles
 * @param {boolean} props.fullWidth - Whether the component should take up full width
 * @param {string} props.size - Size of the component
 * @param {string} props.variant - Variant of the component
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.showTelCode - Whether to show telephone country code
 * @returns {JSX.Element}
 */
const CountrySelect = ({ value, onChange, multiple = false, topCountries, showEmpty = true, searchable = true, sortBy = "name", order = "asc", label = "Country", id, name, required = false, disabled = false, error = false, helperText = "", sx = {}, fullWidth = true, size = "medium", variant = "outlined", placeholder = "Select country", showTelCode = false, ...props }) => {
    // Prepare country options based on props
    const countryOptions = useMemo(() => {
        // Make sure topCountries is properly formatted
        let formattedTopCountry = topCountries;
        // Handle string vs array case
        if (typeof topCountries === "string" && topCountries) {
            formattedTopCountry = topCountries; // Just pass as is - no need to make array
        }
        return getCountryOptions({
            includeEmpty: showEmpty,
            topCountries: formattedTopCountry,
            sortBy,
            order,
        });
    }, [showEmpty, topCountries, sortBy, order]);
    // Get current selected country object(s) for display
    const selectedCountryObjects = useMemo(() => {
        if (!value) {
            return multiple ? [] : null;
        }
        if (multiple && Array.isArray(value)) {
            return value
                .map((code) => countryOptions.find((country) => country.iso3166_1_alpha2 === code ||
                country.iso3166_1_alpha3 === code ||
                country.iso3166_1_numeric === parseInt(code)) || null)
                .filter(Boolean);
        }
        else {
            return (countryOptions.find((country) => country.iso3166_1_alpha2 === value ||
                country.iso3166_1_alpha3 === value ||
                country.iso3166_1_numeric === parseInt(value)) || null);
        }
    }, [value, countryOptions, multiple]);
    // Handle change based on whether it's multiple selection or not
    const handleChange = (event, newValue) => {
        if (!onChange) {
            return;
        }
        if (multiple) {
            // For multiple selection, extract the codes
            const selectedCodes = Array.isArray(newValue)
                ? newValue.map((item) => item.iso3166_1_alpha2 || "")
                : [];
            onChange(selectedCodes);
        }
        else {
            // For single selection, extract the code
            const selectedCode = newValue ? newValue.iso3166_1_alpha2 || "" : "";
            onChange(selectedCode);
        }
    };
    // For non-searchable version, handle the regular select change
    const handleRegularSelectChange = (event) => {
        if (!onChange)
            return;
        onChange(event.target.value);
    };
    // Format the country display name to include code and language information
    const getCountryLabel = (country) => {
        if (!country)
            return "";
        // Format with country name and native name if different
        let label = country.name;
        if (country.nameLocal && country.nameLocal !== country.name) {
            label += ` (${country.nameLocal})`;
        }
        if (showTelCode && country.telCountryCode) {
            label += ` +${country.telCountryCode}`;
        }
        return label;
    };
    // Enhanced filter options for searching both name and nameLocal
    const filterOptions = (options, { inputValue }) => {
        const lowerCaseInput = inputValue.toLowerCase();
        return options.filter((option) => option.name.toLowerCase().includes(lowerCaseInput) ||
            option.nameLocal.toLowerCase().includes(lowerCaseInput) ||
            (showTelCode &&
                option.telCountryCode &&
                `+${option.telCountryCode}`.includes(lowerCaseInput)));
    };
    // If searchable, use Autocomplete component
    if (searchable) {
        return (_jsx(Autocomplete, { id: id, value: selectedCountryObjects || "", onChange: handleChange, multiple: multiple, options: countryOptions, disableCloseOnSelect: multiple, getOptionLabel: getCountryLabel, filterOptions: filterOptions, isOptionEqualToValue: (option, value) => option.iso3166_1_alpha2 === value.iso3166_1_alpha2 ||
                option.iso3166_1_alpha3 === value.iso3166_1_alpha3, renderOption: (props, option, { selected }) => (_createElement(MenuItem, { ...props, key: `${option.iso3166_1_alpha3}-${option.iso3166_1_numeric}`, sx: { display: "flex", alignItems: "center" } },
                multiple && _jsx(Checkbox, { checked: selected, sx: { mr: 1 } }),
                _jsx(ListItemText, { primary: _jsxs(Box, { sx: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { children: option.name }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [option.iso3166_1_alpha2, showTelCode && option.telCountryCode
                                        ? ` +${option.telCountryCode}`
                                        : ""] })] }), secondary: option.nameLocal !== option.name ? option.nameLocal : null }))), renderTags: (value, getTagProps) => value.map((option, index) => (_createElement(Chip, { variant: "outlined", label: option.name, ...getTagProps({ index }), key: option.iso3166_1_alpha3 || option.iso3166_1_alpha2 }))), renderInput: (params) => (_jsx(TextField, { ...params, name: name, label: label, placeholder: placeholder, required: required, error: error, helperText: helperText, fullWidth: fullWidth, size: size, variant: variant, disabled: disabled, InputProps: {
                    ...params.InputProps,
                    sx: { ...sx },
                } })), disabled: disabled, ...props }));
    }
    // Regular Select component for non-searchable version
    return (_jsxs(FormControl, { fullWidth: fullWidth, required: required, error: error, disabled: disabled, size: size, variant: variant, sx: sx, children: [_jsx(InputLabel, { id: `${id}-label`, children: label }), _jsx(Select, { id: id, name: name, labelId: `${id}-label`, value: multiple ? value || [] : value || "", onChange: handleRegularSelectChange, multiple: multiple, label: label, renderValue: (selected) => {
                    if (multiple) {
                        const selectedCountries = countryOptions.filter((country) => selected.includes(country.iso3166_1_alpha2));
                        return (_jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.5 }, children: selectedCountries.map((country) => (_jsx(Chip, { label: country.name }, country.iso3166_1_alpha2))) }));
                    }
                    else {
                        const selectedCountry = countryOptions.find((country) => country.iso3166_1_alpha2 === selected);
                        return selectedCountry ? selectedCountry.name : "";
                    }
                }, placeholder: placeholder, ...props, children: countryOptions.map((country) => (_jsx(MenuItem, { value: country.iso3166_1_alpha2, children: _jsxs(Box, { sx: { display: "flex", flexDirection: "column" }, children: [multiple && (_jsx(Checkbox, { checked: value ? value.indexOf(country.iso3166_1_alpha2) > -1 : false })), _jsx(ListItemText, { primary: _jsxs(Box, { sx: { display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { children: country.name }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [country.iso3166_1_alpha2, showTelCode && country.telCountryCode
                                                    ? ` +${country.telCountryCode}`
                                                    : ""] })] }), secondary: country.nameLocal !== country.name ? country.nameLocal : null })] }) }, country.iso3166_1_alpha3 || country.iso3166_1_alpha2))) }), helperText && _jsx(FormHelperText, { children: helperText })] }));
};
CountrySelect.propTypes = {
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    ]),
    onChange: PropTypes.func.isRequired,
    multiple: PropTypes.bool,
    topCountries: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
    ]),
    showEmpty: PropTypes.bool,
    searchable: PropTypes.bool,
    sortBy: PropTypes.string,
    order: PropTypes.oneOf(["asc", "desc"]),
    label: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    error: PropTypes.bool,
    helperText: PropTypes.string,
    sx: PropTypes.object,
    fullWidth: PropTypes.bool,
    size: PropTypes.oneOf(["small", "medium", "large"]),
    variant: PropTypes.oneOf(["standard", "outlined", "filled"]),
    placeholder: PropTypes.string,
    showTelCode: PropTypes.bool,
};
export default CountrySelect;
