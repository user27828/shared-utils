import { optionsManager } from "./options-manager.js";
import { nanoid } from "nanoid";

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
export const formatFileSize = (
  bytes: number,
  options?: {
    useBinary?: boolean;
    precision?: number;
    unitStyle?: "short" | "long" | "narrow";
  }
): string => {
  if (bytes === 0) {
    return "0 Bytes";
  }

  // Read from optionsManager if available, then apply overrides from options param
  const globalOptions = optionsManager.getAllOptions()?.files || {};
  const useBinary =
    options?.useBinary ?? globalOptions.size?.useBinary ?? false;
  const precision = options?.precision ?? globalOptions.size?.precision ?? 2;
  const unitStyle =
    options?.unitStyle ?? globalOptions.size?.unitStyle ?? "short";

  const base = useBinary ? 1024 : 1000;

  // Define unit arrays based on style and base
  let units: string[];
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
  } else if (unitStyle === "narrow") {
    units = ["B", "K", "M", "G", "T", "P"];
  } else {
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
  const formattedValue =
    precision === 0 ? Math.round(value).toString() : value.toFixed(precision);

  // Handle pluralization for long style
  const unit =
    unitStyle === "long" && value === 1 && finalIndex > 0
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
export const sanitizeFilename = (
  filename: string,
  options?: {
    regex?: RegExp;
    replace?: string | RegExp;
  }
): string => {
  // Read from optionsManager if available, then apply overrides from options param
  const globalOptions = optionsManager.getAllOptions()?.files || {};
  const filenameRegex =
    options?.regex ?? globalOptions?.filenameRegex ?? /^[a-zA-Z0-9\-_.]+$/;
  const rawReplace =
    options?.replace ?? globalOptions?.filenameRegexReplace ?? "-";
  // Determine replacement string to insert when swapping invalid chars.
  // If the caller passed a RegExp (e.g. /-+/g) we default to '-' as the inserted
  // character but will use the RegExp later to normalize repeated occurrences.
  const filenameRegexReplace =
    typeof rawReplace === "string"
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
  let invalidCharRegex: RegExp;
  try {
    const source = filenameRegex.source;
    // If the regex is anchored and contains a simple character class like [a-zA-Z0-9\-_.]+,
    // extract the class and invert it.
    const classMatch = source.match(/\[([^\]]+)\]/);
    if (classMatch && classMatch[1]) {
      // Build negated class - escape any forward slash
      const negated = `[^${classMatch[1]}]`;
      invalidCharRegex = new RegExp(negated, "g");
    } else {
      // Fallback conservative regex: anything not alnum, hyphen, underscore, or dot
      invalidCharRegex = /[^a-zA-Z0-9\-_.]/g;
    }
  } catch {
    invalidCharRegex = /[^a-zA-Z0-9\-_.]/g;
  }

  // Replace invalid characters in the base name
  const sanitizedBaseName = baseName.replace(
    invalidCharRegex,
    filenameRegexReplace
  );

  // If caller supplied a RegExp for replace, use it to normalize repeats (e.g. /-+/g -> '-')
  let normalizedBaseName = sanitizedBaseName;
  if (rawReplace instanceof RegExp) {
    try {
      normalizedBaseName = normalizedBaseName.replace(
        rawReplace,
        filenameRegexReplace
      );
    } catch (e) {
      // Fall back to simple normalization below if the provided RegExp fails
      normalizedBaseName = sanitizedBaseName;
    }
  }

  // Normalize repeated replacement characters (e.g., multiple spaces -> single '-')
  // Escape the replacement string for use in a dynamic RegExp
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const repEsc = escapeRegExp(filenameRegexReplace);
  normalizedBaseName = normalizedBaseName.replace(
    new RegExp(`${repEsc}{2,}`, "g"),
    filenameRegexReplace
  );

  // Trim replacement characters from ends
  const trimmedBaseName = normalizedBaseName.replace(
    new RegExp(`^${filenameRegexReplace}+|${filenameRegexReplace}+$`, "g"),
    ""
  );

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
export const convertBytesToUnit = (
  bytes: number,
  unit: "B" | "KB" | "MB" | "GB" | "TB" | "PB",
  useBinary = true
): number => {
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
 * Get file extension from filename
 * @param {string} filename - The filename
 * @param {boolean} [includeDot=false] - Whether to include the dot in the extension
 * @returns {string} File extension
 * @example
 * getFileExtension('document.pdf'); // '.pdf'
 * getFileExtension('document.pdf', false); // 'pdf'
 * getFileExtension('document'); // ''
 */
export const getFileExtension = (
  filename: string,
  includeDot = false
): string => {
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
export const removeFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return filename;
  }

  return filename.substring(0, lastDotIndex);
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
export const isValidFilename = (
  filename: string,
  options?: {
    filenameRegex?: RegExp;
  }
): boolean => {
  // Read from optionsManager if available, then apply overrides from options param
  const globalOptions = optionsManager.getAllOptions()?.files || {};
  const filenameRegex =
    options?.filenameRegex ??
    globalOptions?.filenameRegex ??
    /^[a-zA-Z0-9\-_.]+$/;

  return filenameRegex.test(filename);
};

/**
 * Simple email validation - this is too permissive vs RFC5322, but also assumes that
 * the user places some importance to having a valid email address.  Further strictness
 * can be used with strict=true, but it's still not as strict as RFC5322
 * @param {string} email - Email address
 * @param {boolean} [strict=false] - Whether to use strict validation - closer to RFC5322.
 * @returns {boolean}
 */
export const isValidEmail = (email: string, strict: boolean = false): boolean =>
  !strict
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    : /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);

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
export const formatDate = (
  dateInput: string | Date,
  options?: {
    locale?: string;
    formatOptions?: Intl.DateTimeFormatOptions;
  }
): string => {
  // Read from optionsManager if available, then apply overrides from options param
  const globalOptions = optionsManager.getAllOptions()?.dates || {};
  const locale = options?.locale ?? globalOptions.locale ?? "en-US";
  const formatOptions = options?.formatOptions ??
    globalOptions.formatOptions ?? {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  return date.toLocaleDateString(locale, formatOptions);
};
