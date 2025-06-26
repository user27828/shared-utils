export function getCountryByCode(code: string): Object | undefined;
export function getCountryOptions({ includeEmpty, topCountries, sortBy, order, }?: {
    includeEmpty: boolean;
    topCountries: string | string[] | Object;
    sortBy: string;
    order: string;
}): any[];
export default countries;
import countries from "../data/countries.js";
