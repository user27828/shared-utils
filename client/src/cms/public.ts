/**
 * Public-facing CMS client barrel — shared-utils/cms/client/public
 *
 * Editor-free subset of the CMS client surface. Safe for consumer-facing
 * pages that only need to DISPLAY or PASSWORD-GATE CMS content, without
 * pulling in heavy editor dependencies (TinyMCE, MDXEditor, etc.).
 *
 * Admin/editor pages should continue using "@user27828/shared-utils/cms/client".
 */

// ── API layer ─────────────────────────────────────────────────────────────
export { CmsClient, CmsClientError } from "./CmsClient.js";
export type { CmsClientConfig } from "./CmsClient.js";
export type {
  CmsApi,
  CmsAdminListParams,
  CmsPublicGetResult,
  CmsPublicUnlockResult,
} from "./CmsApi.js";
export type { CmsPublicPayload } from "../../../utils/src/cms/types.js";

// ── Hooks ─────────────────────────────────────────────────────────────────
export {
  useCmsPublic,
  type UseCmsPublicOptions,
  type UseCmsPublicResult,
} from "./hooks/useCmsPublic.js";

// ── UI components (no editor dependencies) ────────────────────────────────
export {
  default as CmsBodyRenderer,
  renderCmsBody,
} from "./ui/CmsBodyRenderer.js";
export type { CmsBodyRendererProps } from "./ui/CmsBodyRenderer.js";

export { default as CmsPasswordGate } from "./ui/CmsPasswordGate.js";
export type { CmsPasswordGateProps } from "./ui/CmsPasswordGate.js";

export { default as CmsContentNotes } from "./ui/CmsContentNotes.js";
export type { CmsContentNotesProps } from "./ui/CmsContentNotes.js";

// Re-export schema constants used by public-facing host apps
export { CMS_POST_TYPES } from "../../../utils/src/cms/types.js";
export { normalizeLocale, isValidSlug } from "../../../utils/src/cms/validation.js";
