/**
 * Sanitize CMS HTML content for safe public rendering.
 */
export declare const sanitizeCmsHtml: (html: string) => string;
/**
 * Render markdown to sanitized HTML.
 * Uses marked for parsing, then sanitize-html for safety.
 */
export declare const renderMarkdownToSanitizedHtml: (markdown: string) => Promise<string>;
//# sourceMappingURL=sanitization.d.ts.map