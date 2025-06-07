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
const languages_1 = require("../../helpers/languages");
/**
 * Language selection component supporting single or multiple language selection
 *
 * @param {Object} props - Component props
 * @param {string|string[]} props.value - Selected language code(s)
 * @param {function} props.onChange - Change handler function
 * @param {boolean} props.multiple - Whether multiple languages can be selected
 * @param {string|string[]|Object} props.topLanguages - ISO code(s), IETF tag(s), or {ietfRegions: [array]} object
 * @param {boolean} props.showEmpty - Whether to show the "Not Selected/Other" option
 * @param {boolean} props.searchable - Whether to enable search functionality
 * @param {string} props.sortBy - Property to sort by (e.g., "name", "speakers")
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
 * @returns {JSX.Element}
 */
const LanguageSelect = ({ value, onChange, multiple = false, topLanguages, showEmpty = true, searchable = true, sortBy = "name", order = "asc", label = "Language", id, name, required = false, disabled = false, error = false, helperText = "", sx = {}, fullWidth = true, size = "medium", variant = "outlined", placeholder = "Select language", ...props }) => {
    // Prepare language options based on props
    const languageOptions = (0, react_2.useMemo)(() => {
        return (0, languages_1.getLanguageOptions)({
            includeEmpty: showEmpty,
            topLanguages,
            sortBy,
            order,
        });
    }, [showEmpty, topLanguages, sortBy, order]);
    // Get current selected language object(s) for display
    const selectedLanguageObjects = (0, react_2.useMemo)(() => {
        // Handle empty value cases
        if (!value) {
            return multiple ? [] : null;
        }
        // For multiple selection mode
        if (multiple) {
            // Ensure value is treated as array
            const valueArray = Array.isArray(value)
                ? value
                : typeof value === "string"
                    ? value.split(",").map((v) => v.trim())
                    : [value];
            return valueArray
                .map((code) => languageOptions.find((lang) => lang.iso639_1 === code ||
                lang.iso639_2 === code ||
                lang.ietf === code ||
                (lang.ietfRegions &&
                    Object.values(lang.ietfRegions).includes(code))) || null)
                .filter(Boolean);
        }
        else {
            // For single selection mode
            return (languageOptions.find((lang) => lang.iso639_1 === value ||
                lang.iso639_2 === value ||
                lang.ietf === value ||
                (lang.ietfRegions &&
                    Object.values(lang.ietfRegions).includes(value))) || null);
        }
    }, [value, languageOptions, multiple]);
    // Handle change based on whether it's multiple selection or not
    const handleChange = (event, newValue) => {
        if (!onChange)
            return;
        if (multiple) {
            // For multiple selection, extract the codes
            // Use ietf as the standard code to return
            const selectedCodes = Array.isArray(newValue)
                ? newValue.map((item) => item.ietf || item.iso639_1 || "")
                : [];
            onChange(selectedCodes);
        }
        else {
            // For single selection, extract the code
            // Use ietf as the standard code to return
            const selectedCode = newValue
                ? newValue.ietf || newValue.iso639_1 || ""
                : "";
            onChange(selectedCode);
        }
    };
    // For non-searchable version, handle the regular select change
    const handleRegularSelectChange = (event) => {
        if (!onChange)
            return;
        onChange(event.target.value);
    };
    // Format the language display name to include code and language information
    const getLanguageLabel = (lang) => {
        // Handle null, undefined, or empty array cases
        if (!lang || (Array.isArray(lang) && lang.length === 0)) {
            return "";
        }
        // Format with language name and native name if different
        let label = lang.name;
        if (lang.nameLocal && lang.nameLocal !== lang.name) {
            label += ` (${lang.nameLocal})`;
        }
        return label;
    };
    // Enhanced filter options for searching both name and nameLocal
    const filterOptions = (options, { inputValue }) => {
        const lowerCaseInput = inputValue.toLowerCase();
        return options.filter((option) => option.name.toLowerCase().includes(lowerCaseInput) ||
            option.nameLocal.toLowerCase().includes(lowerCaseInput));
    };
    // If searchable, use Autocomplete component
    if (searchable) {
        return ((0, jsx_runtime_1.jsx)(material_1.Autocomplete, { id: id, value: selectedLanguageObjects || [], onChange: handleChange, multiple: multiple, options: languageOptions, disableCloseOnSelect: multiple, getOptionLabel: getLanguageLabel, filterOptions: filterOptions, isOptionEqualToValue: (option, value) => option.iso639_1 === value.iso639_1 ||
                option.iso639_2 === value.iso639_2 ||
                option.ietf === value.ietf, renderOption: (props, option, { selected }) => ((0, react_1.createElement)(material_1.MenuItem, { ...props, key: option.iso639_3 ||
                    option.iso639_2 ||
                    option.iso639_1 ||
                    option.ietf, sx: { display: "flex", alignItems: "center" } },
                multiple && (0, jsx_runtime_1.jsx)(material_1.Checkbox, { checked: selected, sx: { mr: 1 } }),
                (0, jsx_runtime_1.jsx)(material_1.ListItemText, { primary: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: "flex", justifyContent: "space-between" }, children: [(0, jsx_runtime_1.jsx)("span", { children: option.name }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", color: "text.secondary", children: option.ietf || option.iso639_1 })] }), secondary: option.nameLocal !== option.name ? option.nameLocal : null }))), renderTags: (value, getTagProps) => value.map((option, index) => ((0, react_1.createElement)(material_1.Chip, { variant: "outlined", label: option.name, ...getTagProps({ index }), key: option.iso639_3 || option.iso639_2 || option.ietf }))), renderInput: (params) => ((0, jsx_runtime_1.jsx)(material_1.TextField, { ...params, name: name, label: label, placeholder: placeholder, required: required, error: error, helperText: helperText, fullWidth: fullWidth, size: size, variant: variant, disabled: disabled, InputProps: {
                    ...params.InputProps,
                    sx: { ...sx },
                } })), disabled: disabled, ...props }));
    }
    // Regular Select component for non-searchable version
    return ((0, jsx_runtime_1.jsxs)(material_1.FormControl, { fullWidth: fullWidth, required: required, error: error, disabled: disabled, size: size, variant: variant, sx: sx, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { id: `${id}-label`, children: label }), (0, jsx_runtime_1.jsx)(material_1.Select, { id: id, name: name, labelId: `${id}-label`, value: multiple ? value || [] : value || "", onChange: handleRegularSelectChange, multiple: multiple, label: label, renderValue: (selected) => {
                    if (multiple) {
                        const selectedLangs = languageOptions.filter((lang) => selected.includes(lang.ietf || lang.iso639_1));
                        return ((0, jsx_runtime_1.jsx)(material_1.Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.5 }, children: selectedLangs.map((lang) => ((0, jsx_runtime_1.jsx)(material_1.Chip, { label: lang.name }, lang.ietf || lang.iso639_1))) }));
                    }
                    else {
                        const selectedLang = languageOptions.find((lang) => (lang.ietf || lang.iso639_1) === selected);
                        return selectedLang ? selectedLang.name : "";
                    }
                }, placeholder: placeholder, ...props, children: languageOptions.map((language) => ((0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: language.ietf || language.iso639_1, children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: "flex", flexDirection: "column" }, children: [multiple && ((0, jsx_runtime_1.jsx)(material_1.Checkbox, { checked: value
                                    ? value.indexOf(language.ietf || language.iso639_1) > -1
                                    : false })), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { primary: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: "flex", justifyContent: "space-between" }, children: [(0, jsx_runtime_1.jsx)("span", { children: language.name }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", color: "text.secondary", children: language.ietf || language.iso639_1 })] }), secondary: language.nameLocal !== language.name
                                    ? language.nameLocal
                                    : null })] }) }, language.iso639_3 || language.iso639_2 || language.ietf))) }), helperText && (0, jsx_runtime_1.jsx)(material_1.FormHelperText, { children: helperText })] }));
};
LanguageSelect.propTypes = {
    value: prop_types_1.default.oneOfType([
        prop_types_1.default.string,
        prop_types_1.default.arrayOf(prop_types_1.default.string),
    ]),
    onChange: prop_types_1.default.func.isRequired,
    multiple: prop_types_1.default.bool,
    topLanguages: prop_types_1.default.oneOfType([
        prop_types_1.default.string,
        prop_types_1.default.arrayOf(prop_types_1.default.string),
        prop_types_1.default.shape({
            ietfRegions: prop_types_1.default.oneOfType([
                prop_types_1.default.string,
                prop_types_1.default.arrayOf(prop_types_1.default.string),
            ]),
        }),
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
};
exports.default = LanguageSelect;
