/**
 * Specialized chip component to display determinate or indeterminate process status
 * with optional progress indicators (linear or circular) and percentage display.
 */
import React from "react";
import {
  Chip,
  type ChipProps,
  CircularProgress,
  LinearProgress,
  type LinearProgressProps,
  type CircularProgressProps,
  Box,
  Divider,
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

export interface ProcessStatusChipProps extends Omit<ChipProps, "label"> {
  /** Raw status value (not transformed) */
  status: string;
  /** Pre-computed display label (via getStatusTextOverride) */
  label: string;
  /** Pre-computed chip color (via getStatusMuiColor) */
  color?: ChipProps["color"];
  /** Array of final statuses where no progress indicator is shown */
  finalStatuses: string[];
  /** Progress percentage (0-100 = determinate, null/undefined = indeterminate) */
  percentage?: number | null;
  /** Show percentage text with divider */
  showPercentage?: boolean;
  /** Placement of percentage text (only for linear progress) */
  linearPercentagePlacement?: "left" | "right";
  /** Progress indicator placement */
  placement?: "top" | "bottom" | "left" | "right";
  /** Props forwarded to LinearProgress or CircularProgress */
  progressProps?: Partial<LinearProgressProps | CircularProgressProps>;
}

const ProcessStatusChip: React.FC<ProcessStatusChipProps> = ({
  status,
  label,
  color = "default",
  finalStatuses,
  percentage,
  showPercentage = false,
  linearPercentagePlacement = "left",
  placement = "bottom",
  progressProps = {},
  size = "medium",
  sx,
  ...chipProps
}) => {
  const isFinalStatus =
    finalStatuses &&
    finalStatuses.length > 0 &&
    finalStatuses.map((s) => s.toLowerCase()).includes(status.toLowerCase());

  const isDeterminate =
    typeof percentage === "number" && percentage >= 0 && percentage <= 100;
  const progressValue = isDeterminate ? percentage : undefined;

  const isLinearProgress = placement === "top" || placement === "bottom";
  const isCircularProgress = placement === "left" || placement === "right";

  const shouldShowPercentage = showPercentage && size !== "small";

  const chipLabel =
    shouldShowPercentage && percentage !== null && percentage !== undefined ? (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          flexDirection: "row",
        }}
      >
        {linearPercentagePlacement === "left" && (
          <>
            <Box
              component="span"
              sx={{
                fontSize: "0.85em",
                fontStyle: "italic",
                opacity: 0.8,
              }}
            >
              {Math.round(percentage)}%
            </Box>
            <Divider orientation="vertical" flexItem sx={{ my: 0.25 }} />
          </>
        )}
        <span>{label}</span>
        {linearPercentagePlacement === "right" && (
          <>
            <Divider orientation="vertical" flexItem sx={{ my: 0.25 }} />
            <Box
              component="span"
              sx={{
                fontSize: "0.85em",
                fontStyle: "italic",
                opacity: 0.8,
              }}
            >
              {Math.round(percentage)}%
            </Box>
          </>
        )}
      </Box>
    ) : (
      label
    );

  const renderCircularProgress = () => {
    if (isFinalStatus || !isCircularProgress) {
      return null;
    }

    const circularSize = size === "small" ? 14 : 18;

    return (
      <CircularProgress
        size={circularSize}
        variant={isDeterminate ? "determinate" : "indeterminate"}
        value={progressValue}
        {...(progressProps as CircularProgressProps)}
        sx={(progressProps as CircularProgressProps).sx}
      />
    );
  };

  const renderLinearProgress = () => {
    if (isFinalStatus) {
      return null;
    }

    const linearProgressSx = {
      height: "1px",
      backgroundColor: "transparent",
      "& .MuiLinearProgress-bar": {
        height: "1px !important",
      },
      "& .MuiLinearProgress-bar1Indeterminate": {
        height: "1px !important",
      },
      "& .MuiLinearProgress-bar2Indeterminate": {
        height: "1px !important",
      },
    } satisfies SxProps<Theme>;

    const extraSx = (progressProps as LinearProgressProps).sx;
    const mergedLinearSx: LinearProgressProps["sx"] = mergeSx(
      linearProgressSx,
      extraSx,
    );

    return (
      <Box
        component="span"
        sx={{
          position: "absolute",
          left: "8px",
          right: "8px",
          height: "2px",
          ...(placement === "top" ? { top: 0 } : { bottom: 0 }),
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <LinearProgress
          variant={isDeterminate ? "determinate" : "indeterminate"}
          value={progressValue}
          {...(progressProps as LinearProgressProps)}
          sx={mergedLinearSx}
        />
      </Box>
    );
  };

  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-block",
        overflow: "hidden",
      }}
    >
      <Chip
        label={chipLabel}
        color={color}
        size={size}
        sx={mergeSx(
          {
            position: "relative",
            overflow: "hidden",
            ...(color === "default" && {
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
            }),
          } satisfies SxProps<Theme>,
          sx,
        )}
        icon={
          placement === "left" ? renderCircularProgress() || undefined : undefined
        }
        deleteIcon={
          placement === "right"
            ? renderCircularProgress() || undefined
            : undefined
        }
        onDelete={
          placement === "right" && !isFinalStatus && isCircularProgress
            ? () => {}
            : undefined
        }
        {...chipProps}
      />
      {!isFinalStatus && isLinearProgress && renderLinearProgress()}
    </Box>
  );
};

export default ProcessStatusChip;
