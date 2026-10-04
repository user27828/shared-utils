/**
 * Country helpers backed by the bundled full country dataset.
 * Use `countries-core` when the host supplies its own rows.
 */

import countries from "../data/countries.js";
import {
  getCountryByCodeFromData,
  getCountryOptionsFromData,
} from "./countries-core.js";

/**
 * Utility function to get a country by its code
 * @param {string|number} code - ISO 3166 code (alpha-2 or alpha-3) or numeric code
 * @returns {Object|undefined} The country object or undefined if not found
 */
export const getCountryByCode = (code) => {
  return getCountryByCodeFromData(code, countries);
};

/**
 * Get country options for select components, including the bundled data.
 * @param {Object} [options]
 * @param {boolean} [options.includeEmpty=true]
 * @param {string|string[]} [options.topCountries]
 * @param {string} [options.sortBy="name"]
 * @param {string} [options.order="asc"]
 * @returns {Array<Object>} Country options
 */
export const getCountryOptions = (options = {}) => {
  return getCountryOptionsFromData(countries, options);
};

export default countries;
