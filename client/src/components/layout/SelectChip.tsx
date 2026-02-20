/**
 * SelectChip Component - Multi-select or single-select dropdown using Chip + Popper.
 */
import React, { useCallback, useRef } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Popper,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  CircularProgress,
  Stack,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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

export interface SelectChipOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
  tooltip?: React.ReactNode;
  rowSx?: SxProps<Theme>;
  color?: string;
  disabled?: boolean;
}

export interface SelectChipProps {
  selectedValues: string[];
  options: SelectChipOption[];
  onChange: (selectedValues: string[]) => void;
  /**
   * Single-select only: called when the user clicks the already-selected option.
   * Useful for "edit" flows where re-selecting the same value should open a dialog.
   */
  onOptionReselect?: (value: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
  getDisplayText?: (
    selectedValues: string[],
    options: SelectChipOption[],
  ) => string;
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  minMenuWidth?: number;
  disabled?: boolean;
  showApplyButton?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  error?: boolean;
  size?: "small" | "medium";
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "warning"
    | "info"
    | "success";
  sx?: SxProps<Theme>;
  /** Whether to allow multiple selections. Default true. Set false for single-select mode with radio buttons. */
  multiple?: boolean;
}

interface MenuState {
  open: boolean;
  anchorEl: HTMLElement | null;
  pendingSelections: string[];
}

export const SelectChip = React.forwardRef<HTMLDivElement, SelectChipProps>(
  (
    {
      selectedValues,
      options,
      onChange,
      onOptionReselect,
      isLoading = false,
      emptyLabel = "Select",
      getDisplayText,
      placement = "bottom-start",
      minMenuWidth = 250,
      disabled = false,
      showApplyButton = false,
      onMenuOpen,
      onMenuClose,
      error = false,
      size,
      color,
      sx,
      multiple = true,
      ...restProps
    },
    ref,
  ) => {
    const chipRef = useRef<HTMLDivElement | null>(null);
    const popperRef = useRef<HTMLDivElement | null>(null);
    const anchorElRef = useRef<HTMLElement | null>(null);
    const [menuState, setMenuState] = React.useState<MenuState>({
      open: false,
      anchorEl: null,
      pendingSelections: selectedValues,
    });

    const selectionsChangedRef = useRef<boolean>(false);

    React.useEffect(() => {
      if (!menuState.open) {
        setMenuState((prev) => ({
          ...prev,
          pendingSelections: selectedValues,
        }));
      }
    }, [selectedValues, menuState.open]);

    const getChipLabel = useCallback((): string => {
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

    const getChipIcon = useCallback((): React.ReactElement | undefined => {
      if (selectedValues.length === 0) {
        return undefined;
      }

      const lastSelectedValue = selectedValues[selectedValues.length - 1];
      const selectedOption = options.find((opt) => opt.value === lastSelectedValue);
      return (selectedOption?.icon as React.ReactElement) || undefined;
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

    const toggleOption = useCallback(
      (value: string) => {
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
      },
      [multiple],
    );

    const handleApply = useCallback(() => {
      onChange(menuState.pendingSelections);
      handleCloseMenu();
    }, [menuState.pendingSelections, onChange, handleCloseMenu]);

    const handleOptionChange = useCallback(
      (value: string) => {
        selectionsChangedRef.current = true;
        toggleOption(value);
      },
      [toggleOption],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          handleCloseMenu();
        }
      },
      [handleCloseMenu],
    );

    React.useEffect(() => {
      if (!menuState.open) {
        return;
      }

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;

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

    React.useImperativeHandle(ref, () => chipRef.current as HTMLDivElement);

    const chipLabel = getChipLabel();
    const chipIcon = getChipIcon();
    const isOpen = menuState.open;

    const baseChipSx = (
      color === "default" || !color
        ? {
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }
        : {}
    ) satisfies SxProps<Theme>;

    const mergedChipSx = mergeSx(baseChipSx, sx);

    const renderOptionLabel = (option: SelectChipOption) => {
      const content = (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            width: "100%",
          }}
        >
          {option.icon && <Box sx={{ display: "flex" }}>{option.icon}</Box>}
          <span>{option.label}</span>
          {option.endIcon && (
            <Box
              sx={{
                display: "flex",
                ml: "auto",
                alignItems: "center",
              }}
            >
              {option.endIcon}
            </Box>
          )}
        </Box>
      );

      if (!option.tooltip) {
        return content;
      }

      return (
        <Tooltip title={option.tooltip} arrow placement="left">
          <Box sx={{ width: "100%" }}>{content}</Box>
        </Tooltip>
      );
    };

    return (
      <>
        <Chip
          ref={chipRef}
          label={chipLabel}
          icon={chipIcon}
          onClick={() => {
            if (isOpen) {
              handleCloseMenu();
            } else {
              handleOpenMenu();
            }
          }}
          variant="filled"
          disabled={disabled || isLoading}
          deleteIcon={<ExpandMoreIcon />}
          onDelete={(e) => {
            e.stopPropagation();
            if (isOpen) {
              handleCloseMenu();
            } else {
              handleOpenMenu();
            }
          }}
          size={size}
          color={error ? "error" : color}
          sx={mergedChipSx}
          {...restProps}
        />

        <Popper
          open={isOpen}
          anchorEl={anchorElRef.current}
          placement={placement}
          modifiers={[
            { name: "offset", options: { offset: [0, 8] } },
            { name: "preventOverflow", options: { padding: 8 } },
          ]}
          onKeyDown={handleKeyDown}
          style={{ zIndex: 1400 }}
        >
          <Paper
            ref={popperRef}
            sx={{
              p: 1.5,
              minWidth: minMenuWidth,
              maxWidth: 400,
              maxHeight: 400,
              overflowY: "auto",
              zIndex: 1400,
              boxShadow: (theme) => theme.shadows[8],
            }}
          >
            <Stack spacing={0.5}>
              {options.length === 0 ? (
                <Box sx={{ p: 1, textAlign: "center", color: "text.secondary" }}>
                  No options available
                </Box>
              ) : !multiple ? (
                <RadioGroup
                  value={menuState.pendingSelections[0] || ""}
                  onChange={(e) => {
                    handleOptionChange(e.target.value);
                    if (!showApplyButton) {
                      setTimeout(() => handleCloseMenu(), 100);
                    }
                  }}
                >
                  {options.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      onClick={(e) => {
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
                      }}
                      control={<Radio disabled={isLoading || option.disabled} size="small" />}
                      label={renderOptionLabel(option)}
                      disabled={isLoading || option.disabled}
                      sx={{
                        m: 0,
                        width: "100%",
                        "&:hover": {
                          backgroundColor: option.disabled ? "transparent" : "action.hover",
                        },
                        borderRadius: 0.5,
                        pl: 0.5,
                        ...(option.rowSx || {}),
                      }}
                    />
                  ))}
                </RadioGroup>
              ) : (
                options.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={menuState.pendingSelections.includes(option.value)}
                        onChange={() => handleOptionChange(option.value)}
                        disabled={isLoading || option.disabled}
                        size="small"
                      />
                    }
                    label={renderOptionLabel(option)}
                    disabled={isLoading || option.disabled}
                    sx={{
                      m: 0,
                      width: "100%",
                      "&:hover": {
                        backgroundColor: option.disabled ? "transparent" : "action.hover",
                      },
                      borderRadius: 0.5,
                      pl: 0.5,
                      ...(option.rowSx || {}),
                    }}
                  />
                ))
              )}
            </Stack>

            {showApplyButton && menuState.pendingSelections.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Button
                  fullWidth
                  size="small"
                  onClick={handleApply}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
                >
                  {isLoading ? "Applying..." : "Apply"}
                </Button>
              </>
            )}
          </Paper>
        </Popper>
      </>
    );
  },
);

SelectChip.displayName = "SelectChip";

export default SelectChip;
