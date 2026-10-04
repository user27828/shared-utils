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
export const getFileExtension = (filename, includeDot = false) => {
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex === -1 || lastDotIndex === 0) {
        return "";
    }
    const extension = filename.substring(lastDotIndex);
    return includeDot ? extension : extension.substring(1);
};
/**
 * Remove file extension from filename
 * @param {string} filename - The filename
 * @returns {string} Filename without extension
 * @example
 * removeFileExtension('document.pdf'); // 'document'
 * removeFileExtension('archive.tar.gz'); // 'archive.tar'
 */
export const removeFileExtension = (filename) => {
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex === -1 || lastDotIndex === 0) {
        return filename;
    }
    return filename.substring(0, lastDotIndex);
};
/**
 * Simple email validation - this is too permissive vs RFC5322, but also assumes that
 * the user places some importance to having a valid email address.  Further strictness
 * can be used with strict=true, but it's still not as strict as RFC5322
 * @param {string} email - Email address
 * @param {boolean} [strict=false] - Whether to use strict validation - closer to RFC5322.
 * @returns {boolean}
 */
export const isValidEmail = (email, strict = false) => !strict
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    : /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
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
export const normalizeUrl = (url) => {
    if (!url) {
        return "";
    }
    const trimmed = url.trim();
    if (!trimmed) {
        return "";
    }
    // Already has a protocol
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    // Protocol-relative URLs
    if (trimmed.startsWith("//")) {
        return `https:${trimmed}`;
    }
    // Has www. prefix but no protocol
    if (/^www\./i.test(trimmed)) {
        return `https://${trimmed}`;
    }
    // Appears to be a domain-like string
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
        return `https://${trimmed}`;
    }
    // Return as-is for other cases (might be a username, etc.)
    return trimmed;
};
