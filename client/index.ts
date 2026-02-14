/**
 * Barrel file for client components and utilities
 */

// Components (excluding WYSIWYG components - import separately if needed)
export { default as CountrySelect } from "./src/components/form/CountrySelect.js";
export { default as LanguageSelect } from "./src/components/form/LanguageSelect.js";
export {
  default as FileUploadList,
  type FileUploadListProps,
  type ModeUploadFileProps,
} from "./src/components/form/FileUploadList.js";
export { default as CalendarAdd } from "./src/components/CalendarAdd.js";
export { default as CopyButton } from "./src/components/CopyButton.js";
export type { CopyButtonProps } from "./src/components/CopyButton.js";
export { default as PasteButton } from "./src/components/PasteButton.js";
export type { PasteButtonProps } from "./src/components/PasteButton.js";
export { default as FileIcon } from "./src/components/FileIcon.js";

// Helpers
export * from "./src/helpers/functions.js";
export * from "./src/helpers/countries.js";
export * from "./src/helpers/languages.js";
export * from "./src/helpers/csv.js";
export {
  formatDate,
  parseDate,
  addToDate,
  dateDifference,
  isValidDate,
  getRelativeTime,
  getTimezoneInfo,
  getTimezoneOffset,
  isLeapYear,
  getDaysInMonth,
} from "./src/helpers/date-utils.js";

// Data
export * from "./src/data/countries.js";
export * from "./src/data/languages.js";
export * from "./src/data/demographic-options.js";

// Attach log to window if in browser and not already set
if (
  typeof window !== "undefined" &&
  typeof (window as any).log === "undefined"
) {
  import("../utils/index.js").then(({ log }) => {
    (window as any).log = log;
  });
}
