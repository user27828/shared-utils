/**
 * Server-side Turnstile verification utilities
 *
 * This package provides modular Turnstile verification for Node.js servers
 * with dev mode support, localhost bypass, and unified configuration.
 *
 * @example
 * ```typescript
 * import { createTurnstileMiddleware, getTurnstileServerOptions } from '@shared-utils/server';
 *
 * // Configure options directly
 * const middleware = createTurnstileMiddleware({
 *   secretKey: process.env.TURNSTILE_SECRET_KEY,
 *   devMode: process.env.NODE_ENV === 'development',
 *   bypassLocalhost: true
 * });
 *
 * // Use in Express.js
 * app.post('/api/form', middleware, handler);
 * ```
 */

// Main verification functions
export {
  getTurnstileServerOptions,
  verifyTurnstileTokenEnhanced,
  verifyTurnstileSimple,
  setGlobalOptions,
} from "./src/turnstile/index.js";

// Env utilities (exported here so CommonJS consumers can import from
// '@user27828/shared-utils/server')
export { default as env, getClientUrl } from "./src/env.js";

// Force env module evaluation for side-effects (ensure dotenv/load runs)
import "./src/env.js";

// Middleware
export { createTurnstileMiddleware } from "./src/turnstile/index.js";

// Worker factory
export { createTurnstileWorker } from "./src/turnstile/index.js";

// Core verification
export { verifyTurnstileToken } from "./src/turnstile/index.js";

// Utilities
export {
  isDevMode,
  isLocalhostRequest,
  createMockVerifyResponse,
  getAllowedOrigin,
} from "./src/turnstile/index.js";

// IP utilities
export { getClientIp } from "./src/ip.js";

// Helper functions
export { isDev } from "./src/functions.js";

// Types
export type {
  TurnstileVerifyRequest,
  TurnstileVerifyResponse,
  Environment,
  TurnstileServerOptions,
  TurnstileOptions,
  GlobalTurnstileOptions,
  TurnstileWorkerConfig,
} from "./src/turnstile/index.js";

export type { IsDevOptions } from "./src/functions.js";

import { log } from "../utils/index.js";

// Attach log to globalThis if not already set
if (
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).log === "undefined"
) {
  (globalThis as any).log = log;
}
