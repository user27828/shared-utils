import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useState, useCallback, useMemo, useRef } from "react";
import { SpeedDial, SpeedDialAction, SpeedDialIcon, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Box, Typography, Fade, Tooltip, Popper, Paper, ClickAwayListener, MenuList, } from "@mui/material";
import { ContactPhone as ContactPhoneIcon, CalendarMonth as CalendarIcon, PersonAdd as PersonAddIcon, Google as GoogleIcon, Microsoft as MicrosoftIcon, Apple as AppleIcon, Download as DownloadIcon, MoreHoriz as MoreHorizIcon, ChevronRight as ChevronRightIcon, Link as LinkIcon, VideoCall as VideoCallIcon, } from "@mui/icons-material";
import { canGenerateVCard, canScheduleMeeting, downloadVCard, buildMeetingEvent, openCalendarEvent, } from "../../../utils/index.js";
const CALENDAR_PROVIDERS = [
    { key: "google", label: "Google Calendar", icon: _jsx(GoogleIcon, { fontSize: "small", color: "error" }) },
    { key: "outlook", label: "Outlook", icon: _jsx(MicrosoftIcon, { fontSize: "small", color: "primary" }) },
    { key: "apple", label: "Apple Calendar", icon: _jsx(AppleIcon, { fontSize: "small" }) },
    { key: "yahoo", label: "Yahoo Calendar", icon: _jsx(CalendarIcon, { fontSize: "small", color: "secondary" }) },
    { key: "ics", label: "Download .ics", icon: _jsx(DownloadIcon, { fontSize: "small", color: "action" }) },
];
// ============================================================================
// Component
// ============================================================================
const ContactActions = ({ contact, variant = "speedDial", iconSize = "small", direction = "up", sx, meetingDescriptionSuffix, speedDialInline = false, meetingLinks, onAction, onMenuClose, }) => {
    // Sub-menu state (for calendar provider picker)
    const [calMenuAnchor, setCalMenuAnchor] = useState(null);
    // SpeedDial open state
    const [dialOpen, setDialOpen] = useState(false);
    // iconButton anchor
    const [iconMenuAnchor, setIconMenuAnchor] = useState(null);
    // Cascading meeting-link sub-menu state
    const [linkMenuProvider, setLinkMenuProvider] = useState(null);
    const linkMenuAnchorRef = useRef(null);
    const linkMenuTimerRef = useRef(null);
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
    const handleOpenCalendarMenu = useCallback((e) => {
        setCalMenuAnchor(e.currentTarget);
    }, []);
    /**
     * Schedule a calendar event, optionally with a meeting link.
     */
    const scheduleEvent = useCallback((provider, link) => {
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
    }, [contact, meetingDescriptionSuffix, onAction, onMenuClose, closeAll]);
    /**
     * Direct calendar selection (no meeting link).
     * Used when there are no meetingLinks, or when user clicks "No link".
     */
    const handleCalendarSelect = useCallback((provider) => {
        scheduleEvent(provider);
    }, [scheduleEvent]);
    /**
     * Calendar selection with a specific meeting link.
     */
    const handleCalendarWithLink = useCallback((provider, link) => {
        scheduleEvent(provider, link);
    }, [scheduleEvent]);
    const handleCalMenuClose = useCallback(() => {
        setCalMenuAnchor(null);
        setLinkMenuProvider(null);
        linkMenuAnchorRef.current = null;
    }, []);
    // ------ Cascading link sub-menu hover handlers ------
    const handleProviderMouseEnter = useCallback((provider, el) => {
        if (linkMenuTimerRef.current) {
            clearTimeout(linkMenuTimerRef.current);
            linkMenuTimerRef.current = null;
        }
        linkMenuAnchorRef.current = el;
        setLinkMenuProvider(provider);
    }, []);
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
    const calendarSubMenu = (_jsxs(Menu, { anchorEl: calMenuAnchor, open: Boolean(calMenuAnchor), onClose: handleCalMenuClose, TransitionComponent: Fade, slotProps: {
            paper: {
                elevation: 4,
                sx: { minWidth: 200 },
            },
        }, children: [_jsx(Box, { sx: {
                    px: 2,
                    py: 0.75,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }, children: _jsx(Typography, { variant: "caption", color: "text.secondary", children: "Choose calendar" }) }), CALENDAR_PROVIDERS.map((p) => (_jsxs(MenuItem, { onClick: () => handleCalendarSelect(p.key), onMouseEnter: hasLinks
                    ? (e) => handleProviderMouseEnter(p.key, e.currentTarget)
                    : undefined, onMouseLeave: hasLinks ? handleProviderMouseLeave : undefined, sx: hasLinks ? { display: "flex", justifyContent: "space-between" } : undefined, children: [_jsx(ListItemIcon, { children: p.icon }), _jsx(ListItemText, { children: p.label }), hasLinks && (_jsx(ChevronRightIcon, { fontSize: "small", sx: { ml: 1, opacity: 0.5 }, onClick: (e) => e.stopPropagation() }))] }, p.key)))] }));
    // ------ Cascading meeting-link Popper ------
    const linkSubMenu = linkMenuProvider && hasLinks && linkMenuAnchorRef.current ? (_jsx(Popper, { open: true, anchorEl: linkMenuAnchorRef.current, placement: "right-start", style: { zIndex: 1500 }, modifiers: [
            { name: "offset", options: { offset: [0, -4] } },
            { name: "flip", enabled: true },
            { name: "preventOverflow", enabled: true, options: { boundary: "viewport" } },
        ], children: _jsx(Paper, { elevation: 6, sx: { minWidth: 220, maxWidth: 360 }, onMouseEnter: handleLinkMenuMouseEnter, onMouseLeave: handleLinkMenuMouseLeave, children: _jsx(ClickAwayListener, { onClickAway: () => { setLinkMenuProvider(null); }, children: _jsxs(MenuList, { dense: true, children: [_jsx(Box, { sx: { px: 2, py: 0.5, borderBottom: "1px solid", borderColor: "divider" }, children: _jsx(Typography, { variant: "caption", color: "text.secondary", children: "Include meeting link" }) }), meetingLinks.map((link, idx) => (_jsxs(MenuItem, { onClick: () => handleCalendarWithLink(linkMenuProvider, link), children: [_jsx(ListItemIcon, { children: _jsx(VideoCallIcon, { fontSize: "small" }) }), _jsx(ListItemText, { primary: link.label, secondary: link.value.length > 40
                                        ? `${link.value.substring(0, 40)}...`
                                        : link.value, primaryTypographyProps: { variant: "body2", noWrap: true }, secondaryTypographyProps: { variant: "caption", noWrap: true } })] }, `${link.providerKey}-${idx}`))), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: () => handleCalendarSelect(linkMenuProvider), children: [_jsx(ListItemIcon, { children: _jsx(LinkIcon, { fontSize: "small", color: "disabled" }) }), _jsx(ListItemText, { children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "No meeting link" }) })] })] }) }) }) })) : null;
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
        return (_jsxs(_Fragment, { children: [_jsx(Divider, {}), _jsx(Tooltip, { title: vcardTooltip, placement: "right", arrow: true, children: _jsx("span", { children: _jsxs(MenuItem, { onClick: handleDownloadVCard, disabled: !vcardEnabled, children: [_jsx(ListItemIcon, { children: _jsx(PersonAddIcon, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Add to Contacts" })] }) }) }), _jsx(Tooltip, { title: meetingTooltip, placement: "right", arrow: true, children: _jsx("span", { children: _jsxs(MenuItem, { onClick: handleOpenCalendarMenu, disabled: !meetingEnabled, children: [_jsx(ListItemIcon, { children: _jsx(CalendarIcon, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Schedule Meeting" })] }) }) }), calendarSubMenu, linkSubMenu] }));
    }
    // ====================================================================
    // Variant: iconButton — small icon with dropdown actions
    // ====================================================================
    if (variant === "iconButton") {
        return (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: anyEnabled ? "Contact actions" : "Add contact info to enable", children: _jsx("span", { children: _jsx(IconButton, { size: iconSize, onClick: (e) => setIconMenuAnchor(e.currentTarget), disabled: !anyEnabled, children: _jsx(ContactPhoneIcon, { fontSize: iconSize }) }) }) }), _jsxs(Menu, { anchorEl: iconMenuAnchor, open: Boolean(iconMenuAnchor), onClose: () => setIconMenuAnchor(null), TransitionComponent: Fade, slotProps: {
                        paper: {
                            elevation: 3,
                            sx: { minWidth: 200 },
                        },
                    }, children: [_jsx(Tooltip, { title: vcardTooltip, placement: "right", arrow: true, children: _jsx("span", { children: _jsxs(MenuItem, { onClick: handleDownloadVCard, disabled: !vcardEnabled, children: [_jsx(ListItemIcon, { children: _jsx(PersonAddIcon, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Add to Contacts" })] }) }) }), _jsx(Tooltip, { title: meetingTooltip, placement: "right", arrow: true, children: _jsx("span", { children: _jsxs(MenuItem, { onClick: handleOpenCalendarMenu, disabled: !meetingEnabled, children: [_jsx(ListItemIcon, { children: _jsx(CalendarIcon, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Schedule Meeting" })] }) }) })] }), calendarSubMenu, linkSubMenu] }));
    }
    // ====================================================================
    // Variant: speedDial (default)
    // ====================================================================
    return (_jsxs(Box, { sx: {
            position: "relative",
            ...(speedDialInline && {
                display: "inline-flex",
                alignItems: "center",
                // Constrain height to the FAB so it participates correctly in a
                // flex row (e.g. DialogActions alongside Cancel/Save buttons).
                height: 40,
            }),
            ...sx,
        }, children: [_jsxs(SpeedDial, { ariaLabel: "Contact actions", icon: _jsx(SpeedDialIcon, { icon: _jsx(ContactPhoneIcon, {}), openIcon: _jsx(MoreHorizIcon, {}) }), open: dialOpen, onOpen: () => {
                    if (anyEnabled) {
                        setDialOpen(true);
                    }
                }, onClose: () => setDialOpen(false), direction: direction, sx: speedDialInline
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
                    : undefined, FabProps: {
                    size: "small",
                    disabled: !anyEnabled,
                    color: "primary",
                    sx: { width: 40, height: 40 },
                }, children: [_jsx(SpeedDialAction, { icon: _jsx(PersonAddIcon, {}), tooltipTitle: vcardTooltip, onClick: handleDownloadVCard, FabProps: { disabled: !vcardEnabled, size: "small" } }), _jsx(SpeedDialAction, { icon: _jsx(CalendarIcon, {}), tooltipTitle: meetingTooltip, onClick: handleOpenCalendarMenu, FabProps: { disabled: !meetingEnabled, size: "small" } })] }), calendarSubMenu, linkSubMenu] }));
};
export default ContactActions;
