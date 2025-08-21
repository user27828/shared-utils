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
export { getTurnstileServerOptions, verifyTurnstileTokenEnhanced, verifyTurnstileSimple, setGlobalOptions, } from "./src/turnstile/index.js";
export { default as env, getClientUrl } from "./src/env.js";
import "./src/env.js";
export { createTurnstileMiddleware } from "./src/turnstile/index.js";
export { createTurnstileWorker } from "./src/turnstile/index.js";
export { verifyTurnstileToken } from "./src/turnstile/index.js";
export { OptionsManager, optionsManager } from "../utils/index.js";
export { isDevMode, isLocalhostRequest, createMockVerifyResponse, getAllowedOrigin, } from "./src/turnstile/index.js";
export { getClientIp } from "./src/ip.js";
export type { TurnstileVerifyRequest, TurnstileVerifyResponse, Environment, TurnstileServerOptions, TurnstileOptions, GlobalTurnstileOptions, TurnstileWorkerConfig, } from "./src/turnstile/index.js";
//# sourceMappingURL=index.d.ts.map