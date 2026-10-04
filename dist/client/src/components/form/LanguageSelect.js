import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import languages from "../../data/languages.js";
import LanguageSelectCore from "./LanguageSelectCore.js";
/**
 * Full-data language selector.
 * Import `LanguageSelectCore` when the host supplies language rows.
 * @param {Omit<import("react").ComponentProps<typeof LanguageSelectCore>, "languages">} props
 * @returns {JSX.Element}
 */
const LanguageSelect = (props) => {
    return _jsx(LanguageSelectCore, { ...props, languages: languages });
};
export default LanguageSelect;
