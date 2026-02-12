/**
 * Server CMS barrel — shared-utils/server/src/cms
 *
 * Re-exports the full server-side CMS surface:
 *  - CmsServiceCore (orchestration)
 *  - CmsConnector interface (ports)
 *  - Middleware factories (authz, rate-limiter, cache-control)
 *  - Unlock-token utility
 */

// ── Core ──────────────────────────────────────────────────────────────────
export { CmsServiceCore } from "./CmsServiceCore.js";
export type { CmsServiceCoreConfig } from "./CmsServiceCore.js";

// ── Connector (port) ──────────────────────────────────────────────────────
export type {
  CmsConnector,
  CmsConnectorWithPublicHead,
} from "./connector.js";
export { hasPublicHead } from "./connector.js";

// ── Auth / Authz ──────────────────────────────────────────────────────────
export { createCmsAuthz } from "./authz.js";
export type { CmsActorContext } from "./authz.js";

// ── Rate limiting ─────────────────────────────────────────────────────────
export {
  CmsRateLimiter,
  createCmsAdminRateLimitMiddleware,
  createCmsPublicRateLimitMiddleware,
} from "./rateLimiter.js";

// ── Cache control ─────────────────────────────────────────────────────────
export {
  getCmsPublicCacheHeaders,
  applyCmsPublicCacheHeaders,
} from "./cacheControl.js";

// ── Unlock token ──────────────────────────────────────────────────────────
export { createCmsUnlockTokenUtils } from "./unlockToken.js";
export type { CmsUnlockTokenClaims } from "./unlockToken.js";

// ── Express router factories ──────────────────────────────────────────────
export { createCmsAdminRouter } from "./express/adminRouter.js";
export type { CmsAdminRouterConfig } from "./express/adminRouter.js";

export { createCmsPublicRouter } from "./express/publicRouter.js";
export type { CmsPublicRouterConfig } from "./express/publicRouter.js";

// ── Conformance test harness ──────────────────────────────────────────────
export { runCmsConnectorConformanceTests } from "./conformance.js";
export type { ConformanceTestConfig } from "./conformance.js";
