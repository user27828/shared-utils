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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
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
import type { PickersDayProps } from "@mui/x-date-pickers/PickersDay";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RestoreIcon from "@mui/icons-material/Restore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import TodayIcon from "@mui/icons-material/Today";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import EditIcon from "@mui/icons-material/Edit";

import {
  format,
  isToday,
  isYesterday,
  subDays,
  startOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";

import type { CmsHistoryRow } from "../../../../utils/src/cms/types.js";
import type { CmsVersionMeta } from "../../../../utils/src/cms/types.js";
import CmsVersionNotesForm from "./CmsVersionNotesForm.js";

// ─── Constants ────────────────────────────────────────────────────────────

/** Drawer width in pixels. Exported so the parent can coordinate layout. */
export const HISTORY_DRAWER_WIDTH = 340;

/** How long (ms) the flash highlight persists before fading. */
const FLASH_HOLD_MS = 900;

/** CSS transition duration for the flash fade-out. */
const FLASH_FADE_MS = "400ms";

// ─── Props ────────────────────────────────────────────────────────────────

export interface CmsHistoryDrawerProps {
  /** Whether the drawer panel is expanded. */
  open: boolean;
  /** Called when the user clicks the close button. */
  onClose: () => void;
  /** Complete history array (may include soft-deleted rows). */
  history: CmsHistoryRow[];
  /** ID of the revision currently loaded for preview, or null. */
  loadedRevisionId: number | null;
  /** Whether the editor form has unsaved changes. */
  isDirty: boolean;
  /** Whether a save / restore operation is in progress. */
  isSaving: boolean;
  /** Whether soft-deleted revisions should be visible. */
  includeSoftDeleted: boolean;
  /** Toggle for the soft-deleted visibility. */
  onIncludeSoftDeletedChange: (value: boolean) => void;
  /** Preview a revision in the form without writing to the server. */
  onLoadRevision: (historyId: number) => void;
  /** Restore a revision on the server (creates a new version). */
  onRestoreRevision: (historyId: number) => void;
  /** Soft-delete a revision. */
  onSoftDeleteRevision: (historyId: number) => void;
  /** Permanently delete a revision. */
  onHardDeleteRevision: (historyId: number) => void;
  /** Dismiss the loaded revision and return to the live version. */
  onDismissRevision: () => void;
  /** Head version number (shown in the "(Current)" entry). */
  currentVersionNumber?: number;
  /** Head `updated_at` ISO string. */
  currentUpdatedAt?: string;
  /** Called to update version metadata on a history revision. */
  onUpdateHistoryMeta?: (
    historyId: number,
    data: { version: string; notes: string },
  ) => Promise<void>;
  /** Current head version metadata (for the "(Current)" entry label). */
  currentVersionMeta?: CmsVersionMeta | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** YYYY-MM-DD key for date grouping / comparison. */
const toDateKey = (d: Date): string => format(d, "yyyy-MM-dd");

/** Human-friendly date label (Today / Yesterday / full date). */
const dateLabel = (d: Date): string => {
  if (isToday(d)) {
    return "Today";
  }
  if (isYesterday(d)) {
    return "Yesterday";
  }
  return format(d, "MMM d, yyyy");
};

/** Grouped history structure used for rendering. */
interface DateGroup {
  dateKey: string;
  date: Date;
  items: CmsHistoryRow[];
}

// ─── Custom PickersDay with revision-dot badge ────────────────────────────

interface RevisionDayProps extends PickersDayProps {
  revisionDates?: Set<string>;
}

const RevisionDay = React.memo<RevisionDayProps>(function RevisionDay(props) {
  const { revisionDates, day, outsideCurrentMonth, ...rest } = props;
  const hasRevision =
    !outsideCurrentMonth && revisionDates?.has(toDateKey(day as Date));

  return (
    <Badge
      key={String(day)}
      overlap="circular"
      variant="dot"
      invisible={!hasRevision}
      color="primary"
      sx={{
        "& .MuiBadge-dot": {
          width: 5,
          height: 5,
          minWidth: 5,
          bottom: 2,
          right: "50%",
          transform: "translateX(50%)",
        },
      }}
    >
      <PickersDay
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        {...rest}
      />
    </Badge>
  );
});

// ─── Component ────────────────────────────────────────────────────────────

const CmsHistoryDrawer: React.FC<CmsHistoryDrawerProps> = React.memo(
  ({
    open,
    onClose,
    history,
    loadedRevisionId,
    isDirty,
    isSaving,
    includeSoftDeleted,
    onIncludeSoftDeletedChange,
    onLoadRevision,
    onRestoreRevision,
    onSoftDeleteRevision,
    onHardDeleteRevision,
    onDismissRevision,
    currentVersionNumber,
    currentUpdatedAt,
    onUpdateHistoryMeta,
    currentVersionMeta,
  }) => {
    const theme = useTheme();
    /** true = push mode (desktop), false = overlay mode (mobile) */
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const timelineRef = useRef<HTMLDivElement>(null);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    /** Date-key of the group currently flash-highlighted (null = none). */
    const [flashKey, setFlashKey] = useState<string | null>(null);

    /** History revision currently being annotated (version/notes edit). */
    const [editingMetaId, setEditingMetaId] = useState<number | null>(null);
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
    const flashBg = useMemo(
      () => alpha(theme.palette.primary.main, 0.14),
      [theme.palette.primary.main],
    );

    // ── Filtered history ────────────────────────────────────────────────
    const filteredHistory = useMemo(() => {
      if (includeSoftDeleted) {
        return history;
      }
      return history.filter((h) => !h.soft_deleted_at);
    }, [history, includeSoftDeleted]);

    // ── Date grouping (newest-first) ───────────────────────────────────
    const groupedByDate = useMemo<DateGroup[]>(() => {
      const map = new Map<string, CmsHistoryRow[]>();

      for (const h of filteredHistory) {
        const key = h.created_at
          ? toDateKey(new Date(h.created_at))
          : "unknown";
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(h);
      }

      return [...map.keys()]
        .sort((a, b) => b.localeCompare(a))
        .map((key) => {
          const items = map.get(key)!;
          items.sort(
            (a, b) => (b.revision ?? b.id ?? 0) - (a.revision ?? a.id ?? 0),
          );
          return {
            dateKey: key,
            date: key === "unknown" ? new Date(0) : new Date(key + "T00:00:00"),
            items,
          };
        });
    }, [filteredHistory]);

    // ── Dates with revisions (for calendar badges) ─────────────────────
    const revisionDates = useMemo(() => {
      const s = new Set<string>();
      for (const h of filteredHistory) {
        if (h.created_at) {
          s.add(toDateKey(new Date(h.created_at)));
        }
      }
      return s;
    }, [filteredHistory]);

    // ── Memoised slotProps for DateCalendar (avoids full re-render) ────
    const calendarSlotProps = useMemo(
      () => ({
        day: { revisionDates } as Partial<RevisionDayProps>,
      }),
      [revisionDates],
    );

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
    const shouldDisableDate = useCallback(
      (day: Date) => !revisionDates.has(toDateKey(day)),
      [revisionDates],
    );

    // ── Scroll timeline to a date-keyed group ──────────────────────────
    const scrollToDate = useCallback((targetKey: string) => {
      if (!timelineRef.current) {
        return;
      }
      const el = timelineRef.current.querySelector(
        `[data-date-key="${targetKey}"]`,
      );
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
    const handleDateChange = useCallback(
      (date: Date | null) => {
        setSelectedDate(date);
        if (date) {
          scrollToDate(toDateKey(date));
        }
      },
      [scrollToDate],
    );

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
    const getSnapshotVersionMeta = useCallback(
      (h: CmsHistoryRow): CmsVersionMeta | null => {
        const snap = h.snapshot as Record<string, unknown> | null;
        if (!snap || typeof snap !== "object") {
          return null;
        }
        const meta = snap.metadata as Record<string, unknown> | null;
        if (!meta || typeof meta !== "object") {
          return null;
        }
        const v = meta.version as CmsVersionMeta | null;
        if (!v || typeof v !== "object") {
          return null;
        }
        if (!v.version && !v.notes) {
          return null;
        }
        return v;
      },
      [],
    );

    /** Chip display label for a revision — version name or "Rev N". */
    const getRevisionLabel = useCallback(
      (h: CmsHistoryRow): string => {
        const vm = getSnapshotVersionMeta(h);
        if (vm?.version) {
          return vm.version;
        }
        return `Rev ${h.revision ?? h.id}`;
      },
      [getSnapshotVersionMeta],
    );

    /** Handle saving version meta on a history revision. */
    const handleSaveHistoryMeta = useCallback(
      async (historyId: number, data: { version: string; notes: string }) => {
        if (!onUpdateHistoryMeta) {
          return;
        }
        setEditMetaSaving(true);
        try {
          await onUpdateHistoryMeta(historyId, data);
          setEditingMetaId(null);
        } finally {
          setEditMetaSaving(false);
        }
      },
      [onUpdateHistoryMeta],
    );

    // ── Dot colour helper ──────────────────────────────────────────────
    const getDotColor = useCallback(
      (
        h: CmsHistoryRow,
        isLastOverall: boolean,
      ): "primary" | "success" | "grey" | "error" => {
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
      },
      [loadedRevisionId],
    );

    // ── Transition config ──────────────────────────────────────────────
    const transitionDuration = open
      ? theme.transitions.duration.enteringScreen
      : theme.transitions.duration.leavingScreen;
    const transitionEasing = open
      ? theme.transitions.easing.easeOut
      : theme.transitions.easing.sharp;

    // ── Render ─────────────────────────────────────────────────────────
    return (
      <Box
        component="aside"
        role="complementary"
        aria-label="Revision history"
        sx={{
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
        }}
      >
        <Box
          sx={{
            width: HISTORY_DRAWER_WIDTH,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            // Distinct right edge: subtle shadow instead of a thin divider
            borderRight: 2,
            borderColor:
              theme.palette.mode === "dark" ? "grey.700" : "grey.300",
            boxShadow:
              theme.palette.mode === "dark"
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
          }}
        >
          {/* ── Header ─────────────────────────────────────────── */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: 1.5,
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.default",
              flexShrink: 0,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              History
            </Typography>
            <Tooltip title="Collapse history">
              <IconButton
                size="small"
                onClick={onClose}
                aria-label="Collapse history drawer"
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Lazy-mount: skip expensive subtree until first open */}
          {hasOpened && (
            <>
              {/* ── Calendar ───────────────────────────────────────── */}
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  flexShrink: 0,
                  "& .MuiDateCalendar-root": {
                    width: "100%",
                    maxHeight: 280,
                  },
                }}
              >
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateCalendar
                    value={selectedDate}
                    onChange={handleDateChange}
                    views={["day"]}
                    slots={{
                      day: RevisionDay as React.ComponentType<PickersDayProps>,
                    }}
                    slotProps={calendarSlotProps}
                    shouldDisableDate={shouldDisableDate}
                    minDate={calendarMinDate}
                    maxDate={calendarMaxDate}
                    sx={{
                      "& .MuiPickersDay-root": { fontSize: "0.75rem" },
                      "& .Mui-disabled:not(.Mui-selected)": {
                        color: "text.disabled",
                      },
                    }}
                  />
                </LocalizationProvider>
              </Box>

              {/* ── Quick nav ──────────────────────────────────────── */}
              <Stack
                direction="row"
                sx={{
                  px: 1,
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              >
                <ButtonGroup size="small" variant="outlined" fullWidth>
                  <Tooltip title="Jump to earliest revision">
                    <Button
                      startIcon={<SkipPreviousIcon />}
                      onClick={handleNavFirst}
                      disabled={groupedByDate.length === 0}
                      sx={{ fontSize: "0.7rem", textTransform: "none" }}
                    >
                      First
                    </Button>
                  </Tooltip>
                  <Button
                    onClick={handleNavYesterday}
                    sx={{ fontSize: "0.7rem", textTransform: "none" }}
                  >
                    Yesterday
                  </Button>
                  <Tooltip title="Jump to today">
                    <Button
                      startIcon={<TodayIcon />}
                      onClick={handleNavToday}
                      sx={{ fontSize: "0.7rem", textTransform: "none" }}
                    >
                      Today
                    </Button>
                  </Tooltip>
                </ButtonGroup>
              </Stack>

              {/* ── Controls row ───────────────────────────────────── */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 1,
                  py: 0.5,
                  borderBottom: 1,
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={includeSoftDeleted}
                      onChange={(_, v) => onIncludeSoftDeletedChange(v)}
                    />
                  }
                  label={
                    <Typography variant="caption">Show deleted</Typography>
                  }
                />
                <Typography variant="caption" color="text.secondary">
                  {filteredHistory.length} rev
                  {filteredHistory.length !== 1 ? "s" : ""}
                </Typography>
              </Stack>

              {/* ── Scrollable timeline area ───────────────────────── */}
              <Box
                ref={timelineRef}
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  pr: 0.5,
                }}
              >
                {/* (Current) entry */}
                {currentVersionNumber != null && (
                  <Box sx={{ px: 1, pt: 1.5, pb: 0.5 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
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
                      }}
                      onClick={loadedRevisionId ? onDismissRevision : undefined}
                    >
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          bgcolor: isDirty ? "warning.main" : "success.main",
                          flexShrink: 0,
                        }}
                      />
                      <Stack sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <Chip
                            label={
                              currentVersionMeta?.version
                                ? currentVersionMeta.version
                                : `Rev ${currentVersionNumber}`
                            }
                            size="small"
                            color="success"
                            variant="filled"
                            sx={{
                              height: 22,
                              fontSize: "0.72rem",
                              fontWeight: 600,
                            }}
                          />
                        </Stack>
                        {currentVersionMeta?.notes && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              mt: 0.25,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: "0.68rem",
                              fontStyle: "italic",
                            }}
                          >
                            {currentVersionMeta.notes.length > 60
                              ? `${currentVersionMeta.notes.slice(0, 60)}…`
                              : currentVersionMeta.notes}
                          </Typography>
                        )}
                        {currentUpdatedAt && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.25 }}
                          >
                            {format(
                              new Date(currentUpdatedAt),
                              "MMM d, h:mm a",
                            )}
                          </Typography>
                        )}
                      </Stack>
                      <Stack spacing={0.5} alignItems="flex-end">
                        {isDirty && (
                          <Chip
                            label="Unsaved"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                        )}
                        <Chip
                          label="Current"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.65rem" }}
                        />
                        {loadedRevisionId && (
                          <Tooltip title="Return to current version">
                            <IconButton size="small">
                              <VisibilityIcon
                                fontSize="small"
                                color="primary"
                              />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                )}

                {/* Empty state */}
                {filteredHistory.length === 0 && (
                  <Box sx={{ px: 1.5, py: 4, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      No revision history yet
                    </Typography>
                  </Box>
                )}

                {/* Date-grouped timeline */}
                {groupedByDate.map((group, gi) => (
                  <Box
                    key={group.dateKey}
                    data-date-key={group.dateKey}
                    sx={{
                      // Flash highlight: instant on, smooth fade off
                      bgcolor:
                        flashKey === group.dateKey ? flashBg : "transparent",
                      transition: `background-color ${FLASH_FADE_MS} ease-out`,
                      borderRadius: 1,
                    }}
                  >
                    {/* Sticky date header */}
                    <Typography
                      variant="overline"
                      sx={{
                        display: "block",
                        px: 1.5,
                        pt: gi === 0 ? 1.5 : 2,
                        pb: 0.5,
                        color: "text.secondary",
                        fontWeight: 600,
                        lineHeight: 1.5,
                        bgcolor:
                          flashKey === group.dateKey
                            ? "transparent"
                            : "background.paper",
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                      }}
                    >
                      {dateLabel(group.date)}
                    </Typography>

                    <Timeline
                      sx={{
                        p: 0,
                        m: 0,
                        pl: 0.5,
                        "& .MuiTimelineItem-root:before": {
                          display: "none",
                        },
                      }}
                    >
                      {group.items.map((h, hi) => {
                        const isLoaded = loadedRevisionId === h.id;
                        const isSoftDeleted = !!h.soft_deleted_at;
                        const isLastInGroup = hi === group.items.length - 1;
                        const isLastOverall =
                          isLastInGroup && gi === groupedByDate.length - 1;

                        return (
                          <TimelineItem key={h.id} sx={{ minHeight: "auto" }}>
                            <TimelineSeparator>
                              <TimelineDot
                                color={getDotColor(h, isLastOverall)}
                                variant={isLoaded ? "filled" : "outlined"}
                                sx={{
                                  my: 0.5,
                                  ...(isLoaded && {
                                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                                  }),
                                }}
                              />
                              {!isLastOverall && <TimelineConnector />}
                            </TimelineSeparator>

                            <TimelineContent sx={{ py: 0.5, pl: 1, pr: 0.5 }}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                                sx={{
                                  p: 0.75,
                                  borderRadius: 1,
                                  ...(isLoaded && {
                                    bgcolor: alpha(
                                      theme.palette.primary.main,
                                      0.08,
                                    ),
                                    border: 1,
                                    borderColor: alpha(
                                      theme.palette.primary.main,
                                      0.3,
                                    ),
                                  }),
                                }}
                              >
                                {/* Revision info */}
                                <Stack sx={{ flex: 1, minWidth: 0 }}>
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    alignItems="center"
                                  >
                                    <Chip
                                      label={getRevisionLabel(h)}
                                      size="small"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: "0.7rem" }}
                                    />
                                    {isSoftDeleted && (
                                      <Chip
                                        label="deleted"
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: "0.65rem" }}
                                      />
                                    )}
                                    {isLoaded && (
                                      <Chip
                                        label="loaded"
                                        size="small"
                                        color="primary"
                                        sx={{ height: 20, fontSize: "0.65rem" }}
                                      />
                                    )}
                                    {onUpdateHistoryMeta &&
                                      editingMetaId !== h.id && (
                                        <Tooltip title="Edit version label / notes">
                                          <IconButton
                                            size="small"
                                            onClick={() =>
                                              setEditingMetaId(h.id!)
                                            }
                                            sx={{ p: 0.25 }}
                                          >
                                            <EditIcon
                                              sx={{ fontSize: "0.85rem" }}
                                            />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                  </Stack>
                                  {(() => {
                                    const vm = getSnapshotVersionMeta(h);
                                    return vm?.notes ? (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                          mt: 0.25,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          fontSize: "0.68rem",
                                          fontStyle: "italic",
                                        }}
                                      >
                                        {vm.notes.length > 50
                                          ? `${vm.notes.slice(0, 50)}…`
                                          : vm.notes}
                                      </Typography>
                                    ) : null;
                                  })()}
                                  {editingMetaId === h.id &&
                                    onUpdateHistoryMeta && (
                                      <Box sx={{ mt: 0.5, mb: 0.5 }}>
                                        <CmsVersionNotesForm
                                          initialVersion={
                                            getSnapshotVersionMeta(h)
                                              ?.version ?? ""
                                          }
                                          initialNotes={
                                            getSnapshotVersionMeta(h)?.notes ??
                                            ""
                                          }
                                          isSaving={editMetaSaving}
                                          onSave={(data) =>
                                            handleSaveHistoryMeta(h.id!, data)
                                          }
                                          onCancel={() =>
                                            setEditingMetaId(null)
                                          }
                                          saveLabel="Update"
                                        />
                                      </Box>
                                    )}
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 0.25 }}
                                  >
                                    {h.created_at
                                      ? format(
                                          new Date(h.created_at),
                                          "h:mm:ss a",
                                        )
                                      : "\u2014"}
                                  </Typography>
                                  {(h as any).created_by_email && (
                                    <Typography
                                      variant="caption"
                                      color="text.disabled"
                                      sx={{
                                        fontSize: "0.65rem",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {(h as any).created_by_email}
                                    </Typography>
                                  )}
                                </Stack>

                                {/* Action buttons */}
                                <Stack direction="row" spacing={0}>
                                  <Tooltip
                                    title={
                                      isLoaded
                                        ? "Currently loaded"
                                        : "Load revision (preview)"
                                    }
                                  >
                                    <span>
                                      <IconButton
                                        size="small"
                                        onClick={() => onLoadRevision(h.id!)}
                                        disabled={isLoaded || isSaving}
                                        color={isLoaded ? "primary" : "default"}
                                      >
                                        <VisibilityIcon
                                          sx={{ fontSize: "1rem" }}
                                        />
                                      </IconButton>
                                    </span>
                                  </Tooltip>

                                  <Tooltip title="Restore revision (save to server)">
                                    <span>
                                      <IconButton
                                        size="small"
                                        onClick={() => onRestoreRevision(h.id!)}
                                        disabled={isSaving}
                                      >
                                        <RestoreIcon
                                          sx={{ fontSize: "1rem" }}
                                        />
                                      </IconButton>
                                    </span>
                                  </Tooltip>

                                  <Tooltip
                                    title={
                                      (h as any).snapshot
                                        ? `Snapshot: ${Object.keys((h as any).snapshot || {}).length} fields`
                                        : "Revision info"
                                    }
                                  >
                                    <IconButton size="small">
                                      <InfoOutlinedIcon
                                        sx={{ fontSize: "1rem" }}
                                      />
                                    </IconButton>
                                  </Tooltip>

                                  {!isSoftDeleted ? (
                                    <Tooltip title="Soft-delete revision">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            onSoftDeleteRevision(h.id!)
                                          }
                                          disabled={isSaving}
                                        >
                                          <DeleteIcon
                                            sx={{ fontSize: "1rem" }}
                                          />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title="Permanently delete">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            onHardDeleteRevision(h.id!)
                                          }
                                          disabled={isSaving}
                                        >
                                          <DeleteForeverIcon
                                            sx={{ fontSize: "1rem" }}
                                          />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  )}
                                </Stack>
                              </Stack>
                            </TimelineContent>
                          </TimelineItem>
                        );
                      })}
                    </Timeline>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Box>
    );
  },
);

CmsHistoryDrawer.displayName = "CmsHistoryDrawer";

export default CmsHistoryDrawer;
