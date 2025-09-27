import type { FormatCheck } from "../types";

export const yamlCheck: FormatCheck = {
  quickCheck: (text: string) => {
    const trimmed = text.trim();
    // Check for YAML front matter
    if (trimmed.startsWith("---")) {
      return true;
    }

    // Exclude JavaScript object literals - they start with { and have unquoted keys
    if (trimmed.startsWith("{") && /[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(text))
      return false;

    const colonCount = (text.match(/:\s/g) || []).length;
    const listCount = (text.match(/^\s*-\s/gm) || []).length;
    return colonCount > 0 || listCount > 0;
  },
  comprehensiveCheck: (text: string) => {
    // Exclude JavaScript object literals (unquoted keys in braces)
    if (
      text.trim().startsWith("{") &&
      /[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(text)
    )
      return false;

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
