/**
 * Cloudflare Worker for Turnstile token verification
 * This worker provides a secure endpoint for verifying Turnstile tokens
 * Deploy this to Cloudflare Workers and use the URL for server-side verification
 */
import type { Environment } from "./src/turnstile/index.js";
declare const _default: {
    fetch(request: Request, env: Environment): Promise<Response>;
};
export default _default;
export * from "./src/turnstile/index.js";
//# sourceMappingURL=turnstile-worker.d.ts.map