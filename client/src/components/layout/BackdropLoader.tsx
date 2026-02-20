import React from "react";
import { Backdrop, CircularProgress, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
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

export interface BackdropLoaderProps {
  open: boolean;
  message?: string;
  /** If true, the loader will be positioned absolutely within its container instead of fixed to the viewport */
  localized?: boolean;
  /** Custom container style overrides when using localized mode */
  containerSx?: SxProps<Theme>;
  /** Custom spinner size (defaults to 60 for global, 24 for localized) */
  size?: number;
}

/**
 * Backdrop loader component that can be used globally or within specific containers.
 */
const BackdropLoader: React.FC<BackdropLoaderProps> = ({
  open,
  message = "",
  localized = false,
  containerSx,
  size,
}) => {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const spinnerSize = size ?? (localized ? 24 : 60);

  if (localized) {
    if (!open) {
      return null;
    }

    const baseLocalizedSx = {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        mode === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
      zIndex: 1,
      borderRadius: 1,
      flexDirection: "column",
      gap: 1,
    } satisfies SxProps<Theme>;

    const localizedSx = mergeSx(baseLocalizedSx, containerSx);

    return (
      <Box sx={localizedSx}>
        <CircularProgress color="primary" size={spinnerSize} />
        {message && (
          <Typography variant="caption" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Backdrop
      sx={{
        color: "primary.contrastText",
        zIndex: (t) => t.zIndex.drawer + 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
      open={open}
    >
      <CircularProgress color="primary" size={spinnerSize} />
      {message && (
        <Typography variant="h6" color="text.primary">
          {message}
        </Typography>
      )}
    </Backdrop>
  );
};

export default BackdropLoader;
