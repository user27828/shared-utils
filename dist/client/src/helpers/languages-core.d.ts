/** A language row accepted by the data-driven language helpers and selector. */
export interface LanguageDataRow {
    iso639_1: string;
    iso639_2: string;
    iso639_3: string;
    name: string;
    nameLocal: string;
    ietf: string;
    ietfRegions?: Record<string, string>;
    lcid: number;
    speakers: number;
    [field: string]: unknown;
}
export interface LanguageOptionsConfig {
    includeEmpty?: boolean;
    topLanguages?: string | string[] | {
        ietfRegions: string | string[];
    };
    sortBy?: string;
    order?: string;
}
/**
 * Find the first row matching an ISO 639 code or IETF tag.
 * The search is case-insensitive and preserves input order for duplicate codes.
 */
export declare const getLanguageByCodeFromData: <TRow extends LanguageDataRow>(code: string, languageRows: readonly TRow[]) => TRow | undefined;
/**
 * Build language options without importing or caching a geographic dataset.
 * The returned array is new; its row objects are the caller's original rows.
 */
export declare const getLanguageOptionsFromData: <TRow extends LanguageDataRow>(languageRows: readonly TRow[], { includeEmpty, topLanguages, sortBy, order, }?: LanguageOptionsConfig) => TRow[];
