import { OptionsManager, optionsManager } from "./options-manager.js";
if (!optionsManager.getManager("dates")) {
    optionsManager.registerManager("dates", new OptionsManager("dates", {}));
}
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
export const formatDate = (dateInput, options) => {
    // Read from optionsManager if available, then apply overrides from options param
    const globalOptions = optionsManager.getOption("dates") || {};
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
