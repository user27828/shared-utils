import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * CMS History Drawer — shared-utils
 *
 * Flex-based persistent sidebar for browsing, loading, and restoring
 * CMS revision history. Sits alongside the edit page content within a
 * flex container — no viewport-level position:fixed.
 *
 * Features:
 *  - DateCalendar with dot badges on dates that have revisions
 *  - Quick-nav buttons (First / Yesterday / Today)
 *  - MUI Lab Timeline with colour-coded dots
 *  - Load (preview) vs Restore (server write) per revision
 *  - Soft-deleted revision visibility toggle
 *  - Scroll-to-date with flash highlight animation
 *  - Lazy mount: heavy content only renders after first open
 *  - Light / dark mode aware via MUI theme
 */
import React, { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { Badge, Box, Button, ButtonGroup, Checkbox, Chip, FormControlLabel, IconButton, Stack, Tooltip, Typography, useMediaQuery, useTheme, } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RestoreIcon from "@mui/icons-material/Restore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import TodayIcon from "@mui/icons-material/Today";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import EditIcon from "@mui/icons-material/Edit";
import { format, isToday, isYesterday, subDays, startOfDay, startOfMonth, endOfMonth, } from "date-fns";
import CmsVersionNotesForm from "./CmsVersionNotesForm.js";
// ─── Constants ────────────────────────────────────────────────────────────
/** Drawer width in pixels. Exported so the parent can coordinate layout. */
export const HISTORY_DRAWER_WIDTH = 340;
/** How long (ms) the flash highlight persists before fading. */
const FLASH_HOLD_MS = 900;
/** CSS transition duration for the flash fade-out. */
const FLASH_FADE_MS = "400ms";
// ─── Helpers ──────────────────────────────────────────────────────────────
/** YYYY-MM-DD key for date grouping / comparison. */
const toDateKey = (d) => format(d, "yyyy-MM-dd");
/** Human-friendly date label (Today / Yesterday / full date). */
const dateLabel = (d) => {
    if (isToday(d)) {
        return "Today";
    }
    if (isYesterday(d)) {
        return "Yesterday";
    }
    return format(d, "MMM d, yyyy");
};
const RevisionDay = React.memo(function RevisionDay(props) {
    const { revisionDates, day, outsideCurrentMonth, ...rest } = props;
    const hasRevision = !outsideCurrentMonth && revisionDates?.has(toDateKey(day));
    return (_jsx(Badge, { overlap: "circular", variant: "dot", invisible: !hasRevision, color: "primary", sx: {
            "& .MuiBadge-dot": {
                width: 5,
                height: 5,
                minWidth: 5,
                bottom: 2,
                right: "50%",
                transform: "translateX(50%)",
            },
        }, children: _jsx(PickersDay, { day: day, outsideCurrentMonth: outsideCurrentMonth, ...rest }) }, String(day)));
});
// ─── Component ────────────────────────────────────────────────────────────
const CmsHistoryDrawer = React.memo(({ open, onClose, history, loadedRevisionId, isDirty, isSaving, includeSoftDeleted, onIncludeSoftDeletedChange, onLoadRevision, onRestoreRevision, onSoftDeleteRevision, onHardDeleteRevision, onDismissRevision, currentVersionNumber, currentUpdatedAt, onUpdateHistoryMeta, currentVersionMeta, }) => {
    const theme = useTheme();
    /** true = push mode (desktop), false = overlay mode (mobile) */
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const timelineRef = useRef(null);
    const flashTimerRef = useRef(null);
    const [selectedDate, setSelectedDate] = useState(null);
    /** Date-key of the group currently flash-highlighted (null = none). */
    const [flashKey, setFlashKey] = useState(null);
    /** History revision currently being annotated (version/notes edit). */
    const [editingMetaId, setEditingMetaId] = useState(null);
    const [editMetaSaving, setEditMetaSaving] = useState(false);
    /** Lazy mount: avoid rendering expensive content until first open. */
    const [hasOpened, setHasOpened] = useState(open);
    useEffect(() => {
        if (open && !hasOpened) {
            setHasOpened(true);
        }
    }, [open, hasOpened]);
    // Clean up flash timer on unmount
    useEffect(() => {
        return () => {
            if (flashTimerRef.current) {
                clearTimeout(flashTimerRef.current);
            }
        };
    }, []);
    // ── Flash highlight colour (theme-aware) ───────────────────────────
    const flashBg = useMemo(() => alpha(theme.palette.primary.main, 0.14), [theme.palette.primary.main]);
    // ── Filtered history ────────────────────────────────────────────────
    const filteredHistory = useMemo(() => {
        if (includeSoftDeleted) {
            return history;
        }
        return history.filter((h) => !h.soft_deleted_at);
    }, [history, includeSoftDeleted]);
    // ── Date grouping (newest-first) ───────────────────────────────────
    const groupedByDate = useMemo(() => {
        const map = new Map();
        for (const h of filteredHistory) {
            const key = h.created_at
                ? toDateKey(new Date(h.created_at))
                : "unknown";
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(h);
        }
        return [...map.keys()]
            .sort((a, b) => b.localeCompare(a))
            .map((key) => {
            const items = map.get(key);
            items.sort((a, b) => (b.revision ?? b.id ?? 0) - (a.revision ?? a.id ?? 0));
            return {
                dateKey: key,
                date: key === "unknown" ? new Date(0) : new Date(key + "T00:00:00"),
                items,
            };
        });
    }, [filteredHistory]);
    // ── Dates with revisions (for calendar badges) ─────────────────────
    const revisionDates = useMemo(() => {
        const s = new Set();
        for (const h of filteredHistory) {
            if (h.created_at) {
                s.add(toDateKey(new Date(h.created_at)));
            }
        }
        return s;
    }, [filteredHistory]);
    // ── Memoised slotProps for DateCalendar (avoids full re-render) ────
    const calendarSlotProps = useMemo(() => ({
        day: { revisionDates },
    }), [revisionDates]);
    // ── Calendar date bounds from history ──────────────────────────────
    /** Earliest and latest history dates — clamp calendar to this range. */
    const { calendarMinDate, calendarMaxDate } = useMemo(() => {
        if (filteredHistory.length === 0) {
            return { calendarMinDate: undefined, calendarMaxDate: undefined };
        }
        let earliest = Infinity;
        let latest = -Infinity;
        for (const h of filteredHistory) {
            if (h.created_at) {
                const t = new Date(h.created_at).getTime();
                if (t < earliest) {
                    earliest = t;
                }
                if (t > latest) {
                    latest = t;
                }
            }
        }
        // Expand to full months so the calendar doesn't cut off mid-month
        return {
            calendarMinDate: startOfMonth(new Date(earliest)),
            calendarMaxDate: endOfMonth(new Date(latest)),
        };
    }, [filteredHistory]);
    /** Disable days that have no revisions (but keep them visible). */
    const shouldDisableDate = useCallback((day) => !revisionDates.has(toDateKey(day)), [revisionDates]);
    // ── Scroll timeline to a date-keyed group ──────────────────────────
    const scrollToDate = useCallback((targetKey) => {
        if (!timelineRef.current) {
            return;
        }
        const el = timelineRef.current.querySelector(`[data-date-key="${targetKey}"]`);
        if (!el) {
            return;
        }
        // Scroll so the group is near the bottom of the visible area
        el.scrollIntoView({ behavior: "smooth", block: "end" });
        // Flash highlight: set immediately, clear after FLASH_HOLD_MS
        // (the CSS transition on the group handles the fade-out)
        if (flashTimerRef.current) {
            clearTimeout(flashTimerRef.current);
        }
        setFlashKey(targetKey);
        flashTimerRef.current = setTimeout(() => {
            setFlashKey(null);
            flashTimerRef.current = null;
        }, FLASH_HOLD_MS);
    }, []);
    // ── Calendar date change ───────────────────────────────────────────
    const handleDateChange = useCallback((date) => {
        setSelectedDate(date);
        if (date) {
            scrollToDate(toDateKey(date));
        }
    }, [scrollToDate]);
    // ── Quick-nav handlers ─────────────────────────────────────────────
    const handleNavToday = useCallback(() => {
        const d = startOfDay(new Date());
        setSelectedDate(d);
        scrollToDate(toDateKey(d));
    }, [scrollToDate]);
    const handleNavYesterday = useCallback(() => {
        const d = startOfDay(subDays(new Date(), 1));
        setSelectedDate(d);
        scrollToDate(toDateKey(d));
    }, [scrollToDate]);
    const handleNavFirst = useCallback(() => {
        if (groupedByDate.length === 0) {
            return;
        }
        const oldest = groupedByDate[groupedByDate.length - 1];
        setSelectedDate(oldest.date);
        scrollToDate(oldest.dateKey);
    }, [groupedByDate, scrollToDate]);
    // ── Version meta helpers ───────────────────────────────────────────
    /** Extract version metadata from a history row's snapshot. */
    const getSnapshotVersionMeta = useCallback((h) => {
        const snap = h.snapshot;
        if (!snap || typeof snap !== "object") {
            return null;
        }
        const meta = snap.metadata;
        if (!meta || typeof meta !== "object") {
            return null;
        }
        const v = meta.version;
        if (!v || typeof v !== "object") {
            return null;
        }
        if (!v.version && !v.notes) {
            return null;
        }
        return v;
    }, []);
    /** Chip display label for a revision — version name or "Rev N". */
    const getRevisionLabel = useCallback((h) => {
        const vm = getSnapshotVersionMeta(h);
        if (vm?.version) {
            return vm.version;
        }
        return `Rev ${h.revision ?? h.id}`;
    }, [getSnapshotVersionMeta]);
    /** Handle saving version meta on a history revision. */
    const handleSaveHistoryMeta = useCallback(async (historyId, data) => {
        if (!onUpdateHistoryMeta) {
            return;
        }
        setEditMetaSaving(true);
        try {
            await onUpdateHistoryMeta(historyId, data);
            setEditingMetaId(null);
        }
        finally {
            setEditMetaSaving(false);
        }
    }, [onUpdateHistoryMeta]);
    // ── Dot colour helper ──────────────────────────────────────────────
    const getDotColor = useCallback((h, isLastOverall) => {
        if (h.soft_deleted_at) {
            return "error";
        }
        if (loadedRevisionId === h.id) {
            return "primary";
        }
        if (isLastOverall) {
            return "primary";
        }
        return "grey";
    }, [loadedRevisionId]);
    // ── Transition config ──────────────────────────────────────────────
    const transitionDuration = open
        ? theme.transitions.duration.enteringScreen
        : theme.transitions.duration.leavingScreen;
    const transitionEasing = open
        ? theme.transitions.easing.easeOut
        : theme.transitions.easing.sharp;
    // ── Render ─────────────────────────────────────────────────────────
    return (_jsx(Box, { component: "aside", role: "complementary", "aria-label": "Revision history", sx: {
            // Desktop (push mode): takes space in flex layout
            // Mobile (overlay mode): overlays via absolute positioning
            ...(isDesktop
                ? {
                    width: open ? HISTORY_DRAWER_WIDTH : 0,
                    flexShrink: 0,
                    overflow: "hidden",
                }
                : {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    zIndex: theme.zIndex.drawer,
                    width: open ? HISTORY_DRAWER_WIDTH : 0,
                    overflow: "hidden",
                    pointerEvents: open ? "auto" : "none",
                }),
            transition: theme.transitions.create("width", {
                easing: transitionEasing,
                duration: transitionDuration,
            }),
        }, children: _jsxs(Box, { sx: {
                width: HISTORY_DRAWER_WIDTH,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                // Distinct right edge: subtle shadow instead of a thin divider
                borderRight: 2,
                borderColor: theme.palette.mode === "dark" ? "grey.700" : "grey.300",
                boxShadow: theme.palette.mode === "dark"
                    ? `3px 0 10px -2px ${alpha(theme.palette.common.black, 0.5)}`
                    : `3px 0 10px -2px ${alpha(theme.palette.common.black, 0.08)}`,
                bgcolor: "background.paper",
                transform: open
                    ? "translateX(0)"
                    : `translateX(-${HISTORY_DRAWER_WIDTH}px)`,
                transition: theme.transitions.create("transform", {
                    easing: transitionEasing,
                    duration: transitionDuration,
                }),
            }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", sx: {
                        px: 1.5,
                        py: 1,
                        borderBottom: 1,
                        borderColor: "divider",
                        bgcolor: "background.default",
                        flexShrink: 0,
                    }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 600 }, children: "History" }), _jsx(Tooltip, { title: "Collapse history", children: _jsx(IconButton, { size: "small", onClick: onClose, "aria-label": "Collapse history drawer", children: _jsx(ChevronLeftIcon, { fontSize: "small" }) }) })] }), hasOpened && (_jsxs(_Fragment, { children: [_jsx(Box, { sx: {
                                borderBottom: 1,
                                borderColor: "divider",
                                flexShrink: 0,
                                "& .MuiDateCalendar-root": {
                                    width: "100%",
                                    maxHeight: 280,
                                },
                            }, children: _jsx(LocalizationProvider, { dateAdapter: AdapterDateFns, children: _jsx(DateCalendar, { value: selectedDate, onChange: handleDateChange, views: ["day"], slots: {
                                        day: RevisionDay,
                                    }, slotProps: calendarSlotProps, shouldDisableDate: shouldDisableDate, minDate: calendarMinDate, maxDate: calendarMaxDate, sx: {
                                        "& .MuiPickersDay-root": { fontSize: "0.75rem" },
                                        "& .Mui-disabled:not(.Mui-selected)": {
                                            color: "text.disabled",
                                        },
                                    } }) }) }), _jsx(Stack, { direction: "row", sx: {
                                px: 1,
                                py: 1,
                                borderBottom: 1,
                                borderColor: "divider",
                                flexShrink: 0,
                            }, children: _jsxs(ButtonGroup, { size: "small", variant: "outlined", fullWidth: true, children: [_jsx(Tooltip, { title: "Jump to earliest revision", children: _jsx(Button, { startIcon: _jsx(SkipPreviousIcon, {}), onClick: handleNavFirst, disabled: groupedByDate.length === 0, sx: { fontSize: "0.7rem", textTransform: "none" }, children: "First" }) }), _jsx(Button, { onClick: handleNavYesterday, sx: { fontSize: "0.7rem", textTransform: "none" }, children: "Yesterday" }), _jsx(Tooltip, { title: "Jump to today", children: _jsx(Button, { startIcon: _jsx(TodayIcon, {}), onClick: handleNavToday, sx: { fontSize: "0.7rem", textTransform: "none" }, children: "Today" }) })] }) }), _jsxs(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", sx: {
                                px: 1,
                                py: 0.5,
                                borderBottom: 1,
                                borderColor: "divider",
                                flexShrink: 0,
                            }, children: [_jsx(FormControlLabel, { control: _jsx(Checkbox, { size: "small", checked: includeSoftDeleted, onChange: (_, v) => onIncludeSoftDeletedChange(v) }), label: _jsx(Typography, { variant: "caption", children: "Show deleted" }) }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [filteredHistory.length, " rev", filteredHistory.length !== 1 ? "s" : ""] })] }), _jsxs(Box, { ref: timelineRef, sx: {
                                flex: 1,
                                overflowY: "auto",
                                overflowX: "hidden",
                                pr: 0.5,
                            }, children: [currentVersionNumber != null && (_jsx(Box, { sx: { px: 1, pt: 1.5, pb: 0.5 }, children: _jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: {
                                            p: 1,
                                            borderRadius: 1,
                                            cursor: loadedRevisionId ? "pointer" : "default",
                                            border: 1,
                                            borderColor: loadedRevisionId
                                                ? "transparent"
                                                : "success.main",
                                            bgcolor: loadedRevisionId
                                                ? "transparent"
                                                : alpha(theme.palette.success.main, 0.08),
                                            "&:hover": loadedRevisionId
                                                ? { bgcolor: "action.hover" }
                                                : {},
                                        }, onClick: loadedRevisionId ? onDismissRevision : undefined, children: [_jsx(Box, { sx: {
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: "50%",
                                                    bgcolor: isDirty ? "warning.main" : "success.main",
                                                    flexShrink: 0,
                                                } }), _jsxs(Stack, { sx: { flex: 1, minWidth: 0 }, children: [_jsx(Stack, { direction: "row", spacing: 0.5, alignItems: "center", children: _jsx(Chip, { label: currentVersionMeta?.version
                                                                ? currentVersionMeta.version
                                                                : `Rev ${currentVersionNumber}`, size: "small", color: "success", variant: "filled", sx: {
                                                                height: 22,
                                                                fontSize: "0.72rem",
                                                                fontWeight: 600,
                                                            } }) }), currentVersionMeta?.notes && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: {
                                                            mt: 0.25,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            fontSize: "0.68rem",
                                                            fontStyle: "italic",
                                                        }, children: currentVersionMeta.notes.length > 60
                                                            ? `${currentVersionMeta.notes.slice(0, 60)}…`
                                                            : currentVersionMeta.notes })), currentUpdatedAt && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 0.25 }, children: format(new Date(currentUpdatedAt), "MMM d, h:mm a") }))] }), _jsxs(Stack, { spacing: 0.5, alignItems: "flex-end", children: [isDirty && (_jsx(Chip, { label: "Unsaved", size: "small", color: "warning", variant: "outlined", sx: { height: 20, fontSize: "0.65rem" } })), _jsx(Chip, { label: "Current", size: "small", color: "success", variant: "outlined", sx: { height: 20, fontSize: "0.65rem" } }), loadedRevisionId && (_jsx(Tooltip, { title: "Return to current version", children: _jsx(IconButton, { size: "small", children: _jsx(VisibilityIcon, { fontSize: "small", color: "primary" }) }) }))] })] }) })), filteredHistory.length === 0 && (_jsx(Box, { sx: { px: 1.5, py: 4, textAlign: "center" }, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "No revision history yet" }) })), groupedByDate.map((group, gi) => (_jsxs(Box, { "data-date-key": group.dateKey, sx: {
                                        // Flash highlight: instant on, smooth fade off
                                        bgcolor: flashKey === group.dateKey ? flashBg : "transparent",
                                        transition: `background-color ${FLASH_FADE_MS} ease-out`,
                                        borderRadius: 1,
                                    }, children: [_jsx(Typography, { variant: "overline", sx: {
                                                display: "block",
                                                px: 1.5,
                                                pt: gi === 0 ? 1.5 : 2,
                                                pb: 0.5,
                                                color: "text.secondary",
                                                fontWeight: 600,
                                                lineHeight: 1.5,
                                                bgcolor: flashKey === group.dateKey
                                                    ? "transparent"
                                                    : "background.paper",
                                                position: "sticky",
                                                top: 0,
                                                zIndex: 1,
                                            }, children: dateLabel(group.date) }), _jsx(Timeline, { sx: {
                                                p: 0,
                                                m: 0,
                                                pl: 0.5,
                                                "& .MuiTimelineItem-root:before": {
                                                    display: "none",
                                                },
                                            }, children: group.items.map((h, hi) => {
                                                const isLoaded = loadedRevisionId === h.id;
                                                const isSoftDeleted = !!h.soft_deleted_at;
                                                const isLastInGroup = hi === group.items.length - 1;
                                                const isLastOverall = isLastInGroup && gi === groupedByDate.length - 1;
                                                return (_jsxs(TimelineItem, { sx: { minHeight: "auto" }, children: [_jsxs(TimelineSeparator, { children: [_jsx(TimelineDot, { color: getDotColor(h, isLastOverall), variant: isLoaded ? "filled" : "outlined", sx: {
                                                                        my: 0.5,
                                                                        ...(isLoaded && {
                                                                            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                                                                        }),
                                                                    } }), !isLastOverall && _jsx(TimelineConnector, {})] }), _jsx(TimelineContent, { sx: { py: 0.5, pl: 1, pr: 0.5 }, children: _jsxs(Stack, { direction: "row", alignItems: "center", spacing: 0.5, sx: {
                                                                    p: 0.75,
                                                                    borderRadius: 1,
                                                                    ...(isLoaded && {
                                                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                                        border: 1,
                                                                        borderColor: alpha(theme.palette.primary.main, 0.3),
                                                                    }),
                                                                }, children: [_jsxs(Stack, { sx: { flex: 1, minWidth: 0 }, children: [_jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", children: [_jsx(Chip, { label: getRevisionLabel(h), size: "small", variant: "outlined", sx: { height: 20, fontSize: "0.7rem" } }), isSoftDeleted && (_jsx(Chip, { label: "deleted", size: "small", color: "error", variant: "outlined", sx: { height: 20, fontSize: "0.65rem" } })), isLoaded && (_jsx(Chip, { label: "loaded", size: "small", color: "primary", sx: { height: 20, fontSize: "0.65rem" } })), onUpdateHistoryMeta &&
                                                                                        editingMetaId !== h.id && (_jsx(Tooltip, { title: "Edit version label / notes", children: _jsx(IconButton, { size: "small", onClick: () => setEditingMetaId(h.id), sx: { p: 0.25 }, children: _jsx(EditIcon, { sx: { fontSize: "0.85rem" } }) }) }))] }), (() => {
                                                                                const vm = getSnapshotVersionMeta(h);
                                                                                return vm?.notes ? (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: {
                                                                                        mt: 0.25,
                                                                                        overflow: "hidden",
                                                                                        textOverflow: "ellipsis",
                                                                                        whiteSpace: "nowrap",
                                                                                        fontSize: "0.68rem",
                                                                                        fontStyle: "italic",
                                                                                    }, children: vm.notes.length > 50
                                                                                        ? `${vm.notes.slice(0, 50)}…`
                                                                                        : vm.notes })) : null;
                                                                            })(), editingMetaId === h.id &&
                                                                                onUpdateHistoryMeta && (_jsx(Box, { sx: { mt: 0.5, mb: 0.5 }, children: _jsx(CmsVersionNotesForm, { initialVersion: getSnapshotVersionMeta(h)
                                                                                        ?.version ?? "", initialNotes: getSnapshotVersionMeta(h)?.notes ??
                                                                                        "", isSaving: editMetaSaving, onSave: (data) => handleSaveHistoryMeta(h.id, data), onCancel: () => setEditingMetaId(null), saveLabel: "Update" }) })), _jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 0.25 }, children: h.created_at
                                                                                    ? format(new Date(h.created_at), "h:mm:ss a")
                                                                                    : "\u2014" }), h.created_by_email && (_jsx(Typography, { variant: "caption", color: "text.disabled", sx: {
                                                                                    fontSize: "0.65rem",
                                                                                    overflow: "hidden",
                                                                                    textOverflow: "ellipsis",
                                                                                    whiteSpace: "nowrap",
                                                                                }, children: h.created_by_email }))] }), _jsxs(Stack, { direction: "row", spacing: 0, children: [_jsx(Tooltip, { title: isLoaded
                                                                                    ? "Currently loaded"
                                                                                    : "Load revision (preview)", children: _jsx("span", { children: _jsx(IconButton, { size: "small", onClick: () => onLoadRevision(h.id), disabled: isLoaded || isSaving, color: isLoaded ? "primary" : "default", children: _jsx(VisibilityIcon, { sx: { fontSize: "1rem" } }) }) }) }), _jsx(Tooltip, { title: "Restore revision (save to server)", children: _jsx("span", { children: _jsx(IconButton, { size: "small", onClick: () => onRestoreRevision(h.id), disabled: isSaving, children: _jsx(RestoreIcon, { sx: { fontSize: "1rem" } }) }) }) }), _jsx(Tooltip, { title: h.snapshot
                                                                                    ? `Snapshot: ${Object.keys(h.snapshot || {}).length} fields`
                                                                                    : "Revision info", children: _jsx(IconButton, { size: "small", children: _jsx(InfoOutlinedIcon, { sx: { fontSize: "1rem" } }) }) }), !isSoftDeleted ? (_jsx(Tooltip, { title: "Soft-delete revision", children: _jsx("span", { children: _jsx(IconButton, { size: "small", color: "error", onClick: () => onSoftDeleteRevision(h.id), disabled: isSaving, children: _jsx(DeleteIcon, { sx: { fontSize: "1rem" } }) }) }) })) : (_jsx(Tooltip, { title: "Permanently delete", children: _jsx("span", { children: _jsx(IconButton, { size: "small", color: "error", onClick: () => onHardDeleteRevision(h.id), disabled: isSaving, children: _jsx(DeleteForeverIcon, { sx: { fontSize: "1rem" } }) }) }) }))] })] }) })] }, h.id));
                                            }) })] }, group.dateKey)))] })] }))] }) }));
});
CmsHistoryDrawer.displayName = "CmsHistoryDrawer";
export default CmsHistoryDrawer;
