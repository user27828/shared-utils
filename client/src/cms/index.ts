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
export type { CmsClientConfig } from "./CmsClient.js";
export type {
  CmsApi,
  CmsAdminListParams,
  CmsPublicGetResult,
  CmsPublicUnlockResult,
} from "./CmsApi.js";

// ── Hooks ─────────────────────────────────────────────────────────────────
export {
  useCmsAdmin,
  type UseCmsAdminOptions,
  type UseCmsAdminResult,
} from "./hooks/useCmsAdmin.js";
export {
  useCmsPublic,
  type UseCmsPublicOptions,
  type UseCmsPublicResult,
} from "./hooks/useCmsPublic.js";

// ── UI components ─────────────────────────────────────────────────────────
export {
  CmsListPage,
  CmsEditPage,
  CmsConflictDialog,
  CmsBodyEditor,
  CmsBodyRenderer,
  renderCmsBody,
  CmsPasswordGate,
  contentTypeToMime,
  mimeToContentType,
  defaultToast,
} from "./ui/index.js";

export type {
  CmsListPageProps,
  CmsEditPageProps,
  CmsConflictDialogProps,
  CmsBodyEditorProps,
  CmsContentType,
  CmsBodyRendererProps,
  CmsPasswordGateProps,
  CmsAdminUiConfig,
  CmsEditorPreference,
  CmsMediaPickerProps,
  CmsToastAdapter,
  CmsNavigationAdapter,
} from "./ui/index.js";

// Re-export schema constants used by host apps for config
export { CMS_POST_TYPES } from "../../../utils/src/cms/types.js";
export type { CmsPostType } from "../../../utils/src/cms/types.js";
