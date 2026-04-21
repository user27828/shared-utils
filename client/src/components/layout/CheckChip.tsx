/**
 * CheckChip component - checkbox semantics rendered with a Chip visual shell.
 */
import React from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import type { ChipProps } from "@mui/material/Chip";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import IndeterminateCheckBoxIcon from "@mui/icons-material/IndeterminateCheckBox";
import type { SxProps, Theme } from "@mui/material/styles";

const mergeSx = (
  base: SxProps<Theme>,
  extra?: SxProps<Theme>,
): SxProps<Theme> => {
  if (!extra) {
    return base;
  }

  const baseArr = (Array.isArray(base) ? base : [base]) as Extract<
    SxProps<Theme>,
    readonly unknown[]
  >;
  const extraArr = (Array.isArray(extra) ? extra : [extra]) as Extract<
    SxProps<Theme>,
    readonly unknown[]
  >;

  return [...baseArr, ...extraArr] as SxProps<Theme>;
};

export type CheckChipInputProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "type" | "checked" | "defaultChecked" | "disabled" | "onChange"
>;

export interface CheckChipProps extends Omit<
  ChipProps,
  | "label"
  | "icon"
  | "onClick"
  | "onDelete"
  | "onChange"
  | "clickable"
  | "component"
> {
  label: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => void;
  inputProps?: CheckChipInputProps;
  icon?: React.ReactElement;
  checkedIcon?: React.ReactElement;
  indeterminateIcon?: React.ReactElement;
}

export const CheckChip = React.forwardRef<HTMLInputElement, CheckChipProps>(
  (
    {
      label,
      checked,
      defaultChecked = false,
      indeterminate = false,
      onChange,
      inputProps,
      icon,
      checkedIcon,
      indeterminateIcon,
      disabled = false,
      size = "medium",
      color,
      sx,
      ...chipProps
    },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const isControlled = checked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] =
      React.useState(defaultChecked);
    const [isFocused, setIsFocused] = React.useState(false);

    const resolvedChecked = isControlled ? checked : uncontrolledChecked;

    const {
      onBlur: inputOnBlur,
      onFocus: inputOnFocus,
      className: inputClassName,
      style: inputStyle,
      ...restInputProps
    } = inputProps ?? {};

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (!inputRef.current) {
        return;
      }

      inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!isControlled) {
          setUncontrolledChecked(event.target.checked);
        }

        onChange?.(event, event.target.checked);
      },
      [isControlled, onChange],
    );

    const handleFocus = React.useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        inputOnFocus?.(event);
      },
      [inputOnFocus],
    );

    const handleBlur = React.useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        inputOnBlur?.(event);
      },
      [inputOnBlur],
    );

    const iconFontSize = size === "small" ? "small" : "medium";
    const checkboxIcon = indeterminate
      ? indeterminateIcon || (
          <IndeterminateCheckBoxIcon fontSize={iconFontSize} />
        )
      : resolvedChecked
        ? checkedIcon || <CheckBoxIcon fontSize={iconFontSize} />
        : icon || <CheckBoxOutlineBlankIcon fontSize={iconFontSize} />;

    const baseChipSx = ((theme: Theme) => ({
      cursor: disabled ? "not-allowed" : "pointer",
      transition: theme.transitions.create(
        ["background-color", "border-color"],
        {
          duration: theme.transitions.duration.shorter,
        },
      ),
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
    })) satisfies SxProps<Theme>;

    const mergedChipSx = mergeSx(baseChipSx, sx);

    return (
      <Box
        component="label"
        sx={{
          display: "inline-flex",
          position: "relative",
          alignItems: "center",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <input
          {...restInputProps}
          ref={inputRef}
          type="checkbox"
          checked={resolvedChecked}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={inputClassName}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            margin: 0,
            opacity: 0,
            cursor: disabled ? "not-allowed" : "pointer",
            zIndex: 1,
            ...inputStyle,
          }}
        />
        <Chip
          {...chipProps}
          label={label}
          icon={checkboxIcon}
          disabled={disabled}
          size={size}
          color={color}
          tabIndex={-1}
          sx={mergedChipSx}
        />
      </Box>
    );
  },
);

CheckChip.displayName = "CheckChip";

export default CheckChip;
