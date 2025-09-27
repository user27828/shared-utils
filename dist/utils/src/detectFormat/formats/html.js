export const htmlCheck = {
    quickCheck: (text) => {
        const trimmed = text.trim();
        return (trimmed.toLowerCase().startsWith("<!doctype html>") ||
            /<([a-z][a-z0-9]*)/i.test(text.slice(0, 1000)));
    },
    comprehensiveCheck: (text) => {
        const openTags = (text.match(/<([a-z][a-z0-9]*)/gi) || []).length;
        const closeTags = (text.match(/<\/([a-z][a-z0-9]*)/gi) || []).length;
        // Exclude XML: reject if has XML declaration or XML namespaces
        if (text.trim().startsWith("<?xml") || /xmlns[:=]/i.test(text)) {
            return false;
        }
        // Exclude Markdown: if it has multiple MD markers, let MD win
        const mdMarkers = [
            /^#{1,6} /gm, // headers
            /\*\*[^*]+\*\*/g, // bold
            /\[.*\]\(.*\)/g, // links
            /```/g, // code blocks
            /^\s*[-*+]\s+/gm, // lists
        ];
        const mdMatches = mdMarkers.reduce((count, pattern) => count + (text.match(pattern) || []).length, 0);
        if (mdMatches > 1) {
            return false; // Let markdown handler take precedence
        }
        // HTML-specific: common attributes or self-closing tags
        const hasHtmlAttrs = /class=|id=|href=|src=|style=|alt=|title=/i.test(text) ||
            /<[^>]*\/>/i.test(text);
        const hasDoctype = text.trim().toLowerCase().startsWith("<!doctype html>");
        if (hasDoctype && openTags > 0 && hasHtmlAttrs) {
            return true;
        }
        // For HTML detection: need at least 1 tag
        if (openTags === 0) {
            return false;
        }
        // For snippets: need either HTML-specific attributes OR multiple balanced tags
        if (!hasHtmlAttrs && openTags < 2) {
            return false;
        }
        // Check if tags are reasonably balanced (allowing for self-closing tags)
        const tagBalance = Math.abs(openTags - closeTags) <= Math.max(1, openTags * 0.5);
        return tagBalance;
    },
    quickConfidence: 0.7,
    compConfidence: 0.95,
    mimeType: "text/html",
    extension: "html",
    reasons: [
        "HTML doctype or opening tag detected in snippet",
        "Balanced tags with HTML-specific attributes or self-closing elements (distinguishes from XML)",
    ],
};
