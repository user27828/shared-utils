/**
 * Contact utility functions
 *
 * Pure, framework-agnostic utilities for:
 * - vCard (RFC 2426, v3.0) generation and download
 * - Calendar event URL building (Google, Outlook, Yahoo, ICS)
 *
 * These are the canonical implementations; UI components (CalendarAdd,
 * ContactActions) delegate here for all URL/file generation.
 */

import { formatISO, format, addMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// ============================================================================
// Types
// ============================================================================

/** Generic contact information for vCard generation */
export interface ContactInfo {
  /** Full display name (required) */
  name: string;
  /** First name (optional, derived from name if omitted) */
  firstName?: string;
  /** Last name (optional, derived from name if omitted) */
  lastName?: string;
  /** Primary email addresses */
  emails?: string[];
  /** Phone numbers with optional type labels */
  phones?: { value: string; type?: string }[];
  /** Organization / company */
  organization?: string;
  /** Job title / role */
  title?: string;
  /** Physical location / address line */
  location?: string;
  /** URLs (LinkedIn, portfolio, website, etc.) */
  urls?: { url: string; label?: string }[];
  /** Free-form notes */
  notes?: string;
}

/** Supported calendar providers */
export type CalendarProvider =
  | "google"
  | "outlook"
  | "yahoo"
  | "apple"
  | "ics";

/** Calendar event details */
export interface CalendarEvent {
  /** Event title */
  title: string;
  /** Event description (plain text or HTML — HTML will be sanitized) */
  description?: string;
  /** Event start date (ISO string or Date) */
  startDate: string | Date;
  /** Duration in minutes (default: 30) */
  duration?: number;
  /** Location or URL */
  location?: string;
  /** Unique id for ICS filename */
  id?: string;
  /** Invitee email address (used by Google Calendar) */
  inviteeEmail?: string;
}

/** Calendar configuration */
export interface CalendarConfig {
  timezone: string;
  timezoneName: string;
  defaultDuration: number;
}

/** Default calendar configuration */
export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  timezone: "America/New_York",
  timezoneName: "Eastern Time",
  defaultDuration: 30,
};

// ============================================================================
// vCard Generation
// ============================================================================

/**
 * Escape special characters in vCard property values.
 * RFC 6350 §3.4: backslash, semicolon, comma, and newline must be escaped.
 */
const escapeVCardValue = (value: string): string => {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
};

/**
 * Derive first/last name from a full name string.
 */
const splitName = (
  fullName: string,
): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

/**
 * Map a phone type string to a vCard TYPE parameter.
 */
const mapPhoneType = (type?: string): string => {
  switch (type?.toLowerCase()) {
    case "mobile":
      return "CELL";
    case "landline":
    case "phone":
      return "VOICE";
    case "fax":
      return "FAX";
    case "voip":
      return "VOICE";
    default:
      return "VOICE";
  }
};

/**
 * Generate a vCard 3.0 string from a ContactInfo object.
 *
 * @param contact - Contact information
 * @returns vCard string (RFC 6350 compatible)
 */
export const generateVCard = (contact: ContactInfo): string => {
  const { firstName: derivedFirst, lastName: derivedLast } = splitName(
    contact.name,
  );
  const firstName = contact.firstName || derivedFirst;
  const lastName = contact.lastName || derivedLast;

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(contact.name)}`,
    `N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`,
  ];

  // Organization
  if (contact.organization) {
    lines.push(`ORG:${escapeVCardValue(contact.organization)}`);
  }

  // Title
  if (contact.title) {
    lines.push(`TITLE:${escapeVCardValue(contact.title)}`);
  }

  // Emails
  if (contact.emails?.length) {
    contact.emails.forEach((email, i) => {
      const pref = i === 0 ? ";PREF" : "";
      lines.push(`EMAIL;TYPE=INTERNET${pref}:${email}`);
    });
  }

  // Phones
  if (contact.phones?.length) {
    contact.phones.forEach((phone) => {
      const vcardType = mapPhoneType(phone.type);
      lines.push(`TEL;TYPE=${vcardType}:${phone.value}`);
    });
  }

  // Location as ADR label (no structured address available)
  if (contact.location) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(contact.location)};;;;`);
    lines.push(`LABEL;TYPE=WORK:${escapeVCardValue(contact.location)}`);
  }

  // URLs
  if (contact.urls?.length) {
    contact.urls.forEach((entry) => {
      lines.push(`URL:${entry.url}`);
    });
  }

  // Notes
  if (contact.notes) {
    lines.push(`NOTE:${escapeVCardValue(contact.notes)}`);
  }

  // Revision timestamp
  lines.push(`REV:${new Date().toISOString()}`);
  lines.push("END:VCARD");

  return lines.join("\r\n");
};

/**
 * Check if minimum required information is present for vCard generation.
 * Requires: name + at least one of (email, phone).
 */
export const canGenerateVCard = (contact: ContactInfo): boolean => {
  if (!contact.name?.trim()) {
    return false;
  }
  const hasEmail = Boolean(contact.emails?.some((e) => e?.trim()));
  const hasPhone = Boolean(contact.phones?.some((p) => p?.value?.trim()));
  return hasEmail || hasPhone;
};

/**
 * Check if minimum required information is present for scheduling a meeting.
 * Requires: name + email (for calendar invitee).
 */
export const canScheduleMeeting = (contact: ContactInfo): boolean => {
  if (!contact.name?.trim()) {
    return false;
  }
  return Boolean(contact.emails?.some((e) => e?.trim()));
};

/**
 * Generate a vCard file and trigger browser download.
 *
 * @param contact - Contact information
 * @param filename - Optional filename (without extension)
 */
export const downloadVCard = (
  contact: ContactInfo,
  filename?: string,
): void => {
  const vcardString = generateVCard(contact);
  const sanitizedName = (filename || contact.name)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 50);
  const blob = new Blob([vcardString], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${sanitizedName}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================================================
// Calendar URL Building
// ============================================================================

/**
 * Format a Date to a compact ISO string suitable for calendar URLs.
 * Strips hyphens, colons, and milliseconds: 20260221T143000
 */
const toCompactISO = (date: Date): string => {
  return formatISO(date)
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/g, "");
};

/**
 * Strip HTML tags from a string for calendar descriptions.
 * If running in a browser, uses a temporary DOM element for safe extraction.
 * Falls back to regex stripping in non-browser environments.
 */
export const stripHtml = (html: string): string => {
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
export const getNextHalfHour = (from: Date = new Date()): Date => {
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
export const buildMeetingEvent = (
  contact: ContactInfo,
  options?: Partial<CalendarEvent>,
): CalendarEvent => {
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
export const buildCalendarUrl = (
  provider: CalendarProvider,
  event: CalendarEvent,
  config: CalendarConfig = DEFAULT_CALENDAR_CONFIG,
): string | null => {
  const startDate = toZonedTime(
    new Date(event.startDate),
    config.timezone,
  );
  const duration = event.duration || config.defaultDuration;
  const endDate = addMinutes(startDate, duration);

  const title = encodeURIComponent(event.title);
  const description = encodeURIComponent(
    stripHtml(event.description || "") || event.title,
  );
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
export const generateICS = (
  event: CalendarEvent,
  config: CalendarConfig = DEFAULT_CALENDAR_CONFIG,
): string => {
  const startDate = toZonedTime(
    new Date(event.startDate),
    config.timezone,
  );
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
    lines.push(
      `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${event.inviteeEmail}`,
    );
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
export const downloadICS = (
  event: CalendarEvent,
  config: CalendarConfig = DEFAULT_CALENDAR_CONFIG,
): void => {
  const icsContent = generateICS(event, config);
  const blob = new Blob([icsContent], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `event-${event.id || Date.now()}.ics`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
export const openCalendarEvent = (
  provider: CalendarProvider,
  event: CalendarEvent,
  config: CalendarConfig = DEFAULT_CALENDAR_CONFIG,
): void => {
  const url = buildCalendarUrl(provider, event, config);
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    // ICS / Apple — download file
    downloadICS(event, config);
  }
};
