/** A country row accepted by the data-driven country helpers and selector. */
export interface CountryDataRow {
    name: string;
    nameLocal: string;
    iso3166_1_alpha2: string;
    iso3166_1_alpha3: string;
    iso3166_1_numeric: number;
    telCountryCode?: number;
    [field: string]: unknown;
}
export interface CountryOptionsConfig {
    includeEmpty?: boolean;
    topCountries?: string | string[];
    sortBy?: string;
    order?: string;
}
/**
 * Find the first row matching an ISO alpha-2, alpha-3, or numeric code.
 * @param code The code to search for.
 * @param countryRows Host-provided rows, searched in their original order.
 */
export declare const getCountryByCodeFromData: <TRow extends CountryDataRow>(code: string | number, countryRows: readonly TRow[]) => TRow | undefined;
/**
 * Build country options without importing or caching a geographic dataset.
 * The returned array is new; its row objects are the caller's original rows.
 */
export declare const getCountryOptionsFromData: <TRow extends CountryDataRow>(countryRows: readonly TRow[], { includeEmpty, topCountries, sortBy, order, }?: CountryOptionsConfig) => TRow[];
