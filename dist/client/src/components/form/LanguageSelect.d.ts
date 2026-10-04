export default LanguageSelect;
/**
 * Full-data language selector.
 * Import `LanguageSelectCore` when the host supplies language rows.
 * @param {Omit<import("react").ComponentProps<typeof LanguageSelectCore>, "languages">} props
 * @returns {JSX.Element}
 */
declare function LanguageSelect(props: Omit<import("react").ComponentProps<typeof LanguageSelectCore>, "languages">): JSX.Element;
import LanguageSelectCore from "./LanguageSelectCore.js";
