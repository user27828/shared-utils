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
export { getTurnstileServerOptions, verifyTurnstileTokenEnhanced, verifyTurnstileSimple, setGlobalOptions, } from "./src/turnstile/index.js";
// Middleware
export { createTurnstileMiddleware } from "./src/turnstile/index.js";
// Worker factory
export { createTurnstileWorker } from "./src/turnstile/index.js";
// Core verification
export { verifyTurnstileToken } from "./src/turnstile/index.js";
// Options management
export { OptionsManager, optionsManager } from "@shared-utils/utils";
// Utilities
export { isDevMode, isLocalhostRequest, createMockVerifyResponse, getAllowedOrigin, } from "./src/turnstile/index.js";
//# sourceMappingURL=index.js.map