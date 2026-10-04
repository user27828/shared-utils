/**
 * Server-side Turnstile verification utilities
 *
 * This package provides modular Turnstile verification for Node.js servers
 * and Cloudflare Workers with strict server-side validation. Environment
 * loading and global logger setup are explicit opt-ins at `server/env` and
 * `server/init`.
 *
 * @example
 * ```typescript
 * import { createTurnstileMiddleware, getTurnstileServerOptions } from '@shared-utils/server';
 *
 * // Configure options directly
 * const middleware = createTurnstileMiddleware({
 *   secretKey: process.env.TURNSTILE_SECRET_KEY,
 *   expectedAction: 'contact-form',
 *   expectedHostname: 'example.com'
 * });
 *
 * // Use in Express.js
 * app.post('/api/form', middleware, handler);
 * ```
 */

// Main verification functions
export {
  getTurnstileServerOptions,
  setGlobalOptions,
} from "./src/turnstile/index.js";

// Middleware
export { apiResponseSecurityHeaders } from "./src/express/apiSecurityHeaders.js";
export { createTurnstileMiddleware } from "./src/turnstile/index.js";

// Worker factory
export { createTurnstileWorker } from "./src/turnstile/index.js";

// Core verification
export { verifyTurnstileToken } from "./src/turnstile/index.js";

// Utilities
export { getAllowedOrigin } from "./src/turnstile/index.js";

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
  TurnstileVerificationOptions,
  TurnstileOptions,
  GlobalTurnstileOptions,
  TurnstileWorkerConfig,
} from "./src/turnstile/index.js";

export type { IsDevOptions } from "../utils/src/environment.js";
