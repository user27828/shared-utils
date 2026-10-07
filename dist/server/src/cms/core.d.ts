/** CMS service core and connector contracts without Express routers. */
export { CmsServiceCore } from "./CmsServiceCore.js";
export type { CmsServiceCoreConfig } from "./CmsServiceCore.js";
export type { CmsAtomicUpdateResult, CmsCollaboratorReplaceResult, CmsConnector, CmsConnectorWithPublicHead, CmsEditLockResult, } from "./connector.js";
export { hasPublicHead } from "./connector.js";
