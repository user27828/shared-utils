/**
 * @deprecated Import from the dependency-specific modules instead:
 * `environment.js`, `validation.js`, `files.js`, `dates.js`, or `json.js`.
 * This compatibility barrel intentionally retains the combined dependency
 * graph for callers that still use the legacy deep import.
 */
export { isDev } from "./environment.js";
export type { EnvironmentObject, IsDevOptions } from "./environment.js";
export { getFileExtension, removeFileExtension, isValidEmail, normalizeUrl, } from "./validation.js";
export { formatFileSize, sanitizeFilename, convertBytesToUnit, isValidFilename, } from "./files.js";
export { formatDate } from "./dates.js";
export { mergeJson, mergeJsonActions } from "./json.js";
export type { MergeJsonProps } from "./json.js";
