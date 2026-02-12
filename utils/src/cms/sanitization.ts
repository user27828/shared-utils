/**
 * CMS Sanitization — shared-utils
 *
 * Server-side HTML sanitization for safe public rendering.
 * Uses sanitize-html with a carefully curated allowlist.
 */
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "a",
  "p",
  "div",
  "span",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "figure",
  "figcaption",
  "video",
  "source",
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height", "loading"],
  video: ["src", "poster", "width", "height", "controls", "preload"],
  source: ["src", "type"],
  "*": ["class", "data-fm-uid", "data-fm-variant"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto"];

const isAllowedUrl = (url: string): boolean => {
  const trimmed = String(url || "").trim();
  if (!trimmed) {
    return false;
  }
  // Relative URLs are allowed
  if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return true;
  }
  // Check scheme
  try {
    const parsed = new URL(trimmed);
    return ALLOWED_SCHEMES.includes(parsed.protocol.replace(":", ""));
  } catch {
    // Not an absolute URL; allow as relative
    return !trimmed.includes(":");
  }
};

/**
 * Sanitize CMS HTML content for safe public rendering.
 */
export const sanitizeCmsHtml = (html: string): string => {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => {
        const href = String(attribs.href || "").trim();
        if (href && !isAllowedUrl(href)) {
          return { tagName, attribs: { ...attribs, href: "" } };
        }
        if (attribs.target === "_blank") {
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
      img: (tagName: string, attribs: Record<string, string>) => {
        const src = String(attribs.src || "").trim();
        if (src && !isAllowedUrl(src)) {
          return { tagName, attribs: { ...attribs, src: "" } };
        }
        return { tagName, attribs };
      },
    },
  });
};

// Lazy-loaded marked instance
let markedInstance: typeof import("marked") | null = null;

const getMarked = async (): Promise<typeof import("marked")> => {
  if (!markedInstance) {
    markedInstance = await import("marked");
  }
  return markedInstance;
};

/**
 * Render markdown to sanitized HTML.
 * Uses marked for parsing, then sanitize-html for safety.
 */
export const renderMarkdownToSanitizedHtml = async (
  markdown: string,
): Promise<string> => {
  const { marked } = await getMarked();
  const raw = await marked(markdown);
  return sanitizeCmsHtml(raw);
};
