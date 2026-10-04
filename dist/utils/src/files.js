import { OptionsManager, optionsManager } from "./options-manager.js";
import { nanoid } from "nanoid";
if (!optionsManager.getManager("files")) {
    optionsManager.registerManager("files", new OptionsManager("files", {}));
}
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
export const formatFileSize = (bytes, options) => {
    if (bytes === 0) {
        return "0 Bytes";
    }
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "0 Bytes";
    }
    // Read from optionsManager if available, then apply overrides from options param
    const globalOptions = optionsManager.getOption("files") || {};
    const useBinary = options?.useBinary ?? globalOptions.size?.useBinary ?? false;
    const precision = options?.precision ?? globalOptions.size?.precision ?? 2;
    const unitStyle = options?.unitStyle ?? globalOptions.size?.unitStyle ?? "short";
    const base = useBinary ? 1024 : 1000;
    // Define unit arrays based on style and base
    let units;
    if (unitStyle === "long") {
        units = useBinary
            ? [
                "bytes",
                "kibibytes",
                "mebibytes",
                "gibibytes",
                "tebibytes",
                "pebibytes",
            ]
            : [
                "bytes",
                "kilobytes",
                "megabytes",
                "gigabytes",
                "terabytes",
                "petabytes",
            ];
    }
    else if (unitStyle === "narrow") {
        units = ["B", "K", "M", "G", "T", "P"];
    }
    else {
        // 'short' style (default)
        units = useBinary
            ? ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB"]
            : ["Bytes", "KB", "MB", "GB", "TB", "PB"];
    }
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
    const finalIndex = Math.min(unitIndex, units.length - 1);
    const value = bytes / Math.pow(base, finalIndex);
    // Handle special case for bytes (no decimal places needed)
    if (finalIndex === 0) {
        return `${bytes} ${units[0]}`;
    }
    // Format the number with the specified precision
    const formattedValue = precision === 0 ? Math.round(value).toString() : value.toFixed(precision);
    // Handle pluralization for long style
    const unit = unitStyle === "long" && value === 1 && finalIndex > 0
        ? units[finalIndex].replace(/s$/, "") // Remove 's' for singular
        : units[finalIndex];
    return `${formattedValue} ${unit}`;
};
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
export const sanitizeFilename = (filename, options) => {
    // Read from optionsManager if available, then apply overrides from options param
    const globalOptions = optionsManager.getOption("files") || {};
    const filenameRegex = options?.regex ?? globalOptions?.filenameRegex ?? /^[a-zA-Z0-9\-_.]+$/;
    const rawReplace = options?.replace ?? globalOptions?.filenameRegexReplace ?? "-";
    // Determine replacement string to insert when swapping invalid chars.
    // If the caller passed a RegExp (e.g. /-+/g) we default to '-' as the inserted
    // character but will use the RegExp later to normalize repeated occurrences.
    const filenameRegexReplace = typeof rawReplace === "string"
        ? rawReplace
        : typeof rawReplace === "object"
            ? "-"
            : "-";
    const baseName = filename.split(".").slice(0, -1).join(".");
    const extension = filename.split(".").pop() || "";
    // Build a replacement regex that targets characters NOT allowed by filenameRegex.
    // If filenameRegex is a simple character-class based regex (e.g. /^[a-zA-Z0-9\-_.]+$/)
    // we can invert the class to replace invalid characters. For complex regexes,
    // fall back to a conservative allowed-chars set.
    let invalidCharRegex;
    try {
        const source = filenameRegex.source;
        // If the regex is anchored and contains a simple character class like [a-zA-Z0-9\-_.]+,
        // extract the class and invert it.
        const classMatch = source.match(/\[([^\]]+)\]/);
        if (classMatch && classMatch[1]) {
            // Build negated class - escape any forward slash
            const negated = `[^${classMatch[1]}]`;
            invalidCharRegex = new RegExp(negated, "g");
        }
        else {
            // Fallback conservative regex: anything not alnum, hyphen, underscore, or dot
            invalidCharRegex = /[^a-zA-Z0-9\-_.]/g;
        }
    }
    catch {
        invalidCharRegex = /[^a-zA-Z0-9\-_.]/g;
    }
    // Replace invalid characters in the base name
    const sanitizedBaseName = baseName.replace(invalidCharRegex, filenameRegexReplace);
    // If caller supplied a RegExp for replace, use it to normalize repeats (e.g. /-+/g -> '-')
    let normalizedBaseName = sanitizedBaseName;
    if (rawReplace instanceof RegExp) {
        try {
            normalizedBaseName = normalizedBaseName.replace(rawReplace, filenameRegexReplace);
        }
        catch (e) {
            // Fall back to simple normalization below if the provided RegExp fails
            normalizedBaseName = sanitizedBaseName;
        }
    }
    // Normalize repeated replacement characters (e.g., multiple spaces -> single '-')
    // Escape the replacement string for use in a dynamic RegExp
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const repEsc = escapeRegExp(filenameRegexReplace);
    normalizedBaseName = normalizedBaseName.replace(new RegExp(`${repEsc}{2,}`, "g"), filenameRegexReplace);
    // Trim replacement characters from ends
    const trimmedBaseName = normalizedBaseName.replace(new RegExp(`^${filenameRegexReplace}+|${filenameRegexReplace}+$`, "g"), "");
    const testFilename = trimmedBaseName + (extension ? `.${extension}` : "");
    if (!filenameRegex.test(testFilename) || trimmedBaseName.length === 0) {
        const uniqueId = `${nanoid(6)}-${Date.now()}`;
        return `file_${uniqueId}${extension ? `.${extension}` : ""}`;
    }
    return testFilename;
};
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
export const convertBytesToUnit = (bytes, unit, useBinary = true) => {
    if (unit === "B") {
        return bytes;
    }
    const base = useBinary ? 1024 : 1000;
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    const unitIndex = units.indexOf(unit);
    if (unitIndex === -1) {
        throw new Error(`Invalid unit: ${unit}`);
    }
    return bytes / Math.pow(base, unitIndex);
};
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
export const isValidFilename = (filename, options) => {
    // Read from optionsManager if available, then apply overrides from options param
    const globalOptions = optionsManager.getOption("files") || {};
    const filenameRegex = options?.filenameRegex ??
        globalOptions?.filenameRegex ??
        /^[a-zA-Z0-9\-_.]+$/;
    return filenameRegex.test(filename);
};
