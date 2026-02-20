/**
 * SplitChip component.
 * Displays multiple chip sections side by side with dividers in a unified chip appearance.
 */
import React from "react";
import {
  Chip,
  type ChipProps,
  Box,
  Divider,
  type DividerProps,
} from "@mui/material";
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

export interface SplitChipItem extends Omit<ChipProps, "variant"> {
  label: React.ReactNode;
  dividerColor?: string;
  customDivider?: React.ReactNode;
}

export interface SplitChipProps {
  items: SplitChipItem[];
  variant?: "filled" | "outlined";
  size?: "small" | "medium";
  dividerColor?: string;
  dividerProps?: Omit<DividerProps, "orientation" | "flexItem">;
  sx?: SxProps<Theme>;
}

const SplitChip: React.FC<SplitChipProps> = ({
  items,
  variant = "filled",
  size = "medium",
  dividerColor: defaultDividerColor = "rgba(0, 0, 0, 0.12)",
  dividerProps,
  sx,
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  if (items.length === 1) {
    return <Chip {...items[0]} variant={variant} size={size} sx={sx} />;
  }

  const baseContainerSx = {
    display: "inline-flex",
    alignItems: "center",
    overflow: "hidden",
  } satisfies SxProps<Theme>;

  const containerSx = mergeSx(baseContainerSx, sx);

  return (
    <Box sx={containerSx}>
      {items.map((item, index) => {
        const {
          label,
          sx: itemSx,
          dividerColor: itemDividerColor,
          customDivider,
          ...chipProps
        } = item;

        return (
          <React.Fragment key={index}>
            <Chip
              {...chipProps}
              label={label}
              variant={variant}
              size={size}
              sx={mergeSx(
                {
                  ...(index === 0 && {
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }),
                  ...(index === items.length - 1 && {
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                  }),
                  ...(index > 0 && index < items.length - 1 && {
                    borderRadius: 0,
                  }),
                  margin: 0,
                } satisfies SxProps<Theme>,
                itemSx,
              )}
            />

            {index < items.length - 1 && (
              <>
                {customDivider ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      alignSelf: "stretch",
                    }}
                  >
                    {customDivider}
                  </Box>
                ) : (
                  <Divider
                    orientation="vertical"
                    flexItem
                    {...(() => {
                      if (!dividerProps) {
                        return {};
                      }
                      const { sx: _sx, ...rest } = dividerProps;
                      return rest;
                    })()}
                    sx={mergeSx(
                      {
                        my: 0.5,
                        mx: 0,
                        borderColor: itemDividerColor || defaultDividerColor,
                      } satisfies SxProps<Theme>,
                      dividerProps?.sx,
                    )}
                  />
                )}
              </>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
};

export default SplitChip;
