/**
 * ContactActions Component
 *
 * Reusable MUI component providing contact-related quick actions:
 * - Download vCard (add to address book / contacts)
 * - Schedule meeting (calendar provider picker, optional meeting-link cascading menu)
 *
 * Supports three display variants:
 * - "speedDial"  — MUI SpeedDial (floating actions)
 * - "iconButton" — compact icon with dropdown menu
 * - "menuItems"  — returns raw MenuItem elements for embedding in a parent Menu
 *
 * When `meetingLinks` are provided, each calendar provider gains a cascading
 * hover sub-menu (Windows Start Menu style) listing the available links.
 * Selecting a link injects it as the calendar event location / description.
 *
 * Automatically disables actions when minimum required contact info is missing.
 */
import React from "react";
import type { ContactInfo, CalendarProvider, MeetingLinkEntry } from "../../../utils/index.js";
export type ContactActionsVariant = "speedDial" | "iconButton" | "menuItems";
export interface ContactActionsProps {
    /** Generic contact information */
    contact: ContactInfo;
    /** Display variant */
    variant?: ContactActionsVariant;
    /** Icon size for iconButton variant */
    iconSize?: "small" | "medium";
    /** SpeedDial direction */
    direction?: "up" | "down" | "left" | "right";
    /** Additional sx for the root wrapper */
    sx?: Record<string, unknown>;
    /**
     * Optional suffix appended to the default meeting description.
     * Example: "(via AgentM.com)".
     */
    meetingDescriptionSuffix?: string;
    /**
     * For the "speedDial" variant: render inline (non-fixed positioning)
     * so it can live inside toolbars / DialogActions rows.
     */
    speedDialInline?: boolean;
    /**
     * Available online meeting links (from user's profile).
     * When non-empty, each calendar provider shows a cascading hover sub-menu
     * so the user can pick which meeting link to include.
     */
    meetingLinks?: MeetingLinkEntry[];
    /** Callback fired after any action is executed */
    onAction?: (action: "vcard" | "calendar", provider?: CalendarProvider) => void;
    /**
     * For "menuItems" variant: called after an action to let the parent close
     * its own Menu.
     */
    onMenuClose?: () => void;
}
declare const ContactActions: React.FC<ContactActionsProps>;
export default ContactActions;
//# sourceMappingURL=ContactActions.d.ts.map