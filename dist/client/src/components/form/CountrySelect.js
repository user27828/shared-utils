import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import countries from "../../data/countries.js";
import CountrySelectCore from "./CountrySelectCore.js";
/**
 * Full-data country selector.
 * Import `CountrySelectCore` when the host supplies country rows.
 * @param {Omit<import("react").ComponentProps<typeof CountrySelectCore>, "countries">} props
 * @returns {JSX.Element}
 */
const CountrySelect = (props) => {
    return _jsx(CountrySelectCore, { ...props, countries: countries });
};
export default CountrySelect;
