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
    replace?: string | RegExp;
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
