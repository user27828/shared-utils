/** Date-backed calendar URL and ICS helpers. */
import type { ContactInfo } from "./contact.js";
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
