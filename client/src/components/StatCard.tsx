/**
 * StatCard component.
 *
 * Shared dashboard stat card used across apps.
 *
 * Presets:
 * - admin: Paper-based card with optional recruiter/consumer breakdown and corner action
 * - recruiter: Card-based compact metric card with optional trend indicator
 */
import React from "react";
import {
  alpha,
  useTheme,
  type SxProps,
  type Theme,
} from "@mui/material/styles";
import {
  Box,
  Card,
  CardContent,
  Paper,
  Skeleton,
  Typography,
  type TypographyProps,
} from "@mui/material";

import SplitChip, {
  type SplitChipItem,
} from "./layout/SplitChip.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Numeric breakdown mirroring the API shape */
export interface StatBreakdownValue {
  total: number;
  recruiter: number;
  consumer: number;
}

/** Placement positions for the corner action */
export type CornerPlacement =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

/** Corner action — a small clickable icon+label anchored to a card corner */
export interface CornerAction {
  /** Icon to display. Pass a React element (e.g. MUI icon) or a plain string. */
  icon: React.ReactNode | string;
  /** Optional label shown to the right of the icon */
  label?: string;
  /** URL/route to navigate to */
  href?: string;
  /** Optional custom link component (e.g. react-router Link) */
  linkComponent?: React.ElementType;
  /** Optional props for linkComponent */
  linkProps?: Record<string, unknown>;
  /** Click handler (used when no href is provided) */
  onClick?: () => void;
  /** Corner placement — defaults to "top-right" */
  placement?: CornerPlacement;
}

export type StatCardPreset = "admin" | "recruiter";
export type TrendDirection = "up" | "down" | "flat";

export interface StatCardProps {
  /** Card title/label */
  title: string;
  /** Primary value to display — either a plain string/number or a breakdown */
  value: string | number | StatBreakdownValue;
  /** Icon element rendered in the badge (admin) or icon box (recruiter) */
  icon?: React.ReactNode;
  /** Color token. Supports palette keys (e.g. "primary") or full tokens (e.g. "primary.main") */
  color?: string;
  /** Show loading skeleton / placeholder */
  loading?: boolean;
  /** Custom formatter for the primary value */
  formatValue?: (v: number | string) => string;
  /** Optional secondary content rendered below the value */
  subtitle?: React.ReactNode;

  /** Layout preset */
  preset?: StatCardPreset;

  /** Where the title is placed relative to the value (admin preset) */
  titlePlacement?: "above" | "below";
  /** Typography variant for the title (admin preset) */
  titleVariant?: TypographyProps["variant"];
  /** Typography variant for the primary value */
  valueVariant?: TypographyProps["variant"];
  /** Icon badge style (admin preset) */
  badgeVariant?: "solid" | "soft";
  /** Top row alignment (admin preset) */
  topRowAlign?: "center" | "flex-start";

  /** Optional corner action */
  cornerAction?: CornerAction;

  /** Reduce internal margins for a denser layout */
  dense?: boolean;

  /** Previous/current values for trend calculation (recruiter preset) */
  previousValue?: number;
  currentValue?: number;
  /** Trend direction override (auto-calculated if previous/current provided) */
  trend?: TrendDirection;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatNumber = (n: number): string => {
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(1)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 10_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toLocaleString();
};

const resolveColorToken = (theme: Theme, token: string): string => {
  if (!token) {
    return theme.palette.primary.main;
  }

  // Allow palette keys like "primary".
  if (!token.includes(".")) {
    const palette = (theme.palette as unknown as Record<string, unknown>)[
      token
    ] as Record<string, unknown> | undefined;
    const main = palette?.main;
    if (typeof main === "string") {
      return main;
    }
    return token;
  }

  const parts = token.split(".");
  if (parts.length === 2) {
    const [paletteKey, shade] = parts;
    const palette = (theme.palette as unknown as Record<string, unknown>)[
      paletteKey
    ] as Record<string, unknown> | undefined;
    const val = palette?.[shade];
    if (typeof val === "string") {
      return val;
    }
  }

  return token;
};

// ---------------------------------------------------------------------------
// Helpers — corner action
// ---------------------------------------------------------------------------

/** True when every char in `s` is outside basic ASCII (likely emoji) */
const isEmoji = (s: string): boolean => /^[^\x20-\x7E]+$/.test(s);

const PLACEMENT_SX: Record<CornerPlacement, object> = {
  "top-right": { top: 1, right: 4 },
  "top-left": { top: 1, left: 4 },
  "bottom-right": { bottom: 1, right: 4 },
  "bottom-left": { bottom: 1, left: 4 },
};

const CornerActionEl: React.FC<{ action: CornerAction }> = ({ action }) => {
  const placement = action.placement ?? "top-right";

  const iconEl =
    typeof action.icon === "string" ? (
      isEmoji(action.icon) ? (
        <Box
          component="span"
          sx={{ fontSize: "1rem", lineHeight: 1, userSelect: "none" }}
        >
          {action.icon}
        </Box>
      ) : (
        <Typography variant="caption" component="span">
          {action.icon}
        </Typography>
      )
    ) : (
      <Box
        component="span"
        sx={{ display: "flex", alignItems: "center", fontSize: "1rem" }}
      >
        {action.icon}
      </Box>
    );

  const content = (
    <Box
      sx={{
        position: "absolute",
        ...PLACEMENT_SX[placement],
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        opacity: 0.85,
        transition: "opacity 0.15s ease",
        "&:hover": { opacity: 1 },
        cursor: "pointer",
        textDecoration: "none",
        color: "text.secondary",
      }}
    >
      {iconEl}
      {action.label && (
        <Typography variant="caption" noWrap>
          {action.label}
        </Typography>
      )}
    </Box>
  );

  if (action.href && action.linkComponent) {
    const LinkComponent = action.linkComponent;
    const linkProps = { ...(action.linkProps || {}) } as Record<string, unknown>;

    if (typeof linkProps.to === "undefined") {
      linkProps.to = action.href;
    }

    return React.createElement(
      LinkComponent,
      {
        ...linkProps,
        style: {
          textDecoration: "none",
          color: "inherit",
          ...(linkProps.style as object),
        },
      },
      content,
    );
  }

  if (action.href) {
    return (
      <a
        href={action.href}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {content}
      </a>
    );
  }

  if (action.onClick) {
    return (
      <Box component="span" onClick={action.onClick}>
        {content}
      </Box>
    );
  }

  return content;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = "primary.main",
  loading,
  formatValue,
  subtitle,
  preset = "admin",
  titlePlacement = "below",
  titleVariant,
  valueVariant,
  badgeVariant = "solid",
  topRowAlign = "center",
  cornerAction,
  dense = false,
  previousValue,
  currentValue,
  trend: trendOverride,
}) => {
  const theme = useTheme();
  const mainColor = resolveColorToken(theme, color);

  // Resolve display values
  const isBreakdown =
    typeof value === "object" && value !== null && "total" in value;
  const displayTotal = isBreakdown
    ? (value as StatBreakdownValue).total
    : value;
  const formattedTotal = formatValue
    ? formatValue(displayTotal)
    : typeof displayTotal === "number"
      ? formatNumber(displayTotal)
      : String(displayTotal);

  // Build SplitChip items when breakdown data is available
  let splitItems: SplitChipItem[] | null = null;
  if (isBreakdown) {
    const bd = value as StatBreakdownValue;
    splitItems = [
      {
        label: `${formatNumber(bd.recruiter)} Recruiter`,
        color: "primary",
      },
      {
        label: `${formatNumber(bd.consumer)} Consumer`,
        color: "default",
      },
    ];
  }

  // Dense mode spacing
  const iconBadgePadding = dense ? 1.25 : 1.5;
  const topRowGap = dense ? 1.5 : 2;
  const splitChipMarginTop = dense ? 1 : 1.5;
  const subtitleMarginTop = dense ? 0.125 : 0.25;

  const paddingSx: Record<string, number> = dense
    ? {
        px: 2,
        pt: 2,
        pb: 2,
      }
    : {
        p: 3,
      };

  if (dense && cornerAction) {
    const placement = cornerAction.placement ?? "top-right";
    const denseOppositePadding = 1.5;

    if (placement.startsWith("top")) {
      paddingSx.pt = 3;
      paddingSx.pb = denseOppositePadding;
    }

    if (placement.startsWith("bottom")) {
      paddingSx.pb = 3;
      paddingSx.pt = denseOppositePadding;
    }
  }

  if (preset === "recruiter") {
    const calculatedTrend: TrendDirection | null = React.useMemo(() => {
      if (trendOverride) {
        return trendOverride;
      }
      if (previousValue !== undefined && currentValue !== undefined) {
        if (currentValue > previousValue) {
          return "up";
        }
        if (currentValue < previousValue) {
          return "down";
        }
        return "flat";
      }
      return null;
    }, [currentValue, previousValue, trendOverride]);

    const trendNode: React.ReactNode = (() => {
      if (!calculatedTrend) {
        return null;
      }
      const sx = { fontSize: 16 } satisfies SxProps<Theme>;
      if (calculatedTrend === "up") {
        return (
          <Box component="span" sx={{ ...sx, color: theme.palette.success.main }}>
            ▲
          </Box>
        );
      }
      if (calculatedTrend === "down") {
        return (
          <Box component="span" sx={{ ...sx, color: theme.palette.error.main }}>
            ▼
          </Box>
        );
      }
      return (
        <Box
          component="span"
          sx={{ ...sx, color: theme.palette.text.secondary }}
        >
          ▬
        </Box>
      );
    })();

    const iconNode = icon ? (
      <Box
        sx={{
          backgroundColor: alpha(mainColor, 0.1),
          borderRadius: 1,
          p: 0.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: mainColor,
        }}
      >
        {icon}
      </Box>
    ) : null;

    return (
      <Card
        sx={{
          height: "100%",
          position: "relative",
          overflow: "visible",
          borderTop: 3,
          borderTopColor: mainColor,
        }}
      >
        {cornerAction && <CornerActionEl action={cornerAction} />}
        <CardContent sx={{ py: 2, px: 2.5, "&:last-child": { pb: 2 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{
                  fontSize: "0.7rem",
                  letterSpacing: 0.5,
                  lineHeight: 1.2,
                  display: "block",
                  mb: 0.5,
                }}
                noWrap
              >
                {title}
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{
                  lineHeight: 1.1,
                  opacity: loading ? 0.5 : 1,
                }}
                noWrap
              >
                {loading ? "—" : formattedTotal}
              </Typography>
              {subtitle && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                  noWrap
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 0.5,
                pl: 1,
              }}
            >
              {iconNode}
              {trendNode}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // admin preset
  const badgeBg = badgeVariant === "soft" ? alpha(mainColor, 0.12) : mainColor;
  const badgeFg =
    badgeVariant === "soft" ? mainColor : theme.palette.common.white;

  const resolvedTitleVariant = titleVariant || "body2";
  const resolvedValueVariant = valueVariant || "h4";

  return (
    <Paper
      sx={{
        ...paddingSx,
        display: "flex",
        flexDirection: "column",
        justifyContent:
          dense && Boolean(splitItems) ? "space-between" : "flex-start",
        height: "100%",
        position: "relative",
      }}
    >
      {cornerAction && <CornerActionEl action={cornerAction} />}
      {/* Top row: icon + value */}
      <Box sx={{ display: "flex", alignItems: topRowAlign, gap: topRowGap }}>
        {/* Icon badge */}
        {icon && (
          <Box
            sx={{
              bgcolor: badgeBg,
              color: badgeFg,
              borderRadius: 2,
              p: iconBadgePadding,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}

        {/* Primary value */}
        <Box sx={{ minWidth: 0 }}>
          {titlePlacement === "above" && (
            <Typography
              variant={resolvedTitleVariant}
              color="text.secondary"
              noWrap
            >
              {title}
            </Typography>
          )}

          {loading ? (
            <Skeleton variant="text" width={60} height={40} />
          ) : (
            <Typography
              variant={resolvedValueVariant}
              fontWeight="bold"
              noWrap
            >
              {formattedTotal}
            </Typography>
          )}

          {!loading && subtitle && (
            <Box sx={{ mt: subtitleMarginTop }}>{subtitle}</Box>
          )}

          {titlePlacement === "below" && (
            <Typography
              variant={resolvedTitleVariant}
              color="text.secondary"
              noWrap
            >
              {title}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Recruiter / Consumer breakdown chip — below both icon and value */}
      {!loading && splitItems && (
        <Box sx={{ mt: dense ? 0 : splitChipMarginTop }}>
          <SplitChip items={splitItems} variant="outlined" size="small" />
        </Box>
      )}
    </Paper>
  );
};

export default StatCard;
