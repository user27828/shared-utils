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
export declare const detectFormatFromText: ({ content, filePath, formats, }: {
    content?: string;
    filePath?: string;
    formats?: string[];
}) => Promise<FormatResponse>;
export {};
//# sourceMappingURL=index.d.ts.map