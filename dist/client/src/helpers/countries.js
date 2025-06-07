"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCountryOptions = exports.getCountryByCode = void 0;
/**
 * Countries with ISO codes, local names, and additional data
 *
 * Each country object contains:
 * @property {string} name - Country name in English
 * @property {string} nameLocal - Country name in its local language
 * @property {string} iso3166_1_alpha2 - ISO 3166-1 alpha-2 code (2 letters)
 * @property {string} iso3166_1_alpha3 - ISO 3166-1 alpha-3 code (3 letters)
 * @property {number} iso3166_1_numeric - ISO 3166-1 numeric code
 * @property {Array<string>} languages - Primary languages (ISO 639 codes)
 * @property {string} currency - ISO 4217 currency code
 * @property {number} telCountryCode - International telephone country code
 * @property {string} continent - Continent code
 * @property {string} region - Super region code (e.g., EU, UK) if applicable
 * @property {number} population - Estimated population in millions
 */
const countries_1 = __importDefault(require("../data/countries"));
/**
 * Utility function to get a country by its code
 * @param {string} code - ISO 3166 code (alpha-2 or alpha-3) or numeric code
 * @returns {Object|undefined} The country object or undefined if not found
 */
const getCountryByCode = (code) => {
    if (!code) {
        return undefined;
    }
    if (typeof code === "number" || !isNaN(parseInt(code))) {
        // Handle numeric code
        const numericCode = parseInt(code);
        return countries_1.default.find((country) => country.iso3166_1_numeric === numericCode);
    }
    // Handle string codes (alpha-2 or alpha-3)
    const upperCode = code.toUpperCase();
    return countries_1.default.find((country) => country.iso3166_1_alpha2 === upperCode ||
        country.iso3166_1_alpha3 === upperCode);
};
exports.getCountryByCode = getCountryByCode;
/**
 * Get country options for select components
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeEmpty - Whether to include the empty/other option (defaults to true)
 * @param {string|string[]|Object} options.topCountries - ISO code(s) or regions object to place at the top
 * @param {string} options.sortBy - Property to sort by (e.g., "name", "population", "iso3166_1_alpha2")
 * @param {string} options.order - Sort order: "asc" or "desc" (defaults to "asc")
 * @returns {Array} Array of country options
 */
const getCountryOptions = ({ includeEmpty = true, topCountries, sortBy = "name", order = "asc", } = {}) => {
    let result = [...countries_1.default];
    const emptyOption = countries_1.default[0];
    // Remove the empty option if not needed or store it for later
    if (!includeEmpty) {
        result = result.filter((country) => country.iso3166_1_alpha2 !== "");
    }
    else {
        // Remove temporarily to add it back at the beginning after processing defaults
        result = result.filter((country) => country.iso3166_1_alpha2 !== "");
    }
    // Process default countries - handle string, array
    if (topCountries) {
        // Convert single string to array for consistent processing
        const defaultCodes = Array.isArray(topCountries)
            ? topCountries
            : [topCountries];
        // Find all default countries and store them in order
        const defaultCountries = [];
        for (const code of defaultCodes) {
            // Skip empty codes
            if (!code)
                continue;
            // Normalize the code to uppercase for proper comparison
            const upperCode = typeof code === "string" ? code.toUpperCase() : code;
            // Fix: Find country by proper comparison of codes
            const topCountries = result.find((country) => {
                // Check both alpha-2 and alpha-3 codes with proper comparison
                const isMatch = country.iso3166_1_alpha2 === upperCode ||
                    country.iso3166_1_alpha3 === upperCode;
                return isMatch;
            });
            // If found, add to the default countries array
            if (topCountries) {
                // Remove from the main list so we don't have duplicates
                result = result.filter((country) => country.iso3166_1_alpha2 !== topCountries.iso3166_1_alpha2 &&
                    country.iso3166_1_alpha3 !== topCountries.iso3166_1_alpha3);
                // Add to our defaults array
                defaultCountries.push(topCountries);
            }
        }
        // Add default countries at the beginning in the specified order
        if (defaultCountries.length > 0) {
            result = [...defaultCountries, ...result];
        }
    }
    // Sort the results by the specified property and order
    // Don't sort if sortBy is not provided or invalid
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
exports.getCountryOptions = getCountryOptions;
exports.default = countries_1.default;
