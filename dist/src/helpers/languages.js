/**
 * Top 150 languages with ISO codes and native names
 *
 * Each language object contains:
 * @property {string} iso639_1 - ISO 639-1 two-letter code
 * @property {string} iso639_2 - ISO 639-2/T three-letter code
 * @property {string} iso639_3 - ISO 639-3 compliant code (may differ from iso639_2)
 * @property {string} name - Language name in Latin transliteration
 * @property {string} nameLocal - Language name in its native script
 * @property {string} ietf - IETF language tag (BCP47) basic tag
 * @property {Object} ietfRegions - Object mapping country codes to BCP47 tags
 * @property {number} lcid - Microsoft locale identifier
 * @property {number} speakers - Approximate number of speakers in millions (where available)
 */
import languages from "../data/languages.js";
/**
 * Utility function to get a language by its code
 * @param {string} code - The ISO code (2 or 3 letter) or IETF tag
 * @returns {Object|undefined} The language object or undefined if not found
 */
export const getLanguageByCode = (code) => {
    if (!code) {
        return undefined;
    }
    const lowerCode = code.toLowerCase();
    const upperCode = code.toUpperCase();
    // First try direct matching with iso639_1, iso639_2, or iso639_3
    const directMatch = languages.find((lang) => lang.iso639_1.toLowerCase() === lowerCode ||
        lang.iso639_2.toLowerCase() === lowerCode ||
        lang.iso639_3.toLowerCase() === lowerCode);
    if (directMatch) {
        return directMatch;
    }
    // If not found, try matching IETF tags (case insensitive)
    return languages.find((lang) => lang.ietf === lowerCode ||
        Object.values(lang.ietfRegions || {}).some((tag) => tag.toLowerCase() === lowerCode));
};
/**
 * Get language options for select components
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeEmpty - Whether to include the empty/other option (defaults to true)
 * @param {string|string[]|Object} options.topLanguages - ISO code(s), IETF tag(s), or regions object to place at the top
 * @param {string} options.sortBy - Property to sort by (e.g., "name", "speakers", "iso639_1")
 * @param {string} options.order - Sort order: "asc" or "desc" (defaults to "asc")
 * @returns {Array} Array of language options
 */
export const getLanguageOptions = ({ includeEmpty = true, topLanguages, sortBy = "name", order = "asc", } = {}) => {
    let result = [...languages];
    const emptyOption = languages[0];
    // Remove the empty option if not needed or store it for later
    if (!includeEmpty) {
        result = result.filter((lang) => lang.iso639_1 !== "");
    }
    else {
        // Remove temporarily to add it back at the beginning after processing defaults
        result = result.filter((lang) => lang.iso639_1 !== "");
    }
    // Process default languages - handle string, array or object with ietfRegions
    if (topLanguages) {
        // Handle the special case of {ietfRegions: [array]} format
        let defaultCodes = [];
        if (typeof topLanguages === "object" &&
            !Array.isArray(topLanguages) &&
            topLanguages.ietfRegions) {
            // It's the {ietfRegions: [array]} format
            const regions = Array.isArray(topLanguages.ietfRegions)
                ? topLanguages.ietfRegions
                : [topLanguages.ietfRegions];
            // For each region code, find languages that have that region
            regions.forEach((region) => {
                // Convert to uppercase for consistent comparison
                const regionUpper = region.toUpperCase();
                languages.forEach((lang) => {
                    if (lang.ietfRegions &&
                        Object.keys(lang.ietfRegions).includes(regionUpper)) {
                        defaultCodes.push(lang.ietf);
                    }
                });
            });
        }
        else {
            // It's a string or array format
            defaultCodes = Array.isArray(topLanguages)
                ? topLanguages
                : [topLanguages];
        }
        // Find all default languages and store them in order
        const defaultLangs = [];
        for (const code of defaultCodes) {
            if (!code)
                continue;
            const defaultLang = getLanguageByCode(code);
            if (defaultLang && defaultLang.iso639_1 !== "") {
                // Remove from the main list so we don't have duplicates
                result = result.filter((lang) => lang.iso639_1 !== defaultLang.iso639_1 &&
                    lang.iso639_2 !== defaultLang.iso639_2 &&
                    lang.ietf !== defaultLang.ietf);
                // Add to our defaults array
                defaultLangs.push(defaultLang);
            }
        }
        // Add default languages at the beginning in the specified order
        if (defaultLangs.length > 0) {
            result = [...defaultLangs, ...result];
        }
    }
    // Sort the results by the specified property and order
    // Don't sort if sortBy is not provided or if it's the default name sort
    if (sortBy && typeof sortBy === "string" && sortBy !== "name") {
        result = result.sort((a, b) => {
            // Skip comparison if one of the properties doesn't exist
            if (!(sortBy in a) || !(sortBy in b)) {
                return 0;
            }
            // Handle different types of properties
            if (typeof a[sortBy] === "string" && typeof b[sortBy] === "string") {
                // String comparison
                return order.toLowerCase() === "desc"
                    ? b[sortBy].localeCompare(a[sortBy])
                    : a[sortBy].localeCompare(b[sortBy]);
            }
            else if (typeof a[sortBy] === "number" &&
                typeof b[sortBy] === "number") {
                // Numeric comparison
                return order.toLowerCase() === "desc"
                    ? b[sortBy] - a[sortBy]
                    : a[sortBy] - b[sortBy];
            }
            // Default case - maintain original order
            return 0;
        });
    }
    // Add empty option at the very beginning if needed
    if (includeEmpty) {
        result.unshift(emptyOption);
    }
    return result;
};
export default languages;
