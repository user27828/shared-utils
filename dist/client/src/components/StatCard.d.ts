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
import { type TypographyProps } from "@mui/material";
/** Numeric breakdown mirroring the API shape */
export interface StatBreakdownValue {
    total: number;
    recruiter: number;
    consumer: number;
}
/** Placement positions for the corner action */
export type CornerPlacement = "top-right" | "top-left" | "bottom-right" | "bottom-left";
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
declare const StatCard: React.FC<StatCardProps>;
export default StatCard;
//# sourceMappingURL=StatCard.d.ts.map