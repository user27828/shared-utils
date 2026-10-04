/**
 * Language helpers backed by the bundled full language dataset.
 * Use `languages-core` when the host supplies its own rows.
 */
import languages from "../data/languages.js";
import { getLanguageByCodeFromData, getLanguageOptionsFromData, } from "./languages-core.js";
/**
 * Utility function to get a language by its code
 * @param {string} code - ISO 639 code or IETF tag
 * @returns {Object|undefined} The language object or undefined if not found
 */
export const getLanguageByCode = (code) => {
    return getLanguageByCodeFromData(code, languages);
};
/**
 * Get language options for select components, including the bundled data.
 * @param {Object} [options]
 * @param {boolean} [options.includeEmpty=true]
 * @param {string|string[]|{ietfRegions: string|string[]}} [options.topLanguages]
 * @param {string} [options.sortBy="name"]
 * @param {string} [options.order="asc"]
 * @returns {Array<Object>} Language options
 */
export const getLanguageOptions = (options = {}) => {
    return getLanguageOptionsFromData(languages, options);
};
export default languages;
