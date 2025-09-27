import type { FormatCheck } from "./types.js";
import { mdCheck } from "./formats/md.js";
import { htmlCheck } from "./formats/html.js";
import { jsonCheck } from "./formats/json.js";
import { xmlCheck } from "./formats/xml.js";
import { csvCheck } from "./formats/csv.js";
import { yamlCheck } from "./formats/yaml.js";
import { txtCheck } from "./formats/txt.js";
import { texCheck } from "./formats/tex.js";

/**
 * File format utilities
 */
// Formats to check, where there are definition files in `./formats/{format}.ts`
const textFormatChecks = [
  "md",
  "html",
  "json",
  "xml",
  "csv",
  "yaml",
  "txt",
  "tex",
];

interface FormatResponse {
  format: string;
  mimeType: string;
  extension: string;
  confidence?: number;
  reasons?: string[];
}

/**
 * Detect the file format from the given text.
 * @param {string} [content] - Text format for analysis - this or filePath is required
 * @param {string} [filePath] - Get content from filesystem path - this or content is required
 * @param {string[]} [formats] - Optional list of formats to check against (defaults to all known text formats)
 * @returns {Promise<FormatResponse>} Object of detected format properties
 */
export const detectFormatFromText = async ({
  content,
  filePath,
  formats = [],
}: {
  content?: string;
  filePath?: string;
  formats?: string[];
}): Promise<FormatResponse> => {
  // `content` or `filePath` is required
  if (content === undefined && filePath === undefined) {
    throw new Error("Either `content` or `filePath` is required");
  }

  // Set defaults after validation
  content = content || "";
  filePath = filePath || "";

  if (filePath && !content) {
    const isNode = typeof process !== "undefined" && !!process.versions?.node;
    if (!isNode) {
      throw new Error(
        "Reading from filePath is only supported in Node.js environments.",
      );
    }
    const fs = await import("fs/promises");
    content = await fs.readFile(filePath, "utf8");
  }

  const checkFormats = formats.length ? formats : textFormatChecks;

  const sample = content.slice(0, 2000);

  // Static format checks
  const formatChecks: Record<string, FormatCheck> = {
    md: mdCheck,
    html: htmlCheck,
    json: jsonCheck,
    xml: xmlCheck,
    csv: csvCheck,
    yaml: yamlCheck,
    txt: txtCheck,
    tex: texCheck,
  };

  let bestMatch: FormatResponse = {
    format: "txt",
    mimeType: "text/plain",
    extension: "txt",
    confidence: 0.1,
    reasons: [
      "Defaulted to plain text format - low confidence level for all other formats",
    ],
  };

  for (const format of checkFormats) {
    const check = formatChecks[format as keyof typeof formatChecks];
    if (!check) continue;

    const quickMatch = check.quickCheck(sample);
    if (!quickMatch) continue;

    let thisConfidence: number;
    let thisReasons: string[];

    if (check.comprehensiveCheck) {
      const compText = format === "json" ? content : sample;
      const compMatch = check.comprehensiveCheck(compText);
      if (!compMatch) continue; // Skip if comprehensive fails - avoid false positives
      thisConfidence = check.compConfidence;
      thisReasons = check.reasons;
    } else {
      // Fallback for formats without comp (none currently, but for future)
      thisConfidence = check.quickConfidence;
      thisReasons = check.reasons;
    }

    if (thisConfidence > (bestMatch.confidence || 0)) {
      bestMatch = {
        format,
        mimeType: check.mimeType,
        extension: check.extension,
        confidence: thisConfidence,
        reasons: thisReasons,
      };
    }
  }

  return bestMatch;
};
