/**
 * Contact utility functions
 *
 * Pure, framework-agnostic utilities for:
 * - vCard (RFC 2426, v3.0) generation and download
 *
 * These are the canonical contact serialization implementations.
 */
// ============================================================================
// Contact Types
// ============================================================================

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

export type ContactExportFormat = "google_csv" | "outlook_csv" | "vcard";

export interface ContactExportFile {
  content: string;
  contentType: string;
  extension: string;
}

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
): { firstName: string; middleName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: "", middleName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: "" };
  }

  if (parts.length === 2) {
    return {
      firstName: parts[0],
      middleName: "",
      lastName: parts[1],
    };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
};

const escapeCsvValue = (value: string): string => {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
};

const serializeCsv = (rows: string[][]): string => {
  return rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\r\n");
};

const normalizeContactString = (
  value: string | null | undefined,
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const getResolvedNameParts = (contact: ContactInfo) => {
  const derivedNameParts = splitName(contact.name);

  return {
    firstName:
      normalizeContactString(contact.firstName) || derivedNameParts.firstName,
    middleName:
      normalizeContactString(contact.middleName) || derivedNameParts.middleName,
    lastName:
      normalizeContactString(contact.lastName) || derivedNameParts.lastName,
    prefix: normalizeContactString(contact.prefix) || "",
    suffix: normalizeContactString(contact.suffix) || "",
  };
};

const getResolvedEmails = (contact: ContactInfo): string[] => {
  return (contact.emails || [])
    .map((value) => normalizeContactString(value))
    .filter((value): value is string => Boolean(value));
};

type ResolvedPhoneEntry = {
  value: string;
  type?: string;
};

type ResolvedUrlEntry = {
  url: string;
  label?: string;
};

const getResolvedPhones = (contact: ContactInfo): ResolvedPhoneEntry[] => {
  const resolvedPhones = (contact.phones || [])
    .map((phone) => {
      const value = normalizeContactString(phone.value);

      if (!value) {
        return null;
      }

      const type = normalizeContactString(phone.type);
      const resolvedPhone: ResolvedPhoneEntry = {
        value,
      };

      if (type) {
        resolvedPhone.type = type;
      }

      return resolvedPhone;
    })
    .filter((value): value is ResolvedPhoneEntry => value !== null);

  return resolvedPhones;
};

const getResolvedUrls = (contact: ContactInfo): ResolvedUrlEntry[] => {
  const resolvedUrls = (contact.urls || [])
    .map((entry) => {
      const url = normalizeContactString(entry.url);

      if (!url) {
        return null;
      }

      const resolvedUrl: ResolvedUrlEntry = {
        url,
      };

      const label = normalizeContactString(entry.label);

      if (label) {
        resolvedUrl.label = label;
      }

      return resolvedUrl;
    })
    .filter((value): value is ResolvedUrlEntry => value !== null);

  return resolvedUrls;
};

const getGoogleWebsiteType = (label?: string): string => {
  switch (label?.toLowerCase()) {
    case "linkedin":
    case "github":
      return "Profile";
    case "portfolio":
    case "website":
      return "Homepage";
    default:
      return "Homepage";
  }
};

const getGooglePhoneType = (type?: string): string => {
  switch (type?.toLowerCase()) {
    case "mobile":
      return "Mobile";
    case "fax":
      return "Work Fax";
    case "landline":
    case "phone":
    case "voip":
      return "Work";
    default:
      return "Other";
  }
};

const appendSupplementalContactNotes = (
  contact: ContactInfo,
  extraLines: string[],
): string => {
  const existingNotes = normalizeContactString(contact.notes);

  return [existingNotes, ...extraLines]
    .filter((value): value is string => Boolean(value))
    .join("\n");
};

export const generateGoogleContactsCsv = (contacts: ContactInfo[]): string => {
  const sanitizedContacts = contacts.filter((contact) => {
    return Boolean(normalizeContactString(contact.name));
  });
  const maxEmailCount = Math.max(
    1,
    ...sanitizedContacts.map((contact) => getResolvedEmails(contact).length),
  );
  const maxPhoneCount = Math.max(
    1,
    ...sanitizedContacts.map((contact) => getResolvedPhones(contact).length),
  );
  const maxUrlCount = Math.max(
    1,
    ...sanitizedContacts.map((contact) => getResolvedUrls(contact).length),
  );

  const headers = [
    "Name",
    "Given Name",
    "Additional Name",
    "Family Name",
    "Name Prefix",
    "Name Suffix",
    "Organization 1 - Name",
    "Organization 1 - Title",
    "Address 1 - Formatted",
    "Notes",
    ...Array.from({ length: maxEmailCount }, (_, index) => {
      const position = index + 1;
      return [`E-mail ${position} - Type`, `E-mail ${position} - Value`];
    }).flat(),
    ...Array.from({ length: maxPhoneCount }, (_, index) => {
      const position = index + 1;
      return [`Phone ${position} - Type`, `Phone ${position} - Value`];
    }).flat(),
    ...Array.from({ length: maxUrlCount }, (_, index) => {
      const position = index + 1;
      return [`Website ${position} - Type`, `Website ${position} - Value`];
    }).flat(),
  ];

  const rows = sanitizedContacts.map((contact) => {
    const nameParts = getResolvedNameParts(contact);
    const emails = getResolvedEmails(contact);
    const phones = getResolvedPhones(contact);
    const urls = getResolvedUrls(contact);
    const baseRow: string[] = [
      contact.name.trim(),
      nameParts.firstName,
      nameParts.middleName,
      nameParts.lastName,
      nameParts.prefix,
      nameParts.suffix,
      normalizeContactString(contact.organization) || "",
      normalizeContactString(contact.title) || "",
      normalizeContactString(contact.location) || "",
      normalizeContactString(contact.notes) || "",
    ];

    const emailColumns = Array.from({ length: maxEmailCount }, (_, index) => {
      const value = emails[index] || "";
      return [value ? "* Work" : "", value];
    }).flat();
    const phoneColumns = Array.from({ length: maxPhoneCount }, (_, index) => {
      const entry = phones[index];
      return [entry ? getGooglePhoneType(entry.type) : "", entry?.value || ""];
    }).flat();
    const urlColumns = Array.from({ length: maxUrlCount }, (_, index) => {
      const entry = urls[index];
      return [entry ? getGoogleWebsiteType(entry.label) : "", entry?.url || ""];
    }).flat();

    return [...baseRow, ...emailColumns, ...phoneColumns, ...urlColumns];
  });

  return serializeCsv([headers, ...rows]);
};

export const generateOutlookContactsCsv = (contacts: ContactInfo[]): string => {
  const headers = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Title",
    "Suffix",
    "Company",
    "Job Title",
    "E-mail Address",
    "E-mail 2 Address",
    "Business Phone",
    "Mobile Phone",
    "Home Phone",
    "Business Street",
    "Web Page",
    "Notes",
  ];

  const rows = contacts
    .filter((contact) => {
      return Boolean(normalizeContactString(contact.name));
    })
    .map((contact) => {
      const nameParts = getResolvedNameParts(contact);
      const emails = getResolvedEmails(contact);
      const phones = getResolvedPhones(contact);
      const urls = getResolvedUrls(contact);
      const mobilePhone = phones.find(
        (phone) => phone.type?.toLowerCase() === "mobile",
      );
      const remainingPhones = phones.filter((phone) => phone !== mobilePhone);
      const businessPhone = remainingPhones[0] || phones[0] || null;
      const homePhone =
        remainingPhones.find((phone) => phone !== businessPhone) || null;
      const supplementalNotes: string[] = [];

      urls.slice(1).forEach((entry) => {
        supplementalNotes.push(
          `${entry.label || "Additional URL"}: ${entry.url}`,
        );
      });

      emails.slice(2).forEach((email) => {
        supplementalNotes.push(`Additional email: ${email}`);
      });

      phones
        .filter((phone) => {
          return (
            phone !== mobilePhone &&
            phone !== businessPhone &&
            phone !== homePhone
          );
        })
        .forEach((phone) => {
          supplementalNotes.push(`Additional phone: ${phone.value}`);
        });

      return [
        nameParts.firstName,
        nameParts.middleName,
        nameParts.lastName,
        nameParts.prefix,
        nameParts.suffix,
        normalizeContactString(contact.organization) || "",
        normalizeContactString(contact.title) || "",
        emails[0] || "",
        emails[1] || "",
        businessPhone?.value || "",
        mobilePhone?.value || "",
        homePhone?.value || "",
        normalizeContactString(contact.location) || "",
        urls[0]?.url || "",
        appendSupplementalContactNotes(contact, supplementalNotes),
      ];
    });

  return serializeCsv([headers, ...rows]);
};

export const generateMultiVCard = (contacts: ContactInfo[]): string => {
  return contacts
    .filter((contact) => Boolean(normalizeContactString(contact.name)))
    .map((contact) => generateVCard(contact))
    .join("\r\n");
};

export const buildContactExportFile = (
  contacts: ContactInfo[],
  format: ContactExportFormat,
): ContactExportFile => {
  switch (format) {
    case "google_csv":
      return {
        content: generateGoogleContactsCsv(contacts),
        contentType: "text/csv;charset=utf-8",
        extension: "csv",
      };
    case "outlook_csv":
      return {
        content: generateOutlookContactsCsv(contacts),
        contentType: "text/csv;charset=utf-8",
        extension: "csv",
      };
    case "vcard":
      return {
        content: generateMultiVCard(contacts),
        contentType: "text/vcard;charset=utf-8",
        extension: "vcf",
      };
    default:
      return {
        content: generateGoogleContactsCsv(contacts),
        contentType: "text/csv;charset=utf-8",
        extension: "csv",
      };
  }
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
  const { firstName, middleName, lastName, prefix, suffix } =
    getResolvedNameParts(contact);

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(contact.name)}`,
    `N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};${escapeVCardValue(middleName)};${escapeVCardValue(prefix)};${escapeVCardValue(suffix)}`,
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
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
