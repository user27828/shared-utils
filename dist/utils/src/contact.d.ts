/**
 * Contact utility functions
 *
 * Pure, framework-agnostic utilities for:
 * - vCard (RFC 2426, v3.0) generation and download
 *
 * These are the canonical contact serialization implementations.
 */
/** Generic contact information for vCard generation */
export interface ContactInfo {
    /** Full display name (required) */
    name: string;
    /** First name (optional, derived from name if omitted) */
    firstName?: string;
    /** Middle name */
    middleName?: string;
    /** Last name (optional, derived from name if omitted) */
    lastName?: string;
    /** Name prefix */
    prefix?: string;
    /** Name suffix */
    suffix?: string;
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
export type ContactExportFormat = "google_csv" | "outlook_csv" | "vcard";
export interface ContactExportFile {
    content: string;
    contentType: string;
    extension: string;
}
export declare const generateGoogleContactsCsv: (contacts: ContactInfo[]) => string;
export declare const generateOutlookContactsCsv: (contacts: ContactInfo[]) => string;
export declare const generateMultiVCard: (contacts: ContactInfo[]) => string;
export declare const buildContactExportFile: (contacts: ContactInfo[], format: ContactExportFormat) => ContactExportFile;
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
