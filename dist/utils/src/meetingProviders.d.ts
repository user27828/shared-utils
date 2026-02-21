/**
 * Online Meeting Provider definitions
 *
 * Pure data module — no framework dependencies.
 * Providers are ordered by global business-meeting popularity (descending).
 *
 * Each provider declares one or more input fields so users can store
 * meeting URLs, personal meeting IDs, dial-in numbers, etc.
 */
/** A single input field definition for a meeting provider */
export interface MeetingProviderField {
    /** Unique key within the provider, e.g. "url", "personal_id" */
    key: string;
    /** Human-readable label shown in the form */
    label: string;
    /** Placeholder text */
    placeholder: string;
    /** HTML input type (default: "url") */
    inputType?: "url" | "text";
}
/** Definition of a single meeting provider */
export interface MeetingProvider {
    /** Unique machine key, e.g. "zoom", "google_meet" */
    key: string;
    /** Display name */
    name: string;
    /** Material icon name (string key — resolved by consumers) */
    iconKey: string;
    /** Input fields supported by this provider */
    fields: MeetingProviderField[];
}
/** A user-saved meeting entry stored in profile.onlineMeetings[] */
export interface MeetingEntry {
    /** Unique entry ID (for React keys & reordering) */
    id: string;
    /** Provider key from MEETING_PROVIDERS */
    providerKey: string;
    /** Free-form label (user-defined, e.g. "Personal Zoom", "Work Teams") */
    label: string;
    /** Field values keyed by MeetingProviderField.key */
    values: Record<string, string>;
}
/**
 * A flattened meeting link ready for consumption by ContactActions.
 * Derived from MeetingEntry — one item per non-empty field value.
 */
export interface MeetingLinkEntry {
    /** Display label, e.g. "Zoom — Personal Meeting ID" */
    label: string;
    /** The actual URL or ID value */
    value: string;
    /** Provider key for icon resolution */
    providerKey: string;
}
export declare const MEETING_PROVIDERS: MeetingProvider[];
/** Look up a provider definition by key */
export declare const getMeetingProvider: (key: string) => MeetingProvider | undefined;
/** Create a fresh MeetingEntry with empty values for the given provider */
export declare const createMeetingEntry: (providerKey?: string) => MeetingEntry;
/**
 * Flatten MeetingEntry[] into MeetingLinkEntry[] for ContactActions consumption.
 * Only includes entries that have at least one non-empty value.
 */
export declare const flattenMeetingEntries: (entries: MeetingEntry[]) => MeetingLinkEntry[];
//# sourceMappingURL=meetingProviders.d.ts.map