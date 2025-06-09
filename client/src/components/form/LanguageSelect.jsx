import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  FormControl,
  InputLabel,
  TextField,
  MenuItem,
  ListItemText,
  Select,
  Checkbox,
  Autocomplete,
  Chip,
  Box,
  Typography,
  FormHelperText,
} from "@mui/material";
import { getLanguageOptions } from "../../helpers/languages";

/**
 * Language selection component supporting single or multiple language selection
 *
 * @param {Object} param0 - Component props
 * @param {string|string[]} param0.value - Selected language code(s)
 * @param {function} param0.onChange - Change handler function
 * @param {string} [param0.name="languages"] - Name for the form field
 * @param {string} [param0.id="language-select"] - React node ID for the component (must be unique for calling component)
 * @param {string|string[]|Object} [param0.topLanguages=[...]] - ISO code(s), IETF tag(s), or {ietfRegions: [array]} object
 * @param {boolean} [param0.multiple=false] - Whether multiple languages can be selected
 * @param {boolean} [param0.showEmpty=true] - Whether to show the "Not Selected/Other" option
 * @param {boolean} [param0.searchable=true] - Whether to enable search functionality
 * @param {string} [param0.sortBy="name"] - Property to sort by (e.g., "name", "speakers")
 * @param {string} [param0.order="asc"] - Sort order: "asc" or "desc"
 * @param {string} [param0.label="Language"] - Label for the select
 * @param {boolean} [param0.required=false] - Whether the field is required
 * @param {boolean} [param0.disabled=false] - Whether the field is disabled
 * @param {string} [param0.error=false] - Error message
 * @param {string} [param0.helperText=""] - Helper text
 * @param {Object} [param0.sx={}] - Additional styles
 * @param {boolean} [param0.fullWidth=true] - Whether the component should take up full width
 * @param {string} [param0.size="medium"] - Size of the component
 * @param {string} [param0.variant="outlined"] - Variant of the component
 * @param {string} [param0.placeholder="Select language"] - Placeholder text
 * @param {Object} [param0.props] - Additional props to pass to the <Autocomplete> component
 * @returns {JSX.Element}
 */
const LanguageSelect = ({
  value,
  onChange,
  name="languages",
  id="language-select",
  multiple = false,
  topLanguages=["en", "fr", "es", "de", "zh", "ja", "ru", "ar"],
  showEmpty = true,
  searchable = true,
  sortBy = "name",
  order = "asc",
  label = "Language",
  required = false,
  disabled = false,
  error = false,
  helperText = "",
  sx = {},
  fullWidth = true,
  size = "medium",
  variant = "outlined",
  placeholder = "Select language",
  ...props
}) => {
  // Prepare language options based on props
  const languageOptions = useMemo(() => {
    return getLanguageOptions({
      includeEmpty: showEmpty,
      topLanguages,
      sortBy,
      order,
    });
  }, [showEmpty, topLanguages, sortBy, order]);

  // Get current selected language object(s) for display
  const selectedLanguageObjects = useMemo(() => {
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
        .map(
          (code) =>
            languageOptions.find(
              (lang) =>
                lang.iso639_1 === code ||
                lang.iso639_2 === code ||
                lang.ietf === code ||
                (lang.ietfRegions &&
                  Object.values(lang.ietfRegions).includes(code)),
            ) || null,
        )
        .filter(Boolean);
    } else {
      // For single selection mode
      return (
        languageOptions.find(
          (lang) =>
            lang.iso639_1 === value ||
            lang.iso639_2 === value ||
            lang.ietf === value ||
            (lang.ietfRegions &&
              Object.values(lang.ietfRegions).includes(value)),
        ) || null
      );
    }
  }, [value, languageOptions, multiple]);

  // Handle change based on whether it's multiple selection or not
  const handleChange = (event, newValue) => {
    if (!onChange) return;

    if (multiple) {
      // For multiple selection, extract the codes
      // Use ietf as the standard code to return
      const selectedCodes = Array.isArray(newValue)
        ? newValue.map((item) => item.ietf || item.iso639_1 || "")
        : [];
      onChange(selectedCodes);
    } else {
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
    if (!onChange) return;
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
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(lowerCaseInput) ||
        option.nameLocal.toLowerCase().includes(lowerCaseInput),
    );
  };

  // If searchable, use Autocomplete component
  if (searchable) {
    return (
      <Autocomplete
        id={id}
        value={selectedLanguageObjects || []}
        onChange={handleChange}
        multiple={multiple}
        options={languageOptions}
        disableCloseOnSelect={multiple}
        getOptionLabel={getLanguageLabel}
        filterOptions={filterOptions}
        isOptionEqualToValue={(option, value) =>
          option.iso639_1 === value.iso639_1 ||
          option.iso639_2 === value.iso639_2 ||
          option.ietf === value.ietf
        }
        renderOption={(props, option, { selected }) => (
          <MenuItem
            {...props}
            key={
              option.iso639_3 ||
              option.iso639_2 ||
              option.iso639_1 ||
              option.ietf
            }
            sx={{ display: "flex", alignItems: "center" }}
          >
            {multiple && <Checkbox checked={selected} sx={{ mr: 1 }} />}
            <ListItemText
              primary={
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{option.name}</span>
                  <Typography variant="caption" color="text.secondary">
                    {option.ietf || option.iso639_1}
                  </Typography>
                </Box>
              }
              secondary={
                option.nameLocal !== option.name ? option.nameLocal : null
              }
            />
          </MenuItem>
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option.name}
              {...getTagProps({ index })}
              key={option.iso639_3 || option.iso639_2 || option.ietf}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            name={name}
            label={label}
            placeholder={placeholder}
            required={required}
            error={error}
            helperText={helperText}
            fullWidth={fullWidth}
            size={size}
            variant={variant}
            disabled={disabled}
            InputProps={{
              ...params.InputProps,
              sx: { ...sx },
            }}
          />
        )}
        disabled={disabled}
        {...props}
      />
    );
  }

  // Regular Select component for non-searchable version
  return (
    <FormControl
      fullWidth={fullWidth}
      required={required}
      error={error}
      disabled={disabled}
      size={size}
      variant={variant}
      sx={sx}
    >
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select
        id={id}
        name={name}
        labelId={`${id}-label`}
        value={multiple ? value || [] : value || ""}
        onChange={handleRegularSelectChange}
        multiple={multiple}
        label={label}
        renderValue={(selected) => {
          if (multiple) {
            const selectedLangs = languageOptions.filter((lang) =>
              selected.includes(lang.ietf || lang.iso639_1),
            );
            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selectedLangs.map((lang) => (
                  <Chip key={lang.ietf || lang.iso639_1} label={lang.name} />
                ))}
              </Box>
            );
          } else {
            const selectedLang = languageOptions.find(
              (lang) => (lang.ietf || lang.iso639_1) === selected,
            );
            return selectedLang ? selectedLang.name : "";
          }
        }}
        placeholder={placeholder}
        {...props}
      >
        {languageOptions.map((language) => (
          <MenuItem
            key={language.iso639_3 || language.iso639_2 || language.ietf}
            value={language.ietf || language.iso639_1}
          >
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {multiple && (
                <Checkbox
                  checked={
                    value
                      ? value.indexOf(language.ietf || language.iso639_1) > -1
                      : false
                  }
                />
              )}
              <ListItemText
                primary={
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>{language.name}</span>
                    <Typography variant="caption" color="text.secondary">
                      {language.ietf || language.iso639_1}
                    </Typography>
                  </Box>
                }
                secondary={
                  language.nameLocal !== language.name
                    ? language.nameLocal
                    : null
                }
              />
            </Box>
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

LanguageSelect.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  onChange: PropTypes.func.isRequired,
  multiple: PropTypes.bool,
  topLanguages: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.shape({
      ietfRegions: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
      ]),
    }),
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
};

export default LanguageSelect;
