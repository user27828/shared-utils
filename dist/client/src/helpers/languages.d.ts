export function getLanguageByCode(code: string): Object | undefined;
export function getLanguageOptions({ includeEmpty, topLanguages, sortBy, order, }?: {
    includeEmpty: boolean;
    topLanguages: string | string[] | Object;
    sortBy: string;
    order: string;
}): any[];
export default languages;
import languages from "../data/languages.js";
//# sourceMappingURL=languages.d.ts.map