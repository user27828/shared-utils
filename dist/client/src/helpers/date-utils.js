/**
 * Date utilities for formatting, parsing, and manipulation
 */
/**
 * Format date to various common formats
 * @param {Date|string|number} date - The date to format
 * @param {string} format - Format string (ISO, US, EU, YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.)
 * @param {Object} options - Additional options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = "ISO", options = {}) => {
    const { locale = "en-US", timezone } = options;
    let dateObj;
    if (date instanceof Date) {
        dateObj = date;
    }
    else if (typeof date === "string" || typeof date === "number") {
        dateObj = new Date(date);
    }
    else {
        return "Invalid Date";
    }
    if (isNaN(dateObj.getTime())) {
        return "Invalid Date";
    }
    const formatOptions = timezone ? { timeZone: timezone } : {};
    switch (format.toUpperCase()) {
        case "ISO":
            return dateObj.toISOString();
        case "US":
        case "MM/DD/YYYY":
            return dateObj.toLocaleDateString("en-US", formatOptions);
        case "EU":
        case "DD/MM/YYYY":
            return dateObj.toLocaleDateString("en-GB", formatOptions);
        case "YYYY-MM-DD":
            return dateObj.toISOString().split("T")[0];
        case "YYYY/MM/DD":
            return (dateObj.getFullYear() +
                "/" +
                String(dateObj.getMonth() + 1).padStart(2, "0") +
                "/" +
                String(dateObj.getDate()).padStart(2, "0"));
        case "MM-DD-YYYY":
            return (String(dateObj.getMonth() + 1).padStart(2, "0") +
                "-" +
                String(dateObj.getDate()).padStart(2, "0") +
                "-" +
                dateObj.getFullYear());
        case "DD-MM-YYYY":
            return (String(dateObj.getDate()).padStart(2, "0") +
                "-" +
                String(dateObj.getMonth() + 1).padStart(2, "0") +
                "-" +
                dateObj.getFullYear());
        case "LONG":
            return dateObj.toLocaleDateString(locale, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                ...formatOptions,
            });
        case "SHORT":
            return dateObj.toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
                ...formatOptions,
            });
        case "TIME":
            return dateObj.toLocaleTimeString(locale, formatOptions);
        case "DATETIME":
            return dateObj.toLocaleString(locale, formatOptions);
        default:
            return dateObj.toLocaleDateString(locale, formatOptions);
    }
};
/**
 * Parse date from various string formats
 * @param {string} dateString - The date string to parse
 * @param {string} inputFormat - Expected input format hint
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export const parseDate = (dateString, inputFormat = "auto") => {
    if (!dateString || typeof dateString !== "string") {
        return null;
    }
    // Try direct parsing first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date;
    }
    // Try various common formats
    const formats = [
        // ISO formats
        /^(\d{4})-(\d{2})-(\d{2})$/,
        /^(\d{4})\/(\d{2})\/(\d{2})$/,
        // US format MM/DD/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // EU format DD/MM/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // Dashed formats
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    ];
    for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
            const [, part1, part2, part3] = match;
            // Try different interpretations based on format hints
            if (inputFormat === "US" || (part3 && part3.length === 4)) {
                // MM/DD/YYYY or MM-DD-YYYY
                date = new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2));
            }
            else if (inputFormat === "EU") {
                // DD/MM/YYYY or DD-MM-YYYY
                date = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
            }
            else if (part1.length === 4) {
                // YYYY-MM-DD or YYYY/MM/DD
                date = new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
            }
            else {
                // Try both US and EU formats
                const usDate = new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2));
                const euDate = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
                // Use the one that makes more sense (day <= 12 is ambiguous)
                if (!isNaN(usDate.getTime()) && parseInt(part1) <= 12) {
                    date = usDate;
                }
                else if (!isNaN(euDate.getTime())) {
                    date = euDate;
                }
            }
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }
    return null;
};
/**
 * Add or subtract time from a date
 * @param {Date|string} date - The base date
 * @param {number} amount - Amount to add (can be negative)
 * @param {string} unit - Unit: 'days', 'weeks', 'months', 'years', 'hours', 'minutes', 'seconds'
 * @returns {Date|null} New date object or null if invalid
 */
export const addToDate = (date, amount, unit) => {
    const dateObj = date instanceof Date ? new Date(date) : new Date(date);
    if (isNaN(dateObj.getTime())) {
        return null;
    }
    switch (unit.toLowerCase()) {
        case "seconds":
            dateObj.setSeconds(dateObj.getSeconds() + amount);
            break;
        case "minutes":
            dateObj.setMinutes(dateObj.getMinutes() + amount);
            break;
        case "hours":
            dateObj.setHours(dateObj.getHours() + amount);
            break;
        case "days":
            dateObj.setDate(dateObj.getDate() + amount);
            break;
        case "weeks":
            dateObj.setDate(dateObj.getDate() + amount * 7);
            break;
        case "months":
            dateObj.setMonth(dateObj.getMonth() + amount);
            break;
        case "years":
            dateObj.setFullYear(dateObj.getFullYear() + amount);
            break;
        default:
            return null;
    }
    return dateObj;
};
/**
 * Calculate difference between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @param {string} unit - Unit for result: 'days', 'weeks', 'months', 'years', 'hours', 'minutes', 'seconds', 'milliseconds'
 * @returns {number|null} Difference in specified unit or null if invalid
 */
export const dateDifference = (date1, date2, unit = "days") => {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        return null;
    }
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    switch (unit.toLowerCase()) {
        case "milliseconds":
            return diffMs;
        case "seconds":
            return Math.floor(diffMs / 1000);
        case "minutes":
            return Math.floor(diffMs / (1000 * 60));
        case "hours":
            return Math.floor(diffMs / (1000 * 60 * 60));
        case "days":
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        case "weeks":
            return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
        case "months":
            // Approximate calculation
            return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
        case "years":
            // Approximate calculation
            return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        default:
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
};
/**
 * Check if a date is valid
 * @param {any} date - Value to check
 * @returns {boolean} True if valid date
 */
export const isValidDate = (date) => {
    if (date instanceof Date) {
        return !isNaN(date.getTime());
    }
    if (typeof date === "string" || typeof date === "number") {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
    }
    return false;
};
/**
 * Get relative time string (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string} date - The date to compare
 * @param {Date|string} [baseDate=new Date()] - Base date for comparison
 * @param {Object} options - Options for formatting
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date, baseDate = new Date(), options = {}) => {
    const { locale = "en-US" } = options;
    const dateObj = date instanceof Date ? date : new Date(date);
    const baseObj = baseDate instanceof Date ? baseDate : new Date(baseDate);
    if (isNaN(dateObj.getTime()) || isNaN(baseObj.getTime())) {
        return "Invalid Date";
    }
    // Use Intl.RelativeTimeFormat if available
    if (typeof Intl !== "undefined" && Intl.RelativeTimeFormat) {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        const diffMs = dateObj.getTime() - baseObj.getTime();
        const units = [
            { unit: "second", ms: 1000 },
            { unit: "minute", ms: 1000 * 60 },
            { unit: "hour", ms: 1000 * 60 * 60 },
            { unit: "day", ms: 1000 * 60 * 60 * 24 },
            { unit: "week", ms: 1000 * 60 * 60 * 24 * 7 },
            { unit: "month", ms: 1000 * 60 * 60 * 24 * 30.44 },
            { unit: "year", ms: 1000 * 60 * 60 * 24 * 365.25 },
        ];
        for (let i = units.length - 1; i >= 0; i--) {
            const { unit, ms } = units[i];
            const diff = Math.floor(diffMs / ms);
            if (Math.abs(diff) >= 1) {
                return rtf.format(diff, unit);
            }
        }
        return rtf.format(0, "second");
    }
    // Fallback for older browsers
    const diffMs = Math.abs(dateObj.getTime() - baseObj.getTime());
    const isFuture = dateObj.getTime() > baseObj.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30.44);
    const years = Math.floor(days / 365.25);
    if (years > 0) {
        return isFuture
            ? `in ${years} year${years > 1 ? "s" : ""}`
            : `${years} year${years > 1 ? "s" : ""} ago`;
    }
    else if (months > 0) {
        return isFuture
            ? `in ${months} month${months > 1 ? "s" : ""}`
            : `${months} month${months > 1 ? "s" : ""} ago`;
    }
    else if (weeks > 0) {
        return isFuture
            ? `in ${weeks} week${weeks > 1 ? "s" : ""}`
            : `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    }
    else if (days > 0) {
        return isFuture
            ? `in ${days} day${days > 1 ? "s" : ""}`
            : `${days} day${days > 1 ? "s" : ""} ago`;
    }
    else if (hours > 0) {
        return isFuture
            ? `in ${hours} hour${hours > 1 ? "s" : ""}`
            : `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    else if (minutes > 0) {
        return isFuture
            ? `in ${minutes} minute${minutes > 1 ? "s" : ""}`
            : `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    }
    else {
        return isFuture
            ? `in ${seconds} second${seconds > 1 ? "s" : ""}`
            : `${seconds} second${seconds > 1 ? "s" : ""} ago`;
    }
};
/**
 * Get timezone information
 * @param {string} [timezone] - Specific timezone (e.g., 'America/New_York')
 * @returns {Object} Timezone information
 */
export const getTimezoneInfo = (timezone) => {
    const date = new Date();
    if (timezone) {
        try {
            const formatter = new Intl.DateTimeFormat("en", {
                timeZone: timezone,
                timeZoneName: "long",
            });
            const parts = formatter.formatToParts(date);
            const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value;
            return {
                timezone,
                name: timeZoneName,
                offset: getTimezoneOffset(date, timezone),
            };
        }
        catch (error) {
            return { timezone, name: "Unknown", offset: 0 };
        }
    }
    // Local timezone
    const offset = -date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset >= 0 ? "+" : "-";
    const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`;
    return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        name: date
            .toLocaleDateString("en", { timeZoneName: "long" })
            .split(", ")[1],
        offset: offsetString,
        offsetMinutes: offset,
    };
};
/**
 * Get timezone offset for a specific timezone
 * @param {Date} date - Date to check
 * @param {string} timezone - Timezone name
 * @returns {string} Offset string (e.g., "+05:30")
 */
export const getTimezoneOffset = (date, timezone) => {
    try {
        const utc = date.getTime() + date.getTimezoneOffset() * 60000;
        const targetTime = new Date(utc + 0); // UTC time
        const targetDate = new Date(targetTime.toLocaleString("en-US", { timeZone: timezone }));
        const offset = (targetDate.getTime() - utc) / 60000;
        const offsetHours = Math.floor(Math.abs(offset) / 60);
        const offsetMinutes = Math.abs(offset) % 60;
        const offsetSign = offset >= 0 ? "+" : "-";
        return `${offsetSign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`;
    }
    catch (error) {
        return "+00:00";
    }
};
/**
 * Check if a year is a leap year
 * @param {number} year - Year to check
 * @returns {boolean} True if leap year
 */
export const isLeapYear = (year) => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};
/**
 * Get number of days in a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} Number of days in the month
 */
export const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
};
export default {
    formatDate,
    parseDate,
    addToDate,
    dateDifference,
    isValidDate,
    getRelativeTime,
    getTimezoneInfo,
    getTimezoneOffset,
    isLeapYear,
    getDaysInMonth,
};
