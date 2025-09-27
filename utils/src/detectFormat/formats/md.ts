import type { FormatCheck } from "../types";

export const mdCheck: FormatCheck = {
  quickCheck: (text: string) =>
    /^#{1,6} /gm.test(text) ||
    /\*\*/.test(text) ||
    /```/.test(text) ||
    /\[.*\]\(/.test(text) ||
    /^\s*[-*+]\s/gm.test(text) ||
    /---\n/.test(text) ||
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

    // Tables: give higher score for clear table structures
    const tableScore =
      tables > 2
        ? 2
        : tables > 1 || (tables > 0 && tableDelimiters > 0)
          ? 1
          : 0;

    return headers + bold + italic + code + links + lists + tableScore > 1;
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
