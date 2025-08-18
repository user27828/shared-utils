/**
 * Format file size in human readable format with configurable options
 * @param {number} bytes - File size in bytes
 * @param {object} [options] - Formatting options
 * @param {boolean} [options.useBinary=true] - Whether to use binary (1024) or decimal (1000) base
 * @param {number} [options.precision=2] - Number of decimal places to show
 * @param {'short'|'long'|'narrow'} [options.unitStyle='short'] - Unit style
 * @returns {string} Formatted file size
 * @example
 * formatFileSize(1024); // "1 KB"
 * formatFileSize(1024, { useBinary: false }); // "1.02 KB" (decimal)
 * formatFileSize(1024, { unitStyle: 'long' }); // "1 kilobyte"
 * formatFileSize(1024, { precision: 0 }); // "1 KB"
 */
export declare const formatFileSize: (bytes: number, options?: {
    useBinary?: boolean;
    precision?: number;
    unitStyle?: "short" | "long" | "narrow";
}) => string;
/**
 * Sanitize filename based on optionsManager configuration
 * @param {string} filename - Original filename
 * @param {object} [options] - Override options
 * @param {RegExp} [options.regex] - Regex to validate filename
 * @param {string} [options.replace] - Character to replace invalid characters with
 * @returns {string} Sanitized filename
 * @example
 * sanitizeFilename("my file!.txt"); // "my-file-.txt" (with default config)
 * sanitizeFilename("my file!.txt", { filenameRegexReplace: "_" }); // "my_file_.txt"
 */
export declare const sanitizeFilename: (filename: string, options?: {
    regex?: RegExp;
    replace?: string;
}) => string;
/**
 * Convert bytes to specific unit
 * @param {number} bytes - File size in bytes
 * @param {'B'|'KB'|'MB'|'GB'|'TB'|'PB'} unit - Target unit
 * @param {boolean} [useBinary=true] - Whether to use binary (1024) or decimal (1000) base
 * @returns {number} Converted value
 * @example
 * convertBytesToUnit(1024, 'KB'); // 1
 * convertBytesToUnit(1024, 'KB', false); // 1.024
 */
export declare const convertBytesToUnit: (bytes: number, unit: "B" | "KB" | "MB" | "GB" | "TB" | "PB", useBinary?: boolean) => number;
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
 * Validate if a filename is safe/valid
 * @param {string} filename - The filename to validate
 * @param {object} [options] - Validation options
 * @param {RegExp} [options.filenameRegex] - Regex to validate filename
 * @returns {boolean} Whether the filename is valid
 * @example
 * isValidFilename('document.pdf'); // true
 * isValidFilename('document?.pdf'); // false
 */
export declare const isValidFilename: (filename: string, options?: {
    filenameRegex?: RegExp;
}) => boolean;
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
 * Format date in a human-readable format with configurable options
 * @param {string|Date} dateInput - Date string or Date object
 * @param {object} [options] - Formatting options
 * @param {string} [options.locale] - Locale string (e.g., 'en-US')
 * @param {Object} [options.formatOptions] - Intl.DateTimeFormat options (dateStyle, timeStyle, etc.)
 * @returns {string} Formatted date string
 * @example
 * formatDate('2023-08-03T12:34:56Z');
 * formatDate(new Date(), { locale: 'en-GB', formatOptions: { dateStyle: 'medium', timeStyle: 'short' } });
 */
export declare const formatDate: (dateInput: string | Date, options?: {
    locale?: string;
    formatOptions?: Intl.DateTimeFormatOptions;
}) => string;
//# sourceMappingURL=functions.d.ts.map