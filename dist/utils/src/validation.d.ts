/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @param {boolean} [includeDot=false] - Whether to include the dot in the extension
 * @returns {string} File extension
 * @example
 * getFileExtension('document.pdf'); // '.pdf'
 * getFileExtension('document.pdf', false); // 'pdf'
 * getFileExtension('document'); // ''
 */
export declare const getFileExtension: (filename: string, includeDot?: boolean) => string;
/**
 * Remove file extension from filename
 * @param {string} filename - The filename
 * @returns {string} Filename without extension
 * @example
 * removeFileExtension('document.pdf'); // 'document'
 * removeFileExtension('archive.tar.gz'); // 'archive.tar'
 */
export declare const removeFileExtension: (filename: string) => string;
/**
 * Simple email validation - this is too permissive vs RFC5322, but also assumes that
 * the user places some importance to having a valid email address.  Further strictness
 * can be used with strict=true, but it's still not as strict as RFC5322
 * @param {string} email - Email address
 * @param {boolean} [strict=false] - Whether to use strict validation - closer to RFC5322.
 * @returns {boolean}
 */
export declare const isValidEmail: (email: string, strict?: boolean) => boolean;
/**
 * Normalize a URL-like string for storage and display.
 *
 * This helper is intentionally conservative: it only adds a protocol when the
 * input already looks like a hostname (e.g. `facebook.com/...` or `www.example.com`).
 *
 * Behavior:
 * - Trims whitespace
 * - Leaves `http://` / `https://` unchanged
 * - Converts protocol-relative URLs (`//example.com`) to `https://example.com`
 * - Adds `https://` when the input starts with `www.` or looks domain-like
 * - Returns `""` for null/undefined/empty
 *
 * @example
 * normalizeUrl("facebook.com/agentmdotcom"); // "https://facebook.com/agentmdotcom"
 * normalizeUrl("www.example.com"); // "https://www.example.com"
 * normalizeUrl("https://example.com"); // "https://example.com"
 */
export declare const normalizeUrl: (url: string | null | undefined) => string;
