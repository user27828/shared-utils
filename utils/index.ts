/**
 * Dependency-free utility surface.
 *
 * Configured helpers and integrations live behind explicit package subpaths
 * so importing the root does not initialize global registries or resolve
 * optional feature dependencies.
 */
export { isDev } from "./src/environment.js";
export type { EnvironmentObject, IsDevOptions } from "./src/environment.js";

export {
  getFileExtension,
  removeFileExtension,
  isValidEmail,
  normalizeUrl,
} from "./src/validation.js";

export { mergeJson, mergeJsonActions } from "./src/json.js";
export type { MergeJsonProps } from "./src/json.js";
