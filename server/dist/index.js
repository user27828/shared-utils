/**
 * Server-side Turnstile verification utilities
 *
 * This package provides modular Turnstile verification for Node.js servers
 * with dev mode support, localhost bypass, and unified configuration.
 *
 * @example
 * ```typescript
 * import { optionsManager } from '@shared-utils/utils';
 * import { createTurnstileMiddleware } from '@shared-utils/server';
 *
 * // Configure using unified optionsManager
 * optionsManager.setGlobalOptions({
 *   'turnstile-server': {
 *     secretKey: process.env.TURNSTILE_SECRET_KEY,
 *     devMode: process.env.NODE_ENV === 'development',
 *     bypassLocalhost: true
 *   }
 * });
 *
 * // Use in Express.js
 * const verifyTurnstile = createTurnstileMiddleware();
 * app.post('/api/form', verifyTurnstile, handler);
 * ```
 */
// Main verification functions
export { getTurnstileServerOptions, verifyTurnstileTokenEnhanced, verifyTurnstileSimple, } from "./src/turnstile/index.js";
// Middleware
export { createTurnstileMiddleware } from "./src/turnstile/index.js";
// Worker factory
export { createTurnstileWorker } from "./src/turnstile/index.js";
// Core verification
export { verifyTurnstileToken } from "./src/turnstile/index.js";
// Utilities
export { isDevMode, isLocalhostRequest, createMockVerifyResponse, getAllowedOrigin, } from "./src/turnstile/index.js";
//# sourceMappingURL=index.js.map