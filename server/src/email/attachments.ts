export type EmailAttachmentContentEncoding = "utf8" | "base64";

export interface EmailAttachmentLike {
  content: Buffer | string;
  contentEncoding?: EmailAttachmentContentEncoding;
  contentType?: string;
}

const DATA_URL_PATTERN =
  /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/i;
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/_-]{4})*(?:[A-Za-z0-9+/_-]{2}==|[A-Za-z0-9+/_-]{3}=)?$/;

const normalizeBase64String = (value: string): string => {
  return value.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
};

const decodeDataUrlSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

interface ParsedAttachmentStringContent {
  content: string;
  contentEncoding: EmailAttachmentContentEncoding;
  contentType?: string;
}

const parseAttachmentStringContent = (
  attachment: EmailAttachmentLike,
): ParsedAttachmentStringContent | undefined => {
  if (typeof attachment.content !== "string") {
    return undefined;
  }

  const dataUrlMatch = attachment.content.match(DATA_URL_PATTERN);
  if (dataUrlMatch) {
    return {
      content: dataUrlMatch[3],
      contentEncoding: dataUrlMatch[2] ? "base64" : "utf8",
      contentType: dataUrlMatch[1] || undefined,
    };
  }

  return {
    content: attachment.content,
    contentEncoding: attachment.contentEncoding || "utf8",
  };
};

const decodeBase64Content = (content: string): Buffer => {
  const normalizedContent = normalizeBase64String(content);

  if (!normalizedContent) {
    return Buffer.alloc(0);
  }

  if (!BASE64_PATTERN.test(normalizedContent)) {
    throw new Error("Attachment content is marked as base64 but is invalid");
  }

  return Buffer.from(normalizedContent, "base64");
};

export const getAttachmentContentBuffer = (
  attachment: EmailAttachmentLike,
): Buffer => {
  if (Buffer.isBuffer(attachment.content)) {
    return attachment.content;
  }

  const parsed = parseAttachmentStringContent(attachment);
  if (!parsed) {
    return Buffer.alloc(0);
  }

  if (parsed.contentEncoding === "base64") {
    return decodeBase64Content(parsed.content);
  }

  return Buffer.from(decodeDataUrlSegment(parsed.content), "utf8");
};

export const getAttachmentContentBase64 = (
  attachment: EmailAttachmentLike,
): string => {
  return getAttachmentContentBuffer(attachment).toString("base64");
};

export const getAttachmentContentType = (
  attachment: EmailAttachmentLike,
): string | undefined => {
  if (attachment.contentType) {
    return attachment.contentType;
  }

  return parseAttachmentStringContent(attachment)?.contentType;
};

export const getAttachmentByteLength = (
  attachment: EmailAttachmentLike,
): number => {
  return getAttachmentContentBuffer(attachment).length;
};
