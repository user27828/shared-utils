export function getCountryByCode(code: string | number): Object | undefined;
export function getCountryOptions(options?: {
    includeEmpty?: boolean | undefined;
    topCountries?: string | string[] | undefined;
    sortBy?: string | undefined;
    order?: string | undefined;
}): Array<Object>;
export default countries;
import countries from "../data/countries.js";
