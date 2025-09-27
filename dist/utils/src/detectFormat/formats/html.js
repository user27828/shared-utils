export const htmlCheck = {
    quickCheck: (text) => {
        const trimmed = text.trim();
        // Exclude XML first (XML is strictly defined)
        if (trimmed.startsWith("<?xml")) {
            return false;
        }
        // Handle truncated content (head + tail sample)
        const isTruncatedSample = text.includes("[CONTENT_TRUNCATED]");
        let actualStart = trimmed;
        let actualEnd = trimmed;
        if (isTruncatedSample) {
            const parts = text.split("[CONTENT_TRUNCATED]");
            if (parts.length >= 2) {
                actualStart = parts[0].trim();
                actualEnd = parts[parts.length - 1].trim();
            }
        }
        // Strong indicator: starts and ends with tags (but not XML)
        const startsWithTag = /^<[a-z!][^>]*>/i.test(actualStart);
        const endsWithTag = /<\/[a-z][^>]*>$|<[^>]*\/>$|>$/i.test(actualEnd);
        if (startsWithTag && endsWithTag) {
            return true; // Very strong HTML indicator if not XML
        }
        // DOCTYPE is always HTML
        if (trimmed.toLowerCase().startsWith("<!doctype html>")) {
            return true;
        }
        // Look for HTML tags in the first portion
        return /<([a-z][a-z0-9]*)/i.test(text.slice(0, 1000));
    },
    comprehensiveCheck: (text) => {
        const trimmed = text.trim();
        // Exclude XML first (XML is strictly defined)
        if (trimmed.startsWith("<?xml") || /xmlns[:=]/i.test(text)) {
            return false;
        }
        // Handle truncated content (head + tail sample)
        const isTruncatedSample = text.includes("[CONTENT_TRUNCATED]");
        let actualStart = trimmed;
        let actualEnd = trimmed;
        if (isTruncatedSample) {
            const parts = text.split("[CONTENT_TRUNCATED]");
            if (parts.length >= 2) {
                actualStart = parts[0].trim();
                actualEnd = parts[parts.length - 1].trim();
            }
        }
        // Very strong indicator: content is fully enclosed in tags (and not XML)
        const startsWithTag = /^<[a-z!][^>]*>/i.test(actualStart);
        const endsWithTag = /<\/[a-z][^>]*>$|<[^>]*\/>$|>$/i.test(actualEnd);
        if (startsWithTag && endsWithTag) {
            // For tag-enclosed content, still check tag balance to avoid false positives
            const openTags = (text.match(/<([a-z][a-z0-9]*)/gi) || []).length;
            const closeTags = (text.match(/<\/([a-z][a-z0-9]*)/gi) || []).length;
            const tagBalance = Math.abs(openTags - closeTags) <= Math.max(1, openTags * 0.5);
            // Only return true for well-formed tag-enclosed content
            if (tagBalance && openTags > 0) {
                return true; // Very high confidence for well-formed tag-enclosed content
            }
        }
        const openTags = (text.match(/<([a-z][a-z0-9]*)/gi) || []).length;
        const closeTags = (text.match(/<\/([a-z][a-z0-9]*)/gi) || []).length;
        // HTML-specific: common attributes or self-closing tags
        const hasHtmlAttrs = /class=|id=|href=|src=|style=|alt=|title=/i.test(text) ||
            /<[^>]*\/>/i.test(text);
        const hasDoctype = text.trim().toLowerCase().startsWith("<!doctype html>");
        // Strong HTML indicators take precedence over Markdown patterns
        if (hasDoctype || (openTags > 3 && hasHtmlAttrs)) {
            // Check if tags are reasonably balanced (allowing for self-closing tags)
            const tagBalance = Math.abs(openTags - closeTags) <= Math.max(1, openTags * 0.5);
            return tagBalance && openTags > 0;
        }
        // Exclude Markdown: if it has strong MD markers, let MD win (even with HTML)
        const mdMarkers = [
            /^#{1,6} /gm, // headers
            /\*\*[^*]+\*\*/g, // bold
            /\[.*\]\(.*\)/g, // links
            /```/g, // code blocks
            /^\s*[-*+]\s+/gm, // lists
        ];
        const mdMatches = mdMarkers.reduce((count, pattern) => count + (text.match(pattern) || []).length, 0);
        // If content has strong Markdown indicators, let Markdown win
        if (mdMatches > 2) {
            return false; // Let markdown handler take precedence
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
