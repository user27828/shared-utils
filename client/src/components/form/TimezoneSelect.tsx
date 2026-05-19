import React, { useMemo } from "react";
import Autocomplete, {
  createFilterOptions,
} from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

import {
  DEFAULT_PRIORITY_TIMEZONES,
  getTimezoneOptions,
  type TimezoneOption,
} from "../../helpers/timezones.js";

const timezoneFilterOptions = createFilterOptions<TimezoneOption>({
  stringify: (option) => option.keywords,
});

export interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  sx?: SxProps<Theme>;
  fullWidth?: boolean;
  size?: "small" | "medium";
  variant?: "standard" | "outlined" | "filled";
  placeholder?: string;
  topTimezones?: string[];
  disableClearable?: boolean;
}

const TimezoneSelect: React.FC<TimezoneSelectProps> = ({
  value,
  onChange,
  label = "Timezone",
  id = "timezone-select",
  name = "timezone",
  required = false,
  disabled = false,
  error = false,
  helperText,
  sx = {},
  fullWidth = true,
  size = "medium",
  variant = "outlined",
  placeholder = "Search timezone",
  topTimezones = DEFAULT_PRIORITY_TIMEZONES,
  disableClearable = false,
  ...props
}) => {
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

    return (
      timezoneOptions.find((option) => option.value === value) || null
    );
  }, [timezoneOptions, value]);

  const resolvedHelperText = selectedTimezoneOption?.isUnknown ? (
    <>
      {helperText || "Select an IANA timezone."}
      <br />
      Current stored value is not in the runtime-supported timezone list.
    </>
  ) : (
    helperText
  );

  return (
    <Autocomplete
      id={id}
      value={selectedTimezoneOption}
      onChange={(_event, nextValue) => {
        onChange(nextValue?.value || "");
      }}
      options={timezoneOptions}
      autoHighlight
      openOnFocus
      disableClearable={disableClearable}
      fullWidth={fullWidth}
      disabled={disabled}
      filterOptions={timezoneFilterOptions}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selectedOption) => {
        return option.value === selectedOption.value;
      }}
      renderOption={(optionProps, option) => {
        const { key, ...listItemProps } = optionProps;

        return (
          <Box
            component="li"
            key={key}
            {...listItemProps}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 0.25,
            }}
          >
            <Typography variant="body2">{option.value}</Typography>
            <Typography
              variant="caption"
              color={option.isUnknown ? "warning.main" : "text.secondary"}
            >
              {option.secondaryLabel}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            name={name}
            label={label}
            placeholder={placeholder}
            required={required}
            error={error}
            helperText={resolvedHelperText}
            fullWidth={fullWidth}
            size={size}
            variant={variant}
            disabled={disabled}
            sx={sx}
          />
        );
      }}
      {...props}
    />
  );
};

export default TimezoneSelect;
