import type { FormatCheck } from "../types";

export const csvCheck: FormatCheck = {
  quickCheck: (text: string) => text.includes(","),
  comprehensiveCheck: (text: string) => {
    const lines = text.split("\n").filter((l: string) => l.trim());
    if (lines.length < 2) {
      return false;
    }
    const commaLines = lines.filter((l: string) => l.includes(",")).length;
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
