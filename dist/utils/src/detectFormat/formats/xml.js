export const xmlCheck = {
    quickCheck: (text) => {
        const trimmed = text.trim();
        if (trimmed.startsWith("<?xml")) {
            return true;
        }
        // Exclude common HTML tags
        if (/<(html|body|div|p|span|img|br|meta|head|title)/i.test(trimmed))
            return false;
        // Require XML-specific: namespace or attribute patterns
        return (/<([a-zA-Z_:][a-zA-Z0-9_.:-]*)(\s+[^>]*xmlns[^>]*)?>/.test(text.slice(0, 100)) ||
            /<[^>]+xmlns:/.test(text.slice(0, 100)) ||
            (/<[^>]*\/>/.test(text.slice(0, 100)) && /<[^>]*xmlns/.test(text)));
    },
    comprehensiveCheck: (text) => {
        const openTags = (text.match(/<([a-zA-Z_:][a-zA-Z0-9_.:-]*)/g) || [])
            .length;
        const closeTags = (text.match(/<\/([a-zA-Z_:][a-zA-Z0-9_.:-]*)/g) || [])
            .length;
        const hasRoot = /<([a-zA-Z_:][a-zA-Z0-9_.:-]*)([^>]*)>/.test(text);
        // Exclude HTML
        if (/<(html|body|div|p)/i.test(text)) {
            return false;
        }
        return openTags > 1 && Math.abs(openTags - closeTags) < 2 && hasRoot;
    },
    quickConfidence: 0.6,
    compConfidence: 0.9,
    mimeType: "application/xml",
    extension: "xml",
    reasons: [
        "XML declaration or namespace-tagged element detected (excluding HTML)",
        "Well-formed XML structure with root element (non-HTML)",
    ],
};
