/**
 * Component for adding calendar items from a menu.  Supports the major calendar platforms.
 *
 * Delegates URL/ICS generation to the shared `contact` utility
 * (`utils/src/contact.ts`) — this component is purely presentational.
 */
import React, { useState } from "react";
import {
  Button,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Fade,
} from "@mui/material";
import {
  EventNote as EventNoteIcon,
  ExpandMore as ExpandMoreIcon,
  Apple as AppleIcon,
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon,
  CalendarMonth as CalendarIcon,
  Info as InfoIcon,
  Lock as LockIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import {
  openCalendarEvent,
  DEFAULT_CALENDAR_CONFIG,
} from "../../../utils/index.js";

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
const CalendarAdd = ({
  event,
  requireAuth = false,
  isAuthenticated,
  onAuthRequired,
  calendarConfig = DEFAULT_CALENDAR_CONFIG,
  buttonProps = {},
  iconOnly = false,
}) => {
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
    return (
      <>
        <EventNoteIcon onClick={handleClick} />
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            "aria-labelledby": "calendar-button",
          }}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1,
              borderRadius: 2,
              width: 220,
            },
          }}
          TransitionComponent={Fade}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Choose Calendar Type
            </Typography>
          </Box>

          <MenuItem onClick={() => handleAddToCalendar("google")}>
            <ListItemIcon>
              <GoogleIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Google Calendar</ListItemText>
          </MenuItem>

          <MenuItem onClick={() => handleAddToCalendar("outlook")}>
            <ListItemIcon>
              <MicrosoftIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>Outlook</ListItemText>
          </MenuItem>

          <MenuItem onClick={() => handleAddToCalendar("apple")}>
            <ListItemIcon>
              <AppleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Apple Calendar</ListItemText>
          </MenuItem>

          <MenuItem onClick={() => handleAddToCalendar("yahoo")}>
            <ListItemIcon>
              <CalendarIcon fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText>Yahoo Calendar</ListItemText>
          </MenuItem>

          <MenuItem onClick={() => handleAddToCalendar("ics")}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" color="action" />
            </ListItemIcon>
            <ListItemText>Calendar ICS</ListItemText>
          </MenuItem>

          <Box
            sx={{
              px: 2,
              py: 1.5,
              mt: 1,
              bgcolor: "action.hover",
              fontSize: "0.75rem",
              color: "text.secondary",
              display: "flex",
              alignItems: "center",
            }}
          >
            <InfoIcon fontSize="inherit" sx={{ mr: 0.5 }} />
            <Typography variant="caption">
              Times shown in {calendarConfig.timezoneName}
            </Typography>
          </Box>
        </Menu>
      </>
    );
  }

  return (
    <Box sx={{ position: "relative", display: "inline-block" }}>
      <Button
        variant="outlined"
        size="small"
        color="primary"
        onClick={handleClick}
        startIcon={<EventNoteIcon />}
        endIcon={<ExpandMoreIcon />}
        disabled={requireAuth && !isAuthenticated}
        sx={{
          position: "relative",
          "&:hover": {
            backgroundColor: isAuthenticated
              ? "rgba(25, 118, 210, 0.04)"
              : "transparent",
          },
        }}
        {...buttonProps}
      >
        Add to Calendar
      </Button>

      {requireAuth && !isAuthenticated && (
        <LockIcon
          color="action"
          fontSize="small"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "background.paper",
            borderRadius: "50%",
            padding: "2px",
            cursor: "pointer",
          }}
          onClick={() => onAuthRequired("calendar feature")}
        />
      )}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "calendar-button",
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1,
            borderRadius: 2,
            width: 220,
          },
        }}
        TransitionComponent={Fade}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            Choose Calendar Type
          </Typography>
        </Box>

        <MenuItem onClick={() => handleAddToCalendar("google")}>
          <ListItemIcon>
            <GoogleIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Google Calendar</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleAddToCalendar("outlook")}>
          <ListItemIcon>
            <MicrosoftIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Outlook</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleAddToCalendar("apple")}>
          <ListItemIcon>
            <AppleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Apple Calendar</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleAddToCalendar("yahoo")}>
          <ListItemIcon>
            <CalendarIcon fontSize="small" color="secondary" />
          </ListItemIcon>
          <ListItemText>Yahoo Calendar</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleAddToCalendar("ics")}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" color="action" />
          </ListItemIcon>
          <ListItemText>Calendar ICS</ListItemText>
        </MenuItem>

        <Box
          sx={{
            px: 2,
            py: 1.5,
            mt: 1,
            bgcolor: "action.hover",
            fontSize: "0.75rem",
            color: "text.secondary",
            display: "flex",
            alignItems: "center",
          }}
        >
          <InfoIcon fontSize="inherit" sx={{ mr: 0.5 }} />
          <Typography variant="caption">
            Times shown in {calendarConfig.timezoneName}
          </Typography>
        </Box>
      </Menu>
    </Box>
  );
};

export default CalendarAdd;
