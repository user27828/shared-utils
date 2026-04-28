/**
 * Server-side Turnstile verification utilities
 *
 * This package provides modular Turnstile verification for Node.js servers
 * and Cloudflare Workers with strict server-side validation.
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
export { getTurnstileServerOptions, setGlobalOptions, } from "./src/turnstile/index.js";
export { default as env, getClientUrl } from "./src/env.js";
import "./src/env.js";
export { apiResponseSecurityHeaders } from "./src/express/apiSecurityHeaders.js";
export { createTurnstileMiddleware } from "./src/turnstile/index.js";
export { createTurnstileWorker } from "./src/turnstile/index.js";
export { verifyTurnstileToken } from "./src/turnstile/index.js";
export { getAllowedOrigin } from "./src/turnstile/index.js";
export { getClientIp } from "./src/ip.js";
export { isDev } from "./src/functions.js";
export type { TurnstileVerifyRequest, TurnstileVerifyResponse, Environment, TurnstileServerOptions, TurnstileVerificationOptions, TurnstileOptions, GlobalTurnstileOptions, TurnstileWorkerConfig, } from "./src/turnstile/index.js";
export type { IsDevOptions } from "../utils/index.js";
//# sourceMappingURL=index.d.ts.map