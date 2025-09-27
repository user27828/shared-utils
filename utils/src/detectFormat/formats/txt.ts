import type { FormatCheck } from "../types";

export const txtCheck: FormatCheck = {
  quickCheck: (): boolean => true,
  comprehensiveCheck: (): boolean => true,
  quickConfidence: 0.1,
  compConfidence: 0.1,
  mimeType: "text/plain",
  extension: "txt",
  reasons: [
    "Default plain text fallback - no specific format markers detected",
  ],
};
