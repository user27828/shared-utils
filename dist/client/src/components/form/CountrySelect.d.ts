export default CountrySelect;
/**
 * Full-data country selector.
 * Import `CountrySelectCore` when the host supplies country rows.
 * @param {Omit<import("react").ComponentProps<typeof CountrySelectCore>, "countries">} props
 * @returns {JSX.Element}
 */
declare function CountrySelect(props: Omit<import("react").ComponentProps<typeof CountrySelectCore>, "countries">): JSX.Element;
import CountrySelectCore from "./CountrySelectCore.js";
