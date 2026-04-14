import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { alpha, useTheme, } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import SplitChip from "./layout/SplitChip.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatNumber = (n) => {
    if (n >= 1000000000) {
        return `${(n / 1000000000).toFixed(1)}B`;
    }
    if (n >= 1000000) {
        return `${(n / 1000000).toFixed(1)}M`;
    }
    if (n >= 10000) {
        return `${(n / 1000).toFixed(1)}K`;
    }
    return n.toLocaleString();
};
const resolveColorToken = (theme, token) => {
    if (!token) {
        return theme.palette.primary.main;
    }
    // Allow palette keys like "primary".
    if (!token.includes(".")) {
        const palette = theme.palette[token];
        const main = palette?.main;
        if (typeof main === "string") {
            return main;
        }
        return token;
    }
    const parts = token.split(".");
    if (parts.length === 2) {
        const [paletteKey, shade] = parts;
        const palette = theme.palette[paletteKey];
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
const isEmoji = (s) => /^[^\x20-\x7E]+$/.test(s);
const PLACEMENT_SX = {
    "top-right": { top: 1, right: 4 },
    "top-left": { top: 1, left: 4 },
    "bottom-right": { bottom: 1, right: 4 },
    "bottom-left": { bottom: 1, left: 4 },
};
const CornerActionEl = ({ action }) => {
    const placement = action.placement ?? "top-right";
    const iconEl = typeof action.icon === "string" ? (isEmoji(action.icon) ? (_jsx(Box, { component: "span", sx: { fontSize: "1rem", lineHeight: 1, userSelect: "none" }, children: action.icon })) : (_jsx(Typography, { variant: "caption", component: "span", children: action.icon }))) : (_jsx(Box, { component: "span", sx: { display: "flex", alignItems: "center", fontSize: "1rem" }, children: action.icon }));
    const content = (_jsxs(Box, { sx: {
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
        }, children: [iconEl, action.label && (_jsx(Typography, { variant: "caption", noWrap: true, children: action.label }))] }));
    if (action.href && action.linkComponent) {
        const LinkComponent = action.linkComponent;
        const linkProps = { ...(action.linkProps || {}) };
        if (typeof linkProps.to === "undefined") {
            linkProps.to = action.href;
        }
        return React.createElement(LinkComponent, {
            ...linkProps,
            style: {
                textDecoration: "none",
                color: "inherit",
                ...linkProps.style,
            },
        }, content);
    }
    if (action.href) {
        return (_jsx("a", { href: action.href, style: { textDecoration: "none", color: "inherit" }, children: content }));
    }
    if (action.onClick) {
        return (_jsx(Box, { component: "span", onClick: action.onClick, children: content }));
    }
    return content;
};
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const StatCard = ({ title, value, icon, color = "primary.main", loading, formatValue, subtitle, preset = "admin", titlePlacement = "below", titleVariant, valueVariant, badgeVariant = "solid", topRowAlign = "center", cornerAction, dense = false, previousValue, currentValue, trend: trendOverride, iconPlacement, recruiterIconPlacement, }) => {
    const theme = useTheme();
    const mainColor = resolveColorToken(theme, color);
    const resolvedIconPlacement = iconPlacement ?? recruiterIconPlacement ?? "inline";
    const resolvedCornerAction = preset === "admin" &&
        resolvedIconPlacement === "corner" &&
        cornerAction &&
        !cornerAction.placement
        ? {
            ...cornerAction,
            placement: "bottom-right",
        }
        : cornerAction;
    // Resolve display values
    const isBreakdown = typeof value === "object" && value !== null && "total" in value;
    const displayTotal = isBreakdown
        ? value.total
        : value;
    const formattedTotal = formatValue
        ? formatValue(displayTotal)
        : typeof displayTotal === "number"
            ? formatNumber(displayTotal)
            : String(displayTotal);
    // Build SplitChip items when breakdown data is available
    let splitItems = null;
    if (isBreakdown) {
        const bd = value;
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
    const paddingSx = dense
        ? {
            px: 2,
            pt: 2,
            pb: 2,
        }
        : {
            p: 3,
        };
    if (dense && resolvedCornerAction) {
        const placement = resolvedCornerAction.placement ?? "top-right";
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
    if (resolvedCornerAction) {
        const placement = resolvedCornerAction.placement ?? "top-right";
        if (placement.endsWith("right")) {
            paddingSx.pr = Math.max(paddingSx.pr ?? 0, dense ? 5 : 6);
        }
    }
    if (preset === "recruiter") {
        const calculatedTrend = React.useMemo(() => {
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
        const trendNode = (() => {
            if (!calculatedTrend) {
                return null;
            }
            const sx = { fontSize: 16 };
            if (calculatedTrend === "up") {
                return (_jsx(Box, { component: "span", sx: { ...sx, color: theme.palette.success.main }, children: "\u25B2" }));
            }
            if (calculatedTrend === "down") {
                return (_jsx(Box, { component: "span", sx: { ...sx, color: theme.palette.error.main }, children: "\u25BC" }));
            }
            return (_jsx(Box, { component: "span", sx: { ...sx, color: theme.palette.text.secondary }, children: "\u25AC" }));
        })();
        const iconContent = icon ?? null;
        const inlineIconNode = iconContent ? (_jsx(Box, { sx: {
                backgroundColor: alpha(mainColor, 0.1),
                borderRadius: 1,
                p: 0.75,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: mainColor,
            }, children: iconContent })) : null;
        const cornerIconNode = iconContent ? (_jsx(Box, { "data-slot": "recruiter-corner-icon", sx: {
                position: "absolute",
                top: 0,
                right: 0,
                backgroundColor: alpha(mainColor, 0.12),
                borderTopRightRadius: `${theme.shape.borderRadius}px`,
                borderBottomLeftRadius: theme.spacing(1.5),
                borderTopLeftRadius: 0,
                borderBottomRightRadius: 0,
                px: 1.25,
                py: 1,
                minWidth: 44,
                minHeight: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: mainColor,
                boxShadow: `inset 0 0 0 1px ${alpha(mainColor, 0.08)}`,
                zIndex: 1,
            }, children: iconContent })) : null;
        const recruiterUsesCornerIcon = resolvedIconPlacement === "corner";
        const cornerTrendNode = trendNode ? (_jsx(Box, { "data-slot": "recruiter-corner-trend", sx: {
                position: "absolute",
                top: cornerIconNode ? 46 : 8,
                right: 8,
                lineHeight: 1,
                zIndex: 1,
            }, children: trendNode })) : null;
        let recruiterContentPaddingRight = 2.5;
        if (recruiterUsesCornerIcon) {
            if (cornerIconNode && cornerTrendNode) {
                recruiterContentPaddingRight = 8;
            }
            else if (cornerIconNode) {
                recruiterContentPaddingRight = 7;
            }
            else if (cornerTrendNode) {
                recruiterContentPaddingRight = 4.5;
            }
        }
        return (_jsxs(Card, { sx: {
                height: "100%",
                position: "relative",
                overflow: "visible",
                borderTop: 3,
                borderTopColor: mainColor,
            }, children: [resolvedCornerAction && _jsx(CornerActionEl, { action: resolvedCornerAction }), _jsxs(CardContent, { sx: {
                        py: 2,
                        pl: 2.5,
                        pr: recruiterContentPaddingRight,
                        position: "relative",
                        "&:last-child": { pb: 2 },
                    }, children: [recruiterUsesCornerIcon && cornerIconNode, recruiterUsesCornerIcon && cornerTrendNode, _jsxs(Box, { sx: {
                                display: "flex",
                                justifyContent: recruiterUsesCornerIcon
                                    ? "flex-start"
                                    : "space-between",
                                alignItems: "flex-start",
                            }, children: [_jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [_jsx(Typography, { variant: "overline", color: "text.secondary", sx: {
                                                fontSize: "0.7rem",
                                                letterSpacing: 0.5,
                                                lineHeight: 1.2,
                                                display: "block",
                                                mb: 0.5,
                                            }, noWrap: true, children: title }), _jsx(Typography, { variant: "h4", fontWeight: "bold", sx: {
                                                lineHeight: 1.1,
                                                opacity: loading ? 0.5 : 1,
                                            }, noWrap: true, children: loading ? "—" : formattedTotal }), subtitle && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", mt: 0.5 }, noWrap: true, children: subtitle }))] }), !recruiterUsesCornerIcon && (_jsxs(Box, { sx: {
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-end",
                                        gap: 0.5,
                                        pl: 1,
                                    }, children: [inlineIconNode, trendNode] }))] })] })] }));
    }
    // admin preset
    const badgeBg = badgeVariant === "soft" ? alpha(mainColor, 0.12) : mainColor;
    const badgeFg = badgeVariant === "soft" ? mainColor : theme.palette.common.white;
    const adminUsesCornerIcon = resolvedIconPlacement === "corner";
    const adminInlineIconNode = icon && !adminUsesCornerIcon ? (_jsx(Box, { sx: {
            bgcolor: badgeBg,
            color: badgeFg,
            borderRadius: 2,
            p: iconBadgePadding,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
        }, children: icon })) : null;
    const adminCornerIconNode = icon && adminUsesCornerIcon ? (_jsx(Box, { "data-slot": "admin-corner-icon", sx: {
            position: "absolute",
            top: 0,
            right: 0,
            bgcolor: badgeBg,
            color: badgeFg,
            borderTopRightRadius: `${theme.shape.borderRadius}px`,
            borderBottomLeftRadius: theme.spacing(1.75),
            borderTopLeftRadius: 0,
            borderBottomRightRadius: 0,
            px: dense ? 1.5 : 1.75,
            py: dense ? 1.25 : 1.5,
            minWidth: dense ? 48 : 56,
            minHeight: dense ? 48 : 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: badgeVariant === "soft"
                ? `inset 0 0 0 1px ${alpha(mainColor, 0.08)}`
                : undefined,
        }, children: icon })) : null;
    const adminTopRowGap = adminUsesCornerIcon ? 0 : topRowGap;
    const adminTopRowMinHeight = adminUsesCornerIcon ? (dense ? 48 : 56) : undefined;
    if (adminUsesCornerIcon) {
        paddingSx.pr = Math.max(paddingSx.pr ?? 0, dense ? 7 : 8);
    }
    const resolvedTitleVariant = titleVariant || "body2";
    const resolvedValueVariant = valueVariant || "h4";
    return (_jsxs(Paper, { sx: {
            ...paddingSx,
            display: "flex",
            flexDirection: "column",
            justifyContent: dense && Boolean(splitItems) ? "space-between" : "flex-start",
            height: "100%",
            position: "relative",
        }, children: [resolvedCornerAction && _jsx(CornerActionEl, { action: resolvedCornerAction }), adminCornerIconNode, _jsxs(Box, { sx: {
                    display: "flex",
                    alignItems: topRowAlign,
                    gap: adminTopRowGap,
                    minHeight: adminTopRowMinHeight,
                }, children: [adminInlineIconNode, _jsxs(Box, { sx: { minWidth: 0 }, children: [titlePlacement === "above" && (_jsx(Typography, { variant: resolvedTitleVariant, color: "text.secondary", noWrap: true, children: title })), loading ? (_jsx(Skeleton, { variant: "text", width: 60, height: 40 })) : (_jsx(Typography, { variant: resolvedValueVariant, fontWeight: "bold", noWrap: true, children: formattedTotal })), !loading && subtitle && (_jsx(Box, { sx: { mt: subtitleMarginTop }, children: subtitle })), titlePlacement === "below" && (_jsx(Typography, { variant: resolvedTitleVariant, color: "text.secondary", noWrap: true, children: title }))] })] }), !loading && splitItems && (_jsx(Box, { sx: { mt: dense ? 0 : splitChipMarginTop }, children: _jsx(SplitChip, { items: splitItems, variant: "outlined", size: "small" }) }))] }));
};
export default StatCard;
