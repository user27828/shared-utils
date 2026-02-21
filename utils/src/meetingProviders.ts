/**
 * Online Meeting Provider definitions
 *
 * Pure data module — no framework dependencies.
 * Providers are ordered by global business-meeting popularity (descending).
 *
 * Each provider declares one or more input fields so users can store
 * meeting URLs, personal meeting IDs, dial-in numbers, etc.
 */

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Provider definitions (descending popularity)
// ============================================================================

export const MEETING_PROVIDERS: MeetingProvider[] = [
  {
    key: "zoom",
    name: "Zoom",
    iconKey: "Videocam",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://zoom.us/j/123456789", inputType: "url" },
      { key: "personal_id", label: "Personal Meeting ID", placeholder: "123 456 7890", inputType: "text" },
    ],
  },
  {
    key: "google_meet",
    name: "Google Meet",
    iconKey: "Google",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://meet.google.com/abc-defg-hij", inputType: "url" },
    ],
  },
  {
    key: "microsoft_teams",
    name: "Microsoft Teams",
    iconKey: "Microsoft",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://teams.microsoft.com/l/meetup-join/...", inputType: "url" },
    ],
  },
  {
    key: "cisco_webex",
    name: "Cisco Webex",
    iconKey: "Language",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://meet.webex.com/meet/username", inputType: "url" },
      { key: "personal_room", label: "Personal Room ID", placeholder: "username", inputType: "text" },
    ],
  },
  {
    key: "goto_meeting",
    name: "GoTo Meeting",
    iconKey: "PhoneInTalk",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://meet.goto.com/123456789", inputType: "url" },
      { key: "meeting_id", label: "Meeting ID", placeholder: "123-456-789", inputType: "text" },
    ],
  },
  {
    key: "discord",
    name: "Discord",
    iconKey: "Headset",
    fields: [
      { key: "url", label: "Server/Channel Invite URL", placeholder: "https://discord.gg/invite-code", inputType: "url" },
    ],
  },
  {
    key: "slack_huddles",
    name: "Slack (Huddles)",
    iconKey: "Tag",
    fields: [
      { key: "url", label: "Slack Channel URL", placeholder: "https://app.slack.com/huddle/T.../C...", inputType: "url" },
    ],
  },
  {
    key: "bluejeans",
    name: "BlueJeans",
    iconKey: "Videocam",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://bluejeans.com/123456789", inputType: "url" },
      { key: "meeting_id", label: "Meeting ID", placeholder: "123 456 789", inputType: "text" },
    ],
  },
  {
    key: "ringcentral",
    name: "RingCentral",
    iconKey: "PhoneInTalk",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://v.ringcentral.com/join/123456789", inputType: "url" },
    ],
  },
  {
    key: "whereby",
    name: "Whereby",
    iconKey: "Videocam",
    fields: [
      { key: "url", label: "Room URL", placeholder: "https://whereby.com/your-room", inputType: "url" },
    ],
  },
  {
    key: "zoho_meeting",
    name: "Zoho Meeting",
    iconKey: "Videocam",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://meeting.zoho.com/meeting/...", inputType: "url" },
    ],
  },
  {
    key: "lark",
    name: "Lark (Feishu)",
    iconKey: "Videocam",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://vc.feishu.cn/j/...", inputType: "url" },
    ],
  },
  {
    key: "dialpad",
    name: "Dialpad",
    iconKey: "PhoneInTalk",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://dialpad.com/join/...", inputType: "url" },
    ],
  },
  {
    key: "livestorm",
    name: "Livestorm",
    iconKey: "OndemandVideo",
    fields: [
      { key: "url", label: "Meeting/Webinar URL", placeholder: "https://app.livestorm.co/...", inputType: "url" },
    ],
  },
  {
    key: "around",
    name: "Around",
    iconKey: "Videocam",
    fields: [
      { key: "url", label: "Room URL", placeholder: "https://around.co/r/your-room", inputType: "url" },
    ],
  },
  {
    key: "jitsi",
    name: "Jitsi Meet",
    iconKey: "Videocam",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://meet.jit.si/your-room-name", inputType: "url" },
    ],
  },
  {
    key: "demio",
    name: "Demio",
    iconKey: "OndemandVideo",
    fields: [
      { key: "url", label: "Webinar/Meeting URL", placeholder: "https://my.demio.com/ref/...", inputType: "url" },
    ],
  },
  {
    key: "wire",
    name: "Wire",
    iconKey: "Lock",
    fields: [
      { key: "url", label: "Conference URL", placeholder: "https://app.wire.com/join/...", inputType: "url" },
    ],
  },
  {
    key: "join_me",
    name: "join.me",
    iconKey: "Videocam",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://join.me/your-code", inputType: "url" },
    ],
  },
  {
    key: "session",
    name: "Session",
    iconKey: "Lock",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://getsession.org/...", inputType: "url" },
    ],
  },
  {
    key: "other",
    name: "Other",
    iconKey: "MoreHoriz",
    fields: [
      { key: "url", label: "Meeting URL", placeholder: "https://...", inputType: "url" },
      { key: "meeting_id", label: "Meeting ID / Code", placeholder: "Enter meeting ID", inputType: "text" },
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

/** Look up a provider definition by key */
export const getMeetingProvider = (key: string): MeetingProvider | undefined =>
  MEETING_PROVIDERS.find((p) => p.key === key);

/** Create a fresh MeetingEntry with empty values for the given provider */
export const createMeetingEntry = (providerKey = "zoom"): MeetingEntry => {
  const provider = getMeetingProvider(providerKey);
  const values: Record<string, string> = {};
  if (provider) {
    for (const field of provider.fields) {
      values[field.key] = "";
    }
  }
  return {
    id: `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    providerKey,
    label: "",
    values,
  };
};

/**
 * Flatten MeetingEntry[] into MeetingLinkEntry[] for ContactActions consumption.
 * Only includes entries that have at least one non-empty value.
 */
export const flattenMeetingEntries = (
  entries: MeetingEntry[],
): MeetingLinkEntry[] => {
  const result: MeetingLinkEntry[] = [];

  for (const entry of entries) {
    const provider = getMeetingProvider(entry.providerKey);
    if (!provider) {
      continue;
    }

    for (const field of provider.fields) {
      const val = entry.values[field.key]?.trim();
      if (!val) {
        continue;
      }

      const displayLabel = entry.label
        ? `${entry.label} — ${field.label}`
        : `${provider.name} — ${field.label}`;

      result.push({
        label: displayLabel,
        value: val,
        providerKey: entry.providerKey,
      });
    }
  }

  return result;
};
