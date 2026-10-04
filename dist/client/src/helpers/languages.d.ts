export function getLanguageByCode(code: string): Object | undefined;
export function getLanguageOptions(options?: {
    includeEmpty?: boolean | undefined;
    topLanguages?: string | string[] | {
        ietfRegions: string | string[];
    } | undefined;
    sortBy?: string | undefined;
    order?: string | undefined;
}): Array<Object>;
export default languages;
import languages from "../data/languages.js";
