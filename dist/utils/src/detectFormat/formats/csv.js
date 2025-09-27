export const csvCheck = {
    quickCheck: (text) => {
        const trimmed = text.trim();
        // Exclusion patterns: HTML/XML content
        if (trimmed.toLowerCase().startsWith("<!doctype") ||
            trimmed.startsWith("<?xml") ||
            /<[a-z][a-z0-9]*[^>]*>/i.test(trimmed.slice(0, 200))) {
            return false;
        }
        // Exclusion pattern: YAML front matter
        if (trimmed.startsWith("---")) {
            return false;
        }
        return text.includes(",");
    },
    comprehensiveCheck: (text) => {
        const trimmed = text.trim();
        // Additional exclusions for comprehensive check
        if (trimmed.toLowerCase().startsWith("<!doctype") ||
            trimmed.startsWith("<?xml") ||
            /<[a-z][a-z0-9]*[^>]*>/i.test(trimmed.slice(0, 500)) ||
            trimmed.startsWith("---")) {
            return false;
        }
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
            return false;
        }
        const commaLines = lines.filter((l) => l.includes(",")).length;
        return commaLines / lines.length > 0.8;
    },
    quickConfidence: 0.4,
    compConfidence: 0.8,
    mimeType: "text/csv",
    extension: "csv",
    reasons: [
        "Comma delimiter present",
        "Majority of lines contain commas indicating CSV structure",
    ],
};
