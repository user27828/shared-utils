"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CALENDAR_CONFIG = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Component for adding calendar items from a menu.  Supports the major calendar platforms
 */
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const dompurify_1 = __importDefault(require("dompurify"));
/**
 * Calendar configuration defaults
 */
exports.DEFAULT_CALENDAR_CONFIG = {
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
const CalendarAdd = ({ event, requireAuth = false, isAuthenticated, onAuthRequired, calendarConfig = exports.DEFAULT_CALENDAR_CONFIG, buttonProps = {}, iconOnly = false, }) => {
    const [anchorEl, setAnchorEl] = (0, react_1.useState)(null);
    const open = Boolean(anchorEl);
    // Clean HTML content for calendar descriptions
    const cleanHtmlContent = (htmlContent) => {
        if (!htmlContent) {
            return "";
        }
        // Use DOMPurify to sanitize HTML
        const sanitized = dompurify_1.default.sanitize(htmlContent);
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
        const startDate = (0, date_fns_tz_1.toZonedTime)(new Date(event.startDate), calendarConfig.timezone);
        const duration = event.duration || calendarConfig.defaultDuration;
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
        // Location from event URL or default
        const location = encodeURIComponent(event.location || "Online Event");
        // URL for calendar based on provider
        let calendarUrl;
        switch (provider) {
            case "google":
                // Format dates for Google Calendar
                const googleStart = (0, date_fns_1.formatISO)(startDate)
                    .replace(/[-:]/g, "")
                    .replace(/\.\d{3}/g, "");
                const googleEnd = (0, date_fns_1.formatISO)(endDate)
                    .replace(/[-:]/g, "")
                    .replace(/\.\d{3}/g, "");
                calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${googleStart}/${googleEnd}&details=${description}&location=${location}`;
                window.open(calendarUrl, "_blank");
                break;
            case "outlook":
                // Format dates for Outlook/Microsoft calendar
                const outlookStart = (0, date_fns_1.formatISO)(startDate);
                const outlookEnd = (0, date_fns_1.formatISO)(endDate);
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
                    `DTSTART:${(0, date_fns_1.formatISO)(startDate)
                        .replace(/[-:]/g, "")
                        .replace(/\.\d{3}/g, "")}`,
                    `DTEND:${(0, date_fns_1.formatISO)(endDate)
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
                const yahooStart = (0, date_fns_1.format)(startDate, "yyyyMMdd'T'HHmmss");
                const yahooEnd = (0, date_fns_1.format)(endDate, "yyyyMMdd'T'HHmmss");
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
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(icons_material_1.EventNote, { onClick: handleClick }), (0, jsx_runtime_1.jsxs)(material_1.Menu, { anchorEl: anchorEl, open: open, onClose: handleClose, MenuListProps: {
                        "aria-labelledby": "calendar-button",
                    }, PaperProps: {
                        elevation: 3,
                        sx: {
                            mt: 1,
                            borderRadius: 2,
                            width: 220,
                        },
                    }, TransitionComponent: material_1.Fade, children: [(0, jsx_runtime_1.jsx)(material_1.Box, { sx: {
                                px: 2,
                                py: 1,
                                borderBottom: "1px solid",
                                borderColor: "divider",
                            }, children: (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "subtitle2", color: "text.secondary", children: "Choose Calendar Type" }) }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("google"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.Google, { fontSize: "small", color: "error" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Google Calendar" })] }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("outlook"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.Microsoft, { fontSize: "small", color: "primary" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Outlook" })] }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("apple"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.Apple, { fontSize: "small" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Apple Calendar" })] }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("yahoo"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.CalendarMonth, { fontSize: "small", color: "secondary" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Yahoo Calendar" })] }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("ics"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.Download, { fontSize: "small", color: "action" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Calendar ICS" })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                                px: 2,
                                py: 1.5,
                                mt: 1,
                                bgcolor: "action.hover",
                                fontSize: "0.75rem",
                                color: "text.secondary",
                                display: "flex",
                                alignItems: "center",
                            }, children: [(0, jsx_runtime_1.jsx)(icons_material_1.Info, { fontSize: "inherit", sx: { mr: 0.5 } }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "caption", children: ["Times shown in ", calendarConfig.timezoneName] })] })] })] }));
    }
    return ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { position: "relative", display: "inline-block" }, children: [(0, jsx_runtime_1.jsx)(material_1.Button, { variant: "outlined", size: "small", color: "primary", onClick: handleClick, startIcon: (0, jsx_runtime_1.jsx)(icons_material_1.EventNote, {}), endIcon: (0, jsx_runtime_1.jsx)(icons_material_1.ExpandMore, {}), disabled: requireAuth && !isAuthenticated, sx: {
                    position: "relative",
                    "&:hover": {
                        backgroundColor: isAuthenticated
                            ? "rgba(25, 118, 210, 0.04)"
                            : "transparent",
                    },
                }, ...buttonProps, children: "Add to Calendar" }), requireAuth && !isAuthenticated && ((0, jsx_runtime_1.jsx)(icons_material_1.Lock, { color: "action", fontSize: "small", sx: {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "background.paper",
                    borderRadius: "50%",
                    padding: "2px",
                    cursor: "pointer",
                }, onClick: () => onAuthRequired("calendar feature") })), (0, jsx_runtime_1.jsxs)(material_1.Menu, { anchorEl: anchorEl, open: open, onClose: handleClose, MenuListProps: {
                    "aria-labelledby": "calendar-button",
                }, PaperProps: {
                    elevation: 3,
                    sx: {
                        mt: 1,
                        borderRadius: 2,
                        width: 220,
                    },
                }, TransitionComponent: material_1.Fade, children: [(0, jsx_runtime_1.jsx)(material_1.Box, { sx: {
                            px: 2,
                            py: 1,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                        }, children: (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "subtitle2", color: "text.secondary", children: "Choose Calendar Type" }) }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("google"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.Google, { fontSize: "small", color: "error" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Google Calendar" })] }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("outlook"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.Microsoft, { fontSize: "small", color: "primary" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Outlook" })] }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("apple"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.Apple, { fontSize: "small" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Apple Calendar" })] }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("yahoo"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.CalendarMonth, { fontSize: "small", color: "secondary" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Yahoo Calendar" })] }), (0, jsx_runtime_1.jsxs)(material_1.MenuItem, { onClick: () => handleAddToCalendar("ics"), children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { children: (0, jsx_runtime_1.jsx)(icons_material_1.Download, { fontSize: "small", color: "action" }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { children: "Calendar ICS" })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                            px: 2,
                            py: 1.5,
                            mt: 1,
                            bgcolor: "action.hover",
                            fontSize: "0.75rem",
                            color: "text.secondary",
                            display: "flex",
                            alignItems: "center",
                        }, children: [(0, jsx_runtime_1.jsx)(icons_material_1.Info, { fontSize: "inherit", sx: { mr: 0.5 } }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "caption", children: ["Times shown in ", calendarConfig.timezoneName] })] })] })] }));
};
exports.default = CalendarAdd;
