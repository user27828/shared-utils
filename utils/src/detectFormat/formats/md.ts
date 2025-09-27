import type { FormatCheck } from "../types";

export const mdCheck: FormatCheck = {
  quickCheck: (text: string) =>
    /^#{1,6} /gm.test(text) ||
    /\*\*/.test(text) ||
    /```/.test(text) ||
    /\[.*\]\(/.test(text) ||
    /^\s*[-*+]\s+[^:]+$/gm.test(text) || // More specific list pattern, exclude lines ending with colons
    /^---\s*$|^---\s*\n/gm.test(text) || // YAML front matter separators only (not underlines)
    /^\s*\|.*\|/gm.test(text), // Table syntax
  comprehensiveCheck: (text: string) => {
    const headers = (text.match(/^#{1,6} /gm) || []).length;
    const bold = (text.match(/\*\*[^**]+\*\*/g) || []).length;
    const italic = (text.match(/\*[^ *]+\*/g) || []).length;
    const code = (text.match(/```[\s\S]*?```/g) || []).length;
    const links = (text.match(/\[.*\]\(.*\)/g) || []).length;

    // Be more specific about lists - exclude YAML-style lists with colons
    const mdLists = (text.match(/^\s*[-*+]\s+[^:]+$/gm) || []).length;
    const numberedLists = (text.match(/^\s*\d+\.\s+/gm) || []).length;
    const lists = mdLists + numberedLists;

    const tables = (text.match(/^\s*\|.*\|/gm) || []).length;
    const tableDelimiters = (text.match(/^\s*\|[-\s:|]+\|/gm) || []).length;

    // Proper YAML front matter separators (not underlines)
    const yamlSeparators = (text.match(/^---\s*$|^---\s*\n/gm) || []).length;

    // Tables: give higher score for clear table structures
    const tableScore =
      tables > 2
        ? 2
        : tables > 1 || (tables > 0 && tableDelimiters > 0)
          ? 1
          : 0;

    // More conservative detection - require multiple distinct Markdown features
    const markdownScore =
      headers +
      bold +
      italic +
      code +
      links +
      lists +
      tableScore +
      yamlSeparators;

    // Check for decorative patterns that suggest plain text formatting
    const decorativeLines = (text.match(/^\s*[*\-=_]{3,}\s*$/gm) || []).length;
    const isLikelyPlainTextFormatting = decorativeLines > 1; // Multiple decorative lines suggest plain text

    // Require at least 2 different types of Markdown features for high confidence
    const featureTypes = [
      headers > 0,
      bold > 0 && !isLikelyPlainTextFormatting, // Discount bold if it looks like decorative formatting
      italic > 0,
      code > 0,
      links > 0,
      lists > 0 && !isLikelyPlainTextFormatting, // Discount lists if it looks like plain text formatting
      tableScore > 0,
      yamlSeparators > 0,
    ].filter(Boolean).length;

    // Be very conservative: require strong indicators or multiple diverse features
    return (
      code > 0 || // Code blocks are strong indicators
      links > 1 || // Multiple links suggest Markdown
      headers > 2 || // Multiple headers suggest Markdown
      (featureTypes >= 3 && !isLikelyPlainTextFormatting) || // Multiple features without plain text formatting
      (tables > 0 && tableDelimiters > 0) // Proper table structure
    );
  },
  quickConfidence: 0.6,
  compConfidence: 0.9,
  mimeType: "text/markdown",
  extension: "md",
  reasons: [
    "Markdown syntax like headers, bold, code, links, or lists detected",
    "Multiple Markdown elements confirmed",
  ],
};
