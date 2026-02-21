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
    phones?: {
        value: string;
        type?: string;
    }[];
    /** Organization / company */
    organization?: string;
    /** Job title / role */
    title?: string;
    /** Physical location / address line */
    location?: string;
    /** URLs (LinkedIn, portfolio, website, etc.) */
    urls?: {
        url: string;
        label?: string;
    }[];
    /** Free-form notes */
    notes?: string;
}
/** Supported calendar providers */
export type CalendarProvider = "google" | "outlook" | "yahoo" | "apple" | "ics";
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
export declare const DEFAULT_CALENDAR_CONFIG: CalendarConfig;
/**
 * Generate a vCard 3.0 string from a ContactInfo object.
 *
 * @param contact - Contact information
 * @returns vCard string (RFC 6350 compatible)
 */
export declare const generateVCard: (contact: ContactInfo) => string;
/**
 * Check if minimum required information is present for vCard generation.
 * Requires: name + at least one of (email, phone).
 */
export declare const canGenerateVCard: (contact: ContactInfo) => boolean;
/**
 * Check if minimum required information is present for scheduling a meeting.
 * Requires: name + email (for calendar invitee).
 */
export declare const canScheduleMeeting: (contact: ContactInfo) => boolean;
/**
 * Generate a vCard file and trigger browser download.
 *
 * @param contact - Contact information
 * @param filename - Optional filename (without extension)
 */
export declare const downloadVCard: (contact: ContactInfo, filename?: string) => void;
/**
 * Strip HTML tags from a string for calendar descriptions.
 * If running in a browser, uses a temporary DOM element for safe extraction.
 * Falls back to regex stripping in non-browser environments.
 */
export declare const stripHtml: (html: string) => string;
/**
 * Compute the next rounded half-hour from now.
 * E.g., if now is 14:17, returns a Date for 14:30.
 * If now is 14:31, returns 15:00.
 */
export declare const getNextHalfHour: (from?: Date) => Date;
/**
 * Build a pre-filled meeting CalendarEvent from contact info.
 *
 * @param contact - Contact to schedule meeting with
 * @param options - Optional overrides
 * @returns CalendarEvent ready for buildCalendarUrl
 */
export declare const buildMeetingEvent: (contact: ContactInfo, options?: Partial<CalendarEvent>) => CalendarEvent;
/**
 * Build a calendar URL for the given provider and event.
 *
 * @param provider - Calendar provider
 * @param event - Calendar event details
 * @param config - Calendar configuration (timezone, defaults)
 * @returns URL string (for Google/Outlook/Yahoo) or null for ICS (use downloadICS)
 */
export declare const buildCalendarUrl: (provider: CalendarProvider, event: CalendarEvent, config?: CalendarConfig) => string | null;
/**
 * Generate ICS file content for a calendar event.
 *
 * @param event - Calendar event details
 * @param config - Calendar configuration
 * @returns ICS file content string
 */
export declare const generateICS: (event: CalendarEvent, config?: CalendarConfig) => string;
/**
 * Generate an ICS file and trigger browser download.
 *
 * @param event - Calendar event details
 * @param config - Calendar configuration
 */
export declare const downloadICS: (event: CalendarEvent, config?: CalendarConfig) => void;
/**
 * Open a calendar event for the given provider.
 * For URL-based providers (Google, Outlook, Yahoo), opens in a new tab.
 * For file-based providers (Apple, ICS), downloads an ICS file.
 *
 * @param provider - Calendar provider
 * @param event - Calendar event details
 * @param config - Calendar configuration
 */
export declare const openCalendarEvent: (provider: CalendarProvider, event: CalendarEvent, config?: CalendarConfig) => void;
//# sourceMappingURL=contact.d.ts.map