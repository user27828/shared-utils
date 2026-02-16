/**
 * FM Express router factories barrel — shared-utils/server/src/fm/express
 */

// ── Authorization ─────────────────────────────────────────────────────────
export { createFmAuthz } from "./authz.js";
export type { FmAuthzConfig, FmAuthzResult } from "./authz.js";

// ── Admin Router ──────────────────────────────────────────────────────────
export { createFmRouter } from "./adminRouter.js";
export type { CreateFmRouterConfig } from "./adminRouter.js";

// ── Public Router ─────────────────────────────────────────────────────────
export { createFmPublicRouter } from "./publicRouter.js";
export type {
  CreateFmPublicRouterConfig,
  FmPublicRouterCacheConfig,
} from "./publicRouter.js";
