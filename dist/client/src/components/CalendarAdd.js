import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Component for adding calendar items from a menu.  Supports the major calendar platforms
 */
import React, { useState } from "react";
import { Button, Box, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Fade, } from "@mui/material";
import { EventNote as EventNoteIcon, ExpandMore as ExpandMoreIcon, Apple as AppleIcon, Google as GoogleIcon, Microsoft as MicrosoftIcon, CalendarMonth as CalendarIcon, Info as InfoIcon, Lock as LockIcon, Download as DownloadIcon, } from "@mui/icons-material";
import { formatISO, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import DOMPurify from "dompurify";
/**
 * Calendar configuration defaults
 */
export const DEFAULT_CALENDAR_CONFIG = {
    timezone: "America/New_York",
    timezoneName: "Eastern Time",
    defaultDuration: 60, // minutes
};
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
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {Function} props.onAuthRequired - Callback when authentication is required
 * @param {Object} [props.calendarConfig] - Calendar configuration options
 * @param {string} [props.calendarConfig.timezone] - Timezone for the event
 * @param {string} [props.calendarConfig.timezoneName] - Human-readable timezone name
 * @param {number} [props.calendarConfig.defaultDuration] - Default duration in minutes
 * @param {Object} [props.buttonProps] - Props to pass to the Button component
 * @param {boolean} [props.iconOnly] - If true, renders only the icon without button text
 * @returns {JSX.Element}
 * @component
 */
const CalendarAdd = ({ event, requireAuth = false, isAuthenticated, onAuthRequired, calendarConfig = DEFAULT_CALENDAR_CONFIG, buttonProps = {}, iconOnly = false, }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    // Clean HTML content for calendar descriptions
    const cleanHtmlContent = (htmlContent) => {
        if (!htmlContent) {
            return "";
        }
        // Use DOMPurify to sanitize HTML
        const sanitized = DOMPurify.sanitize(htmlContent);
        // Create a temporary element to extract text
        const tempElement = document.createElement("div");
        tempElement.innerHTML = sanitized;
        // Get plain text
        let plainText = tempElement.textContent || tempElement.innerText || "";
        // Tidy up the text
        plainText = plainText.replace(/\s+/g, " ").trim();
        return plainText;
    };
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
        if (!event)
            return;
        // Close the menu
        handleClose();
        // Format clean title and description
        const title = encodeURIComponent(event.title);
        const description = encodeURIComponent(cleanHtmlContent(event.description) || event.title);
        // Parse the session date and convert to timezone
        const startDate = toZonedTime(new Date(event.startDate), calendarConfig.timezone);
        const duration = event.duration || calendarConfig.defaultDuration;
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
        // Location from event URL or default
        const location = encodeURIComponent(event.location || "Online Event");
        // URL for calendar based on provider
        let calendarUrl;
        switch (provider) {
            case "google":
                // Format dates for Google Calendar
                const googleStart = formatISO(startDate)
                    .replace(/[-:]/g, "")
                    .replace(/\.\d{3}/g, "");
                const googleEnd = formatISO(endDate)
                    .replace(/[-:]/g, "")
                    .replace(/\.\d{3}/g, "");
                calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${googleStart}/${googleEnd}&details=${description}&location=${location}`;
                window.open(calendarUrl, "_blank");
                break;
            case "outlook":
                // Format dates for Outlook/Microsoft calendar
                const outlookStart = formatISO(startDate);
                const outlookEnd = formatISO(endDate);
                calendarUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&body=${description}&startdt=${outlookStart}&enddt=${outlookEnd}&location=${location}`;
                window.open(calendarUrl, "_blank");
                break;
            case "apple":
            case "ics":
                // Generate ICS file content
                const icsContent = [
                    "BEGIN:VCALENDAR",
                    "VERSION:2.0",
                    "BEGIN:VEVENT",
                    `SUMMARY:${event.title}`,
                    `DTSTART:${formatISO(startDate)
                        .replace(/[-:]/g, "")
                        .replace(/\.\d{3}/g, "")}`,
                    `DTEND:${formatISO(endDate)
                        .replace(/[-:]/g, "")
                        .replace(/\.\d{3}/g, "")}`,
                    `DESCRIPTION:${cleanHtmlContent(event.description) || event.title}`,
                    `LOCATION:${event.location || "Online Event"}`,
                    "END:VEVENT",
                    "END:VCALENDAR",
                ].join("\n");
                // Create Blob and link for download
                const blob = new Blob([icsContent], {
                    type: "text/calendar;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", `event-${event.id || new Date().getTime()}.ics`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                break;
            case "yahoo":
                // Format dates for Yahoo Calendar
                const yahooStart = format(startDate, "yyyyMMdd'T'HHmmss");
                const yahooEnd = format(endDate, "yyyyMMdd'T'HHmmss");
                const yahooTitle = encodeURIComponent(event.title);
                const yahooDesc = encodeURIComponent(cleanHtmlContent(event.description) || event.title);
                calendarUrl = `https://calendar.yahoo.com/?v=60&title=${yahooTitle}&st=${yahooStart}&et=${yahooEnd}&desc=${yahooDesc}&in_loc=${location}`;
                window.open(calendarUrl, "_blank");
                break;
            default:
                // Default to ICS download
                handleAddToCalendar("ics");
                break;
        }
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
