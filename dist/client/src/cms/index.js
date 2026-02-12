/**
 * Client CMS barrel — shared-utils/client/src/cms
 *
 * Re-exports the full client-side CMS surface:
 *  - CmsApi interface + CmsClient implementation
 *  - React hooks (useCmsAdmin, useCmsPublic)
 *  - Portable UI components (CmsListPage, CmsEditPage, etc.)
 */
// ── API layer ─────────────────────────────────────────────────────────────
export { CmsClient, CmsClientError } from "./CmsClient.js";
// ── Hooks ─────────────────────────────────────────────────────────────────
export { useCmsAdmin, } from "./hooks/useCmsAdmin.js";
export { useCmsPublic, } from "./hooks/useCmsPublic.js";
// ── UI components ─────────────────────────────────────────────────────────
export { CmsListPage, CmsEditPage, CmsConflictDialog, CmsBodyEditor, contentTypeToMime, mimeToContentType, defaultToast, } from "./ui/index.js";
// Re-export schema constants used by host apps for config
export { CMS_POST_TYPES } from "../../../utils/src/cms/types.js";
