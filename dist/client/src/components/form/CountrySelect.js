"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_2 = __importStar(require("react"));
const prop_types_1 = __importDefault(require("prop-types"));
const material_1 = require("@mui/material");
const countries_1 = require("../../helpers/countries");
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
    const countryOptions = (0, react_2.useMemo)(() => {
        // Make sure topCountries is properly formatted
        let formattedTopCountry = topCountries;
        // Handle string vs array case
        if (typeof topCountries === "string" && topCountries) {
            formattedTopCountry = topCountries; // Just pass as is - no need to make array
        }
        return (0, countries_1.getCountryOptions)({
            includeEmpty: showEmpty,
            topCountries: formattedTopCountry,
            sortBy,
            order,
        });
    }, [showEmpty, topCountries, sortBy, order]);
    // Get current selected country object(s) for display
    const selectedCountryObjects = (0, react_2.useMemo)(() => {
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
        return ((0, jsx_runtime_1.jsx)(material_1.Autocomplete, { id: id, value: selectedCountryObjects || "", onChange: handleChange, multiple: multiple, options: countryOptions, disableCloseOnSelect: multiple, getOptionLabel: getCountryLabel, filterOptions: filterOptions, isOptionEqualToValue: (option, value) => option.iso3166_1_alpha2 === value.iso3166_1_alpha2 ||
                option.iso3166_1_alpha3 === value.iso3166_1_alpha3, renderOption: (props, option, { selected }) => ((0, react_1.createElement)(material_1.MenuItem, { ...props, key: `${option.iso3166_1_alpha3}-${option.iso3166_1_numeric}`, sx: { display: "flex", alignItems: "center" } },
                multiple && (0, jsx_runtime_1.jsx)(material_1.Checkbox, { checked: selected, sx: { mr: 1 } }),
                (0, jsx_runtime_1.jsx)(material_1.ListItemText, { primary: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: "flex", justifyContent: "space-between" }, children: [(0, jsx_runtime_1.jsx)("span", { children: option.name }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "caption", color: "text.secondary", children: [option.iso3166_1_alpha2, showTelCode && option.telCountryCode
                                        ? ` +${option.telCountryCode}`
                                        : ""] })] }), secondary: option.nameLocal !== option.name ? option.nameLocal : null }))), renderTags: (value, getTagProps) => value.map((option, index) => ((0, react_1.createElement)(material_1.Chip, { variant: "outlined", label: option.name, ...getTagProps({ index }), key: option.iso3166_1_alpha3 || option.iso3166_1_alpha2 }))), renderInput: (params) => ((0, jsx_runtime_1.jsx)(material_1.TextField, { ...params, name: name, label: label, placeholder: placeholder, required: required, error: error, helperText: helperText, fullWidth: fullWidth, size: size, variant: variant, disabled: disabled, InputProps: {
                    ...params.InputProps,
                    sx: { ...sx },
                } })), disabled: disabled, ...props }));
    }
    // Regular Select component for non-searchable version
    return ((0, jsx_runtime_1.jsxs)(material_1.FormControl, { fullWidth: fullWidth, required: required, error: error, disabled: disabled, size: size, variant: variant, sx: sx, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { id: `${id}-label`, children: label }), (0, jsx_runtime_1.jsx)(material_1.Select, { id: id, name: name, labelId: `${id}-label`, value: multiple ? value || [] : value || "", onChange: handleRegularSelectChange, multiple: multiple, label: label, renderValue: (selected) => {
                    if (multiple) {
                        const selectedCountries = countryOptions.filter((country) => selected.includes(country.iso3166_1_alpha2));
                        return ((0, jsx_runtime_1.jsx)(material_1.Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.5 }, children: selectedCountries.map((country) => ((0, jsx_runtime_1.jsx)(material_1.Chip, { label: country.name }, country.iso3166_1_alpha2))) }));
                    }
                    else {
                        const selectedCountry = countryOptions.find((country) => country.iso3166_1_alpha2 === selected);
                        return selectedCountry ? selectedCountry.name : "";
                    }
                }, placeholder: placeholder, ...props, children: countryOptions.map((country) => ((0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: country.iso3166_1_alpha2, children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: "flex", flexDirection: "column" }, children: [multiple && ((0, jsx_runtime_1.jsx)(material_1.Checkbox, { checked: value ? value.indexOf(country.iso3166_1_alpha2) > -1 : false })), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { primary: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: "flex", justifyContent: "space-between" }, children: [(0, jsx_runtime_1.jsx)("span", { children: country.name }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "caption", color: "text.secondary", children: [country.iso3166_1_alpha2, showTelCode && country.telCountryCode
                                                    ? ` +${country.telCountryCode}`
                                                    : ""] })] }), secondary: country.nameLocal !== country.name ? country.nameLocal : null })] }) }, country.iso3166_1_alpha3 || country.iso3166_1_alpha2))) }), helperText && (0, jsx_runtime_1.jsx)(material_1.FormHelperText, { children: helperText })] }));
};
CountrySelect.propTypes = {
    value: prop_types_1.default.oneOfType([
        prop_types_1.default.string,
        prop_types_1.default.number,
        prop_types_1.default.arrayOf(prop_types_1.default.oneOfType([prop_types_1.default.string, prop_types_1.default.number])),
    ]),
    onChange: prop_types_1.default.func.isRequired,
    multiple: prop_types_1.default.bool,
    topCountries: prop_types_1.default.oneOfType([
        prop_types_1.default.string,
        prop_types_1.default.arrayOf(prop_types_1.default.string),
    ]),
    showEmpty: prop_types_1.default.bool,
    searchable: prop_types_1.default.bool,
    sortBy: prop_types_1.default.string,
    order: prop_types_1.default.oneOf(["asc", "desc"]),
    label: prop_types_1.default.string,
    id: prop_types_1.default.string,
    name: prop_types_1.default.string,
    required: prop_types_1.default.bool,
    disabled: prop_types_1.default.bool,
    error: prop_types_1.default.bool,
    helperText: prop_types_1.default.string,
    sx: prop_types_1.default.object,
    fullWidth: prop_types_1.default.bool,
    size: prop_types_1.default.oneOf(["small", "medium", "large"]),
    variant: prop_types_1.default.oneOf(["standard", "outlined", "filled"]),
    placeholder: prop_types_1.default.string,
    showTelCode: prop_types_1.default.bool,
};
exports.default = CountrySelect;
