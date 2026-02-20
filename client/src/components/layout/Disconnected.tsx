/**
 * "Disconnected" or network error state component.
 */
import React from "react";
import { Box, Typography, Card, CardContent, Button } from "@mui/material";
import { WifiOff as WifiOffIcon } from "@mui/icons-material";
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

export interface DisconnectedProps {
  message?: string;
  onRetry?: () => void;
  sx?: SxProps<Theme>;
}

const Disconnected: React.FC<DisconnectedProps> = ({
  message = "Please check your network connection and try again.",
  onRetry,
  sx,
}) => {
  const baseRootSx = {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } satisfies SxProps<Theme>;

  const rootSx = mergeSx(baseRootSx, sx);

  return (
    <Box sx={rootSx}>
      <Card sx={{ display: "flex", maxWidth: 400 }}>
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            p: 4,
          }}
        >
          <WifiOffIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: "medium" }}>
            Connection Lost
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {message}
          </Typography>
          {onRetry && (
            <Button variant="contained" onClick={onRetry} sx={{ mt: 1 }}>
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Disconnected;
