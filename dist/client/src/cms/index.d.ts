/**
 * Client CMS barrel — shared-utils/client/src/cms
 *
 * Re-exports the full client-side CMS surface:
 *  - CmsApi interface + CmsClient implementation
 *  - React hooks (useCmsAdmin, useCmsPublic)
 *  - Portable UI components (CmsListPage, CmsEditPage, etc.)
 */
export { CmsClient, CmsClientError } from "./CmsClient.js";
export type { CmsClientConfig } from "./CmsClient.js";
export type { CmsApi, CmsAdminListParams, CmsPublicGetResult, CmsPublicUnlockResult, } from "./CmsApi.js";
export { useCmsAdmin, type UseCmsAdminOptions, type UseCmsAdminResult, } from "./hooks/useCmsAdmin.js";
export { useCmsPublic, type UseCmsPublicOptions, type UseCmsPublicResult, } from "./hooks/useCmsPublic.js";
export { CmsListPage, CmsEditPage, CmsConflictDialog, CmsBodyEditor, CmsBodyRenderer, renderCmsBody, CmsPasswordGate, contentTypeToMime, mimeToContentType, defaultToast, } from "./ui/index.js";
export type { CmsListPageProps, CmsEditPageProps, CmsConflictDialogProps, CmsBodyEditorProps, CmsContentType, CmsBodyRendererProps, CmsPasswordGateProps, CmsAdminUiConfig, CmsEditorPreference, CmsMediaPickerProps, CmsToastAdapter, CmsNavigationAdapter, } from "./ui/index.js";
export { CMS_POST_TYPES } from "../../../utils/src/cms/types.js";
export type { CmsPostType } from "../../../utils/src/cms/types.js";
//# sourceMappingURL=index.d.ts.map