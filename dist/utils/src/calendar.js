/** Date-backed calendar URL and ICS helpers. */
import { addMinutes } from "date-fns/addMinutes";
import { format } from "date-fns/format";
import { formatISO } from "date-fns/formatISO";
import { toZonedTime } from "date-fns-tz/toZonedTime";
/** Default calendar configuration */
export const DEFAULT_CALENDAR_CONFIG = {
    timezone: "America/New_York",
    timezoneName: "Eastern Time",
    defaultDuration: 30,
};
// ============================================================================
// Calendar URL Building
// ============================================================================
/**
 * Format a Date to a compact ISO string suitable for calendar URLs.
 * Strips hyphens, colons, and milliseconds: 20260221T143000
 */
const toCompactISO = (date) => {
    return formatISO(date)
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/g, "");
};
/**
 * Strip HTML tags from a string for calendar descriptions.
 * If running in a browser, uses a temporary DOM element for safe extraction.
 * Falls back to regex stripping in non-browser environments.
 */
export const stripHtml = (html) => {
    if (!html) {
        return "";
    }
    if (typeof document !== "undefined") {
        const tempEl = document.createElement("div");
        tempEl.innerHTML = html;
        const text = tempEl.textContent || tempEl.innerText || "";
        return text
            .replace(/[^\S\n\r]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }
    // Server/test fallback
    return html
        .replace(/<[^>]+>/g, " ")
        .replace(/[^\S\n\r]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};
/**
 * Compute the next rounded half-hour from now.
 * E.g., if now is 14:17, returns a Date for 14:30.
 * If now is 14:31, returns 15:00.
 */
export const getNextHalfHour = (from = new Date()) => {
    const minutes = from.getMinutes();
    const remainder = minutes % 30;
    const minutesToAdd = remainder === 0 ? 30 : 30 - remainder;
    const result = new Date(from.getTime());
    result.setMinutes(minutes + minutesToAdd, 0, 0);
    return result;
};
/**
 * Build a pre-filled meeting CalendarEvent from contact info.
 *
 * @param contact - Contact to schedule meeting with
 * @param options - Optional overrides
 * @returns CalendarEvent ready for buildCalendarUrl
 */
export const buildMeetingEvent = (contact, options) => {
    const startDate = options?.startDate || getNextHalfHour();
    const primaryEmail = contact.emails?.find((e) => e?.trim()) || undefined;
    return {
        title: `Meeting with ${contact.name}`,
        description: options?.description || `Scheduled meeting with ${contact.name}`,
        startDate,
        duration: options?.duration || 30,
        location: options?.location || "",
        inviteeEmail: options?.inviteeEmail || primaryEmail,
        ...options,
    };
};
/**
 * Build a calendar URL for the given provider and event.
 *
 * @param provider - Calendar provider
 * @param event - Calendar event details
 * @param config - Calendar configuration (timezone, defaults)
 * @returns URL string (for Google/Outlook/Yahoo) or null for ICS (use downloadICS)
 */
export const buildCalendarUrl = (provider, event, config = DEFAULT_CALENDAR_CONFIG) => {
    const startDate = toZonedTime(new Date(event.startDate), config.timezone);
    const duration = event.duration || config.defaultDuration;
    const endDate = addMinutes(startDate, duration);
    const title = encodeURIComponent(event.title);
    const description = encodeURIComponent(stripHtml(event.description || "") || event.title);
    const location = encodeURIComponent(event.location || "");
    switch (provider) {
        case "google": {
            const googleStart = toCompactISO(startDate);
            const googleEnd = toCompactISO(endDate);
            let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${googleStart}/${googleEnd}&details=${description}`;
            if (location) {
                url += `&location=${location}`;
            }
            if (event.inviteeEmail) {
                url += `&add=${encodeURIComponent(event.inviteeEmail)}`;
            }
            return url;
        }
        case "outlook": {
            const outlookStart = formatISO(startDate);
            const outlookEnd = formatISO(endDate);
            let url = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&body=${description}&startdt=${outlookStart}&enddt=${outlookEnd}`;
            if (location) {
                url += `&location=${location}`;
            }
            return url;
        }
        case "yahoo": {
            const yahooStart = format(startDate, "yyyyMMdd'T'HHmmss");
            const yahooEnd = format(endDate, "yyyyMMdd'T'HHmmss");
            let url = `https://calendar.yahoo.com/?v=60&title=${title}&st=${yahooStart}&et=${yahooEnd}&desc=${description}`;
            if (location) {
                url += `&in_loc=${location}`;
            }
            return url;
        }
        case "apple":
        case "ics":
            // ICS is a file download, not a URL — use downloadICS()
            return null;
        default:
            return null;
    }
};
/**
 * Generate ICS file content for a calendar event.
 *
 * @param event - Calendar event details
 * @param config - Calendar configuration
 * @returns ICS file content string
 */
export const generateICS = (event, config = DEFAULT_CALENDAR_CONFIG) => {
    const startDate = toZonedTime(new Date(event.startDate), config.timezone);
    const duration = event.duration || config.defaultDuration;
    const endDate = addMinutes(startDate, duration);
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//shared-utils//ContactActions//EN",
        "BEGIN:VEVENT",
        `SUMMARY:${event.title}`,
        `DTSTART:${toCompactISO(startDate)}`,
        `DTEND:${toCompactISO(endDate)}`,
        `DESCRIPTION:${stripHtml(event.description || "") || event.title}`,
    ];
    if (event.location) {
        lines.push(`LOCATION:${event.location}`);
    }
    if (event.inviteeEmail) {
        lines.push(`ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${event.inviteeEmail}`);
    }
    lines.push("END:VEVENT", "END:VCALENDAR");
    return lines.join("\r\n");
};
/**
 * Generate an ICS file and trigger browser download.
 *
 * @param event - Calendar event details
 * @param config - Calendar configuration
 */
export const downloadICS = (event, config = DEFAULT_CALENDAR_CONFIG) => {
    const icsContent = generateICS(event, config);
    const blob = new Blob([icsContent], {
        type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event-${event.id || Date.now()}.ics`);
    document.body.appendChild(link);
    try {
        link.click();
    }
    finally {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
/**
 * Open a calendar event for the given provider.
 * For URL-based providers (Google, Outlook, Yahoo), opens in a new tab.
 * For file-based providers (Apple, ICS), downloads an ICS file.
 *
 * @param provider - Calendar provider
 * @param event - Calendar event details
 * @param config - Calendar configuration
 */
export const openCalendarEvent = (provider, event, config = DEFAULT_CALENDAR_CONFIG) => {
    const url = buildCalendarUrl(provider, event, config);
    if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
    }
    else {
        // ICS / Apple — download file
        downloadICS(event, config);
    }
};
