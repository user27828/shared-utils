import { OptionsManager, optionsManager } from "./src/options-manager.js";
import log, { Log, ORIGINAL_CONSOLE_METHODS } from "./src/log.js";
import turnstile, { Turnstile } from "./src/turnstile.js";
import { isDev, formatFileSize, sanitizeFilename, convertBytesToUnit, getFileExtension, removeFileExtension, isValidFilename, isValidEmail, normalizeUrl, formatDate } from "./src/functions.js";
import type { IsDevOptions, EnvironmentObject } from "./src/functions.js";
import { detectFormatFromText } from "./src/detectFormat/index.js";
import { generateVCard, canGenerateVCard, canScheduleMeeting, downloadVCard, buildCalendarUrl, buildMeetingEvent, generateICS, downloadICS, openCalendarEvent, getNextHalfHour, stripHtml, DEFAULT_CALENDAR_CONFIG } from "./src/contact.js";
import type { ContactInfo, CalendarProvider, CalendarEvent, CalendarConfig } from "./src/contact.js";
import { MEETING_PROVIDERS, getMeetingProvider, createMeetingEntry, flattenMeetingEntries } from "./src/meetingProviders.js";
import type { MeetingProvider, MeetingProviderField, MeetingEntry, MeetingLinkEntry } from "./src/meetingProviders.js";
export { log, Log, ORIGINAL_CONSOLE_METHODS, turnstile, Turnstile, OptionsManager, optionsManager, isDev, formatFileSize, sanitizeFilename, convertBytesToUnit, getFileExtension, removeFileExtension, isValidFilename, isValidEmail, normalizeUrl, formatDate, detectFormatFromText, // plain text format detection
generateVCard, canGenerateVCard, canScheduleMeeting, downloadVCard, buildCalendarUrl, buildMeetingEvent, generateICS, downloadICS, openCalendarEvent, getNextHalfHour, stripHtml, DEFAULT_CALENDAR_CONFIG, MEETING_PROVIDERS, getMeetingProvider, createMeetingEntry, flattenMeetingEntries, };
export type { IsDevOptions, EnvironmentObject, ContactInfo, CalendarProvider, CalendarEvent, CalendarConfig, MeetingProvider, MeetingProviderField, MeetingEntry, MeetingLinkEntry, };
//# sourceMappingURL=index.d.ts.map