/**
 * ContactActions Component
 *
 * Reusable MUI component providing contact-related quick actions:
 * - Download vCard (add to address book / contacts)
 * - Schedule meeting (calendar provider picker, optional meeting-link cascading menu)
 *
 * Supports three display variants:
 * - "speedDial"  — MUI SpeedDial (floating actions)
 * - "iconButton" — compact icon with dropdown menu
 * - "menuItems"  — returns raw MenuItem elements for embedding in a parent Menu
 *
 * When `meetingLinks` are provided, each calendar provider gains a cascading
 * hover sub-menu (Windows Start Menu style) listing the available links.
 * Selecting a link injects it as the calendar event location / description.
 *
 * Automatically disables actions when minimum required contact info is missing.
 */
import React, { useState, useCallback, useMemo, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import {
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Fade,
  Tooltip,
  Popper,
  Paper,
  ClickAwayListener,
  MenuList,
} from "@mui/material";
import {
  ContactPhone as ContactPhoneIcon,
  CalendarMonth as CalendarIcon,
  PersonAdd as PersonAddIcon,
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon,
  Apple as AppleIcon,
  Download as DownloadIcon,
  MoreHoriz as MoreHorizIcon,
  ChevronRight as ChevronRightIcon,
  Link as LinkIcon,
  VideoCall as VideoCallIcon,
} from "@mui/icons-material";
import {
  canGenerateVCard,
  canScheduleMeeting,
  downloadVCard,
  buildMeetingEvent,
  openCalendarEvent,
} from "../../../utils/index.js";
import type {
  ContactInfo,
  CalendarProvider,
  MeetingLinkEntry,
} from "../../../utils/index.js";

// ============================================================================
// Types
// ============================================================================

export type ContactActionsVariant = "speedDial" | "iconButton" | "menuItems";

export interface ContactActionsProps {
  /** Generic contact information */
  contact: ContactInfo;
  /** Display variant */
  variant?: ContactActionsVariant;
  /** Icon size for iconButton variant */
  iconSize?: "small" | "medium";
  /** SpeedDial direction */
  direction?: "up" | "down" | "left" | "right";
  /** Additional sx for the root wrapper */
  sx?: Record<string, unknown>;
  /**
   * Optional suffix appended to the default meeting description.
   * Example: "(via AgentM.com)".
   */
  meetingDescriptionSuffix?: string;
  /**
   * For the "speedDial" variant: render inline (non-fixed positioning)
   * so it can live inside toolbars / DialogActions rows.
   */
  speedDialInline?: boolean;
  /**
   * Available online meeting links (from user's profile).
   * When non-empty, each calendar provider shows a cascading hover sub-menu
   * so the user can pick which meeting link to include.
   */
  meetingLinks?: MeetingLinkEntry[];
  /** Callback fired after any action is executed */
  onAction?: (action: "vcard" | "calendar", provider?: CalendarProvider) => void;
  /**
   * For "menuItems" variant: called after an action to let the parent close
   * its own Menu.
   */
  onMenuClose?: () => void;
}

// ============================================================================
// Calendar provider menu items (shared across variants)
// ============================================================================

interface CalendarProviderItem {
  key: CalendarProvider;
  label: string;
  icon: ReactNode;
}

const CALENDAR_PROVIDERS: CalendarProviderItem[] = [
  { key: "google", label: "Google Calendar", icon: <GoogleIcon fontSize="small" color="error" /> },
  { key: "outlook", label: "Outlook", icon: <MicrosoftIcon fontSize="small" color="primary" /> },
  { key: "apple", label: "Apple Calendar", icon: <AppleIcon fontSize="small" /> },
  { key: "yahoo", label: "Yahoo Calendar", icon: <CalendarIcon fontSize="small" color="secondary" /> },
  { key: "ics", label: "Download .ics", icon: <DownloadIcon fontSize="small" color="action" /> },
];

// ============================================================================
// Component
// ============================================================================

const ContactActions: React.FC<ContactActionsProps> = ({
  contact,
  variant = "speedDial",
  iconSize = "small",
  direction = "up",
  sx,
  meetingDescriptionSuffix,
  speedDialInline = false,
  meetingLinks,
  onAction,
  onMenuClose,
}) => {
  // Sub-menu state (for calendar provider picker)
  const [calMenuAnchor, setCalMenuAnchor] = useState<HTMLElement | null>(null);
  // SpeedDial open state
  const [dialOpen, setDialOpen] = useState(false);
  // iconButton anchor
  const [iconMenuAnchor, setIconMenuAnchor] = useState<HTMLElement | null>(null);

  // Cascading meeting-link sub-menu state
  const [linkMenuProvider, setLinkMenuProvider] = useState<CalendarProvider | null>(null);
  const linkMenuAnchorRef = useRef<HTMLElement | null>(null);
  const linkMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vcardEnabled = useMemo(() => canGenerateVCard(contact), [contact]);
  const meetingEnabled = useMemo(() => canScheduleMeeting(contact), [contact]);
  const anyEnabled = vcardEnabled || meetingEnabled;

  const hasLinks = Boolean(meetingLinks && meetingLinks.length > 0);

  // ------ Close all menus helper ------

  const closeAll = useCallback(() => {
    setCalMenuAnchor(null);
    setDialOpen(false);
    setIconMenuAnchor(null);
    setLinkMenuProvider(null);
    linkMenuAnchorRef.current = null;
    if (linkMenuTimerRef.current) {
      clearTimeout(linkMenuTimerRef.current);
      linkMenuTimerRef.current = null;
    }
  }, []);

  // ------ Handlers ------

  const handleDownloadVCard = useCallback(() => {
    downloadVCard(contact);
    onAction?.("vcard");
    onMenuClose?.();
    closeAll();
  }, [contact, onAction, onMenuClose, closeAll]);

  const handleOpenCalendarMenu = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      setCalMenuAnchor(e.currentTarget);
    },
    [],
  );

  /**
   * Schedule a calendar event, optionally with a meeting link.
   */
  const scheduleEvent = useCallback(
    (provider: CalendarProvider, link?: MeetingLinkEntry) => {
      const suffix = meetingDescriptionSuffix?.trim();
      const suffixPart = suffix ? ` ${suffix}` : "";

      let description = `Scheduled meeting with ${contact.name}${suffixPart}`;
      let location = "";

      if (link) {
        // If the value looks like a URL, use it as the location field
        // (Google/Outlook/Yahoo calendar support a "location" param).
        // Also append it to the description for providers that don't.
        const isUrl = /^https?:\/\//i.test(link.value);
        if (isUrl) {
          location = link.value;
        }
        description += `\n\nMeeting link (${link.label}): ${link.value}`;
      }

      const event = buildMeetingEvent(contact, { description, location });
      openCalendarEvent(provider, event);
      onAction?.("calendar", provider);
      onMenuClose?.();
      closeAll();
    },
    [contact, meetingDescriptionSuffix, onAction, onMenuClose, closeAll],
  );

  /**
   * Direct calendar selection (no meeting link).
   * Used when there are no meetingLinks, or when user clicks "No link".
   */
  const handleCalendarSelect = useCallback(
    (provider: CalendarProvider) => {
      scheduleEvent(provider);
    },
    [scheduleEvent],
  );

  /**
   * Calendar selection with a specific meeting link.
   */
  const handleCalendarWithLink = useCallback(
    (provider: CalendarProvider, link: MeetingLinkEntry) => {
      scheduleEvent(provider, link);
    },
    [scheduleEvent],
  );

  const handleCalMenuClose = useCallback(() => {
    setCalMenuAnchor(null);
    setLinkMenuProvider(null);
    linkMenuAnchorRef.current = null;
  }, []);

  // ------ Cascading link sub-menu hover handlers ------

  const handleProviderMouseEnter = useCallback(
    (provider: CalendarProvider, el: HTMLElement) => {
      if (linkMenuTimerRef.current) {
        clearTimeout(linkMenuTimerRef.current);
        linkMenuTimerRef.current = null;
      }
      linkMenuAnchorRef.current = el;
      setLinkMenuProvider(provider);
    },
    [],
  );

  const handleProviderMouseLeave = useCallback(() => {
    // Small delay before closing to allow mouse travel to sub-menu
    linkMenuTimerRef.current = setTimeout(() => {
      setLinkMenuProvider(null);
      linkMenuAnchorRef.current = null;
    }, 200);
  }, []);

  const handleLinkMenuMouseEnter = useCallback(() => {
    // Cancel the close timer if mouse enters the cascaded menu
    if (linkMenuTimerRef.current) {
      clearTimeout(linkMenuTimerRef.current);
      linkMenuTimerRef.current = null;
    }
  }, []);

  const handleLinkMenuMouseLeave = useCallback(() => {
    linkMenuTimerRef.current = setTimeout(() => {
      setLinkMenuProvider(null);
      linkMenuAnchorRef.current = null;
    }, 200);
  }, []);

  // ------ Calendar provider sub-menu (shared) ------

  const calendarSubMenu = (
    <Menu
      anchorEl={calMenuAnchor}
      open={Boolean(calMenuAnchor)}
      onClose={handleCalMenuClose}
      TransitionComponent={Fade}
      slotProps={{
        paper: {
          elevation: 4,
          sx: { minWidth: 200 },
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Choose calendar
        </Typography>
      </Box>
      {CALENDAR_PROVIDERS.map((p) => (
        <MenuItem
          key={p.key}
          onClick={() => handleCalendarSelect(p.key)}
          onMouseEnter={
            hasLinks
              ? (e) => handleProviderMouseEnter(p.key, e.currentTarget)
              : undefined
          }
          onMouseLeave={hasLinks ? handleProviderMouseLeave : undefined}
          sx={hasLinks ? { display: "flex", justifyContent: "space-between" } : undefined}
        >
          <ListItemIcon>{p.icon}</ListItemIcon>
          <ListItemText>{p.label}</ListItemText>
          {hasLinks && (
            <ChevronRightIcon
              fontSize="small"
              sx={{ ml: 1, opacity: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </MenuItem>
      ))}
    </Menu>
  );

  // ------ Cascading meeting-link Popper ------

  const linkSubMenu = linkMenuProvider && hasLinks && linkMenuAnchorRef.current ? (
    <Popper
      open
      anchorEl={linkMenuAnchorRef.current}
      placement="right-start"
      style={{ zIndex: 1500 }}
      modifiers={[
        { name: "offset", options: { offset: [0, -4] } },
        { name: "flip", enabled: true },
        { name: "preventOverflow", enabled: true, options: { boundary: "viewport" } },
      ]}
    >
      <Paper
        elevation={6}
        sx={{ minWidth: 220, maxWidth: 360 }}
        onMouseEnter={handleLinkMenuMouseEnter}
        onMouseLeave={handleLinkMenuMouseLeave}
      >
        <ClickAwayListener onClickAway={() => { setLinkMenuProvider(null); }}>
          <MenuList dense>
            <Box sx={{ px: 2, py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                Include meeting link
              </Typography>
            </Box>
            {meetingLinks!.map((link, idx) => (
              <MenuItem
                key={`${link.providerKey}-${idx}`}
                onClick={() => handleCalendarWithLink(linkMenuProvider, link)}
              >
                <ListItemIcon>
                  <VideoCallIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={link.label}
                  secondary={
                    link.value.length > 40
                      ? `${link.value.substring(0, 40)}...`
                      : link.value
                  }
                  primaryTypographyProps={{ variant: "body2", noWrap: true }}
                  secondaryTypographyProps={{ variant: "caption", noWrap: true }}
                />
              </MenuItem>
            ))}
            <Divider />
            <MenuItem onClick={() => handleCalendarSelect(linkMenuProvider)}>
              <ListItemIcon>
                <LinkIcon fontSize="small" color="disabled" />
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2" color="text.secondary">
                  No meeting link
                </Typography>
              </ListItemText>
            </MenuItem>
          </MenuList>
        </ClickAwayListener>
      </Paper>
    </Popper>
  ) : null;

  // ------ Tooltip messages for disabled states ------

  const vcardTooltip = vcardEnabled
    ? "Download contact card (.vcf)"
    : "Add email or phone to enable";
  const meetingTooltip = meetingEnabled
    ? "Schedule a meeting"
    : "Add email to enable";

  // ====================================================================
  // Variant: menuItems — returns raw MenuItems for a parent Menu
  // ====================================================================

  if (variant === "menuItems") {
    return (
      <>
        <Divider />
        <Tooltip title={vcardTooltip} placement="right" arrow>
          <span>
            <MenuItem
              onClick={handleDownloadVCard}
              disabled={!vcardEnabled}
            >
              <ListItemIcon>
                <PersonAddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Add to Contacts</ListItemText>
            </MenuItem>
          </span>
        </Tooltip>
        <Tooltip title={meetingTooltip} placement="right" arrow>
          <span>
            <MenuItem
              onClick={handleOpenCalendarMenu}
              disabled={!meetingEnabled}
            >
              <ListItemIcon>
                <CalendarIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Schedule Meeting</ListItemText>
            </MenuItem>
          </span>
        </Tooltip>
        {calendarSubMenu}
        {linkSubMenu}
      </>
    );
  }

  // ====================================================================
  // Variant: iconButton — small icon with dropdown actions
  // ====================================================================

  if (variant === "iconButton") {
    return (
      <>
        <Tooltip title={anyEnabled ? "Contact actions" : "Add contact info to enable"}>
          <span>
            <IconButton
              size={iconSize}
              onClick={(e) => setIconMenuAnchor(e.currentTarget)}
              disabled={!anyEnabled}
            >
              <ContactPhoneIcon fontSize={iconSize} />
            </IconButton>
          </span>
        </Tooltip>
        <Menu
          anchorEl={iconMenuAnchor}
          open={Boolean(iconMenuAnchor)}
          onClose={() => setIconMenuAnchor(null)}
          TransitionComponent={Fade}
          slotProps={{
            paper: {
              elevation: 3,
              sx: { minWidth: 200 },
            },
          }}
        >
          <Tooltip title={vcardTooltip} placement="right" arrow>
            <span>
              <MenuItem
                onClick={handleDownloadVCard}
                disabled={!vcardEnabled}
              >
                <ListItemIcon>
                  <PersonAddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Add to Contacts</ListItemText>
              </MenuItem>
            </span>
          </Tooltip>
          <Tooltip title={meetingTooltip} placement="right" arrow>
            <span>
              <MenuItem
                onClick={handleOpenCalendarMenu}
                disabled={!meetingEnabled}
              >
                <ListItemIcon>
                  <CalendarIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Schedule Meeting</ListItemText>
              </MenuItem>
            </span>
          </Tooltip>
        </Menu>
        {calendarSubMenu}
        {linkSubMenu}
      </>
    );
  }

  // ====================================================================
  // Variant: speedDial (default)
  // ====================================================================

  return (
    <Box
      sx={{
        position: "relative",
        ...(speedDialInline && {
          display: "inline-flex",
          alignItems: "center",
          // Constrain height to the FAB so it participates correctly in a
          // flex row (e.g. DialogActions alongside Cancel/Save buttons).
          height: 40,
        }),
        ...sx,
      }}
    >
      <SpeedDial
        ariaLabel="Contact actions"
        icon={<SpeedDialIcon icon={<ContactPhoneIcon />} openIcon={<MoreHorizIcon />} />}
        open={dialOpen}
        onOpen={() => {
          if (anyEnabled) {
            setDialOpen(true);
          }
        }}
        onClose={() => setDialOpen(false)}
        direction={direction}
        sx={
          speedDialInline
            ? {
                position: "static",
                bottom: "auto",
                right: "auto",
                // The actions container normally sits in-flow with
                // padding-bottom: 48px and margin-bottom: -32px (for
                // direction="up"), which inflates the SpeedDial's height
                // by ~16px even when closed.  Pull it out of flow so the
                // root's height equals just the FAB.
                "& .MuiSpeedDial-actions": {
                  position: "absolute",
                  bottom: "100%",
                  paddingBottom: "8px !important",
                  marginBottom: "0 !important",
                },
              }
            : undefined
        }
        FabProps={{
          size: "small",
          disabled: !anyEnabled,
          color: "primary",
          sx: { width: 40, height: 40 },
        }}
      >
        <SpeedDialAction
          icon={<PersonAddIcon />}
          tooltipTitle={vcardTooltip}
          onClick={handleDownloadVCard}
          FabProps={{ disabled: !vcardEnabled, size: "small" }}
        />
        <SpeedDialAction
          icon={<CalendarIcon />}
          tooltipTitle={meetingTooltip}
          onClick={handleOpenCalendarMenu}
          FabProps={{ disabled: !meetingEnabled, size: "small" }}
        />
      </SpeedDial>
      {calendarSubMenu}
      {linkSubMenu}
    </Box>
  );
};

export default ContactActions;
