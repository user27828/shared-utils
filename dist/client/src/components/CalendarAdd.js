import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Component for adding calendar items from a menu.  Supports the major calendar platforms.
 *
 * Delegates URL/ICS generation to the shared `contact` utility
 * (`utils/src/contact.ts`) — this component is purely presentational.
 */
import React, { useState } from "react";
import { Button, Box, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Fade, } from "@mui/material";
import { EventNote as EventNoteIcon, ExpandMore as ExpandMoreIcon, Apple as AppleIcon, Google as GoogleIcon, Microsoft as MicrosoftIcon, CalendarMonth as CalendarIcon, Info as InfoIcon, Lock as LockIcon, Download as DownloadIcon, } from "@mui/icons-material";
import { openCalendarEvent, DEFAULT_CALENDAR_CONFIG, } from "../../../utils/index.js";
/**
 * Re-export DEFAULT_CALENDAR_CONFIG for backwards compatibility.
 * @deprecated Import from `@user27828/shared-utils` (utils) instead.
 */
export { DEFAULT_CALENDAR_CONFIG } from "../../../utils/index.js";
/**
 * Adding events to various calendar services
 *
 * @param {Object} props - Component props
 * @param {Object} props.event - Event details object
 * @param {string} props.event.title - Event title
 * @param {string} props.event.description - Event description (can be HTML)
 * @param {string|Date} props.event.startDate - Event start date
 * @param {string} [props.event.location] - Event location or URL
 * @param {number} [props.event.duration] - Event duration in minutes
 * @param {string} [props.event.id] - Unique identifier for the event
 * @param {boolean} [props.requireAuth] - Whether authentication is required for calendar access
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {Function} props.onAuthRequired - Callback when authentication is required
 * @param {Object} [props.calendarConfig] - Calendar configuration options
 * @param {string} [props.calendarConfig.timezone] - Timezone for the event
 * @param {string} [props.calendarConfig.timezoneName] - Human-readable timezone name
 * @param {number} [props.calendarConfig.defaultDuration] - Default duration in minutes
 * @param {Object} [props.buttonProps] - Props to pass to the Button component
 * @param {boolean} [props.iconOnly] - If true, renders only the icon without button text
 * @returns {React.JSX.Element}
 * @component
 */
const CalendarAdd = ({ event, requireAuth = false, isAuthenticated, onAuthRequired, calendarConfig = DEFAULT_CALENDAR_CONFIG, buttonProps = {}, iconOnly = false, }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const handleClick = (event) => {
        if (requireAuth && !isAuthenticated) {
            onAuthRequired("calendar feature");
            return;
        }
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const handleAddToCalendar = (provider) => {
        if (!event) {
            return;
        }
        handleClose();
        openCalendarEvent(provider, event, calendarConfig);
    };
    // Render an IconButton if iconOnly is true
    if (iconOnly) {
        return (_jsxs(_Fragment, { children: [_jsx(EventNoteIcon, { onClick: handleClick }), _jsxs(Menu, { anchorEl: anchorEl, open: open, onClose: handleClose, MenuListProps: {
                        "aria-labelledby": "calendar-button",
                    }, PaperProps: {
                        elevation: 3,
                        sx: {
                            mt: 1,
                            borderRadius: 2,
                            width: 220,
                        },
                    }, TransitionComponent: Fade, children: [_jsx(Box, { sx: {
                                px: 2,
                                py: 1,
                                borderBottom: "1px solid",
                                borderColor: "divider",
                            }, children: _jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Choose Calendar Type" }) }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("google"), children: [_jsx(ListItemIcon, { children: _jsx(GoogleIcon, { fontSize: "small", color: "error" }) }), _jsx(ListItemText, { children: "Google Calendar" })] }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("outlook"), children: [_jsx(ListItemIcon, { children: _jsx(MicrosoftIcon, { fontSize: "small", color: "primary" }) }), _jsx(ListItemText, { children: "Outlook" })] }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("apple"), children: [_jsx(ListItemIcon, { children: _jsx(AppleIcon, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Apple Calendar" })] }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("yahoo"), children: [_jsx(ListItemIcon, { children: _jsx(CalendarIcon, { fontSize: "small", color: "secondary" }) }), _jsx(ListItemText, { children: "Yahoo Calendar" })] }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("ics"), children: [_jsx(ListItemIcon, { children: _jsx(DownloadIcon, { fontSize: "small", color: "action" }) }), _jsx(ListItemText, { children: "Calendar ICS" })] }), _jsxs(Box, { sx: {
                                px: 2,
                                py: 1.5,
                                mt: 1,
                                bgcolor: "action.hover",
                                fontSize: "0.75rem",
                                color: "text.secondary",
                                display: "flex",
                                alignItems: "center",
                            }, children: [_jsx(InfoIcon, { fontSize: "inherit", sx: { mr: 0.5 } }), _jsxs(Typography, { variant: "caption", children: ["Times shown in ", calendarConfig.timezoneName] })] })] })] }));
    }
    return (_jsxs(Box, { sx: { position: "relative", display: "inline-block" }, children: [_jsx(Button, { variant: "outlined", size: "small", color: "primary", onClick: handleClick, startIcon: _jsx(EventNoteIcon, {}), endIcon: _jsx(ExpandMoreIcon, {}), disabled: requireAuth && !isAuthenticated, sx: {
                    position: "relative",
                    "&:hover": {
                        backgroundColor: isAuthenticated
                            ? "rgba(25, 118, 210, 0.04)"
                            : "transparent",
                    },
                }, ...buttonProps, children: "Add to Calendar" }), requireAuth && !isAuthenticated && (_jsx(LockIcon, { color: "action", fontSize: "small", sx: {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "background.paper",
                    borderRadius: "50%",
                    padding: "2px",
                    cursor: "pointer",
                }, onClick: () => onAuthRequired("calendar feature") })), _jsxs(Menu, { anchorEl: anchorEl, open: open, onClose: handleClose, MenuListProps: {
                    "aria-labelledby": "calendar-button",
                }, PaperProps: {
                    elevation: 3,
                    sx: {
                        mt: 1,
                        borderRadius: 2,
                        width: 220,
                    },
                }, TransitionComponent: Fade, children: [_jsx(Box, { sx: {
                            px: 2,
                            py: 1,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                        }, children: _jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Choose Calendar Type" }) }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("google"), children: [_jsx(ListItemIcon, { children: _jsx(GoogleIcon, { fontSize: "small", color: "error" }) }), _jsx(ListItemText, { children: "Google Calendar" })] }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("outlook"), children: [_jsx(ListItemIcon, { children: _jsx(MicrosoftIcon, { fontSize: "small", color: "primary" }) }), _jsx(ListItemText, { children: "Outlook" })] }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("apple"), children: [_jsx(ListItemIcon, { children: _jsx(AppleIcon, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Apple Calendar" })] }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("yahoo"), children: [_jsx(ListItemIcon, { children: _jsx(CalendarIcon, { fontSize: "small", color: "secondary" }) }), _jsx(ListItemText, { children: "Yahoo Calendar" })] }), _jsxs(MenuItem, { onClick: () => handleAddToCalendar("ics"), children: [_jsx(ListItemIcon, { children: _jsx(DownloadIcon, { fontSize: "small", color: "action" }) }), _jsx(ListItemText, { children: "Calendar ICS" })] }), _jsxs(Box, { sx: {
                            px: 2,
                            py: 1.5,
                            mt: 1,
                            bgcolor: "action.hover",
                            fontSize: "0.75rem",
                            color: "text.secondary",
                            display: "flex",
                            alignItems: "center",
                        }, children: [_jsx(InfoIcon, { fontSize: "inherit", sx: { mr: 0.5 } }), _jsxs(Typography, { variant: "caption", children: ["Times shown in ", calendarConfig.timezoneName] })] })] })] }));
};
export default CalendarAdd;
