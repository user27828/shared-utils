export const yamlCheck = {
    quickCheck: (text) => {
        const trimmed = text.trim();
        // Exclusion patterns: HTML/XML content
        if (trimmed.toLowerCase().startsWith("<!doctype") ||
            trimmed.startsWith("<?xml") ||
            /<[a-z][a-z0-9]*[^>]*>/i.test(trimmed.slice(0, 200))) {
            return false;
        }
        // Check for YAML front matter
        if (trimmed.startsWith("---")) {
            return true;
        }
        // Exclude JavaScript object literals - they start with { and have unquoted keys
        if (trimmed.startsWith("{") && /[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(text)) {
            return false;
        }
        const colonCount = (text.match(/:\s/g) || []).length;
        const listCount = (text.match(/^\s*-\s/gm) || []).length;
        return colonCount > 0 || listCount > 0;
    },
    comprehensiveCheck: (text) => {
        // Exclusion patterns: HTML/XML content
        if (text.trim().toLowerCase().startsWith("<!doctype") ||
            text.trim().startsWith("<?xml") ||
            /<[a-z][a-z0-9]*[^>]*>/i.test(text.slice(0, 500))) {
            return false;
        }
        // Exclude content with HTML style blocks (CSS properties)
        if (/<style[^>]*>[\s\S]*<\/style>/i.test(text)) {
            return false;
        }
        // Exclude JavaScript object literals (unquoted keys in braces)
        if (text.trim().startsWith("{") &&
            /[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(text)) {
            return false;
        }
        // Check for decorative patterns that suggest plain text formatting
        const decorativeLines = (text.match(/^\s*[*\-=_]{3,}\s*$/gm) || []).length;
        const isLikelyPlainTextFormatting = decorativeLines > 2; // Multiple decorative lines suggest plain text
        // If it looks like plain text formatting, be much more strict about YAML detection
        if (isLikelyPlainTextFormatting) {
            // Only consider it YAML if it has clear YAML front matter or very structured data patterns
            if (text.trim().startsWith("---") && text.includes("---", 3)) {
                return true; // Clear YAML front matter
            }
            // For plain text with decorative formatting, require very clear YAML structure
            const structuredData = (text.match(/^\s*[a-z_][a-z0-9_]*:\s*$/gm) || [])
                .length; // Keys on their own lines
            const nestedStructure = /^\s{2,}[a-z_][a-z0-9_]*:\s/.test(text); // Indented nested structure
            return structuredData > 3 && nestedStructure; // Require clear structure
        }
        // Check for YAML front matter format
        if (text.trim().startsWith("---") && text.includes("---", 3)) {
            const frontMatterEnd = text.indexOf("---", 3);
            const frontMatter = text.slice(3, frontMatterEnd);
            const keyValue = (frontMatter.match(/^\s*[^:]+:\s+/gm) || []).length;
            if (keyValue > 0) {
                return true;
            }
        }
        const keyValue = (text.match(/^\s*[^:]+:\s+/gm) || []).length;
        const listItems = (text.match(/^\s*-\s+/gm) || []).length;
        const indented = /:\s*\n\s+[^\s]/.test(text);
        return keyValue > 1 || (listItems > 1 && indented);
    },
    quickConfidence: 0.5,
    compConfidence: 0.85,
    mimeType: "text/yaml",
    extension: "yaml",
    reasons: [
        "YAML key-value pair or list item detected",
        "Multiple structured YAML elements with indentation confirmed",
    ],
};
