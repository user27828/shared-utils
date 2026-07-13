/**
 * Cloudflare Worker for Turnstile token verification
 * This worker provides a secure endpoint for verifying Turnstile tokens
 * Deploy this to Cloudflare Workers and use the URL for server-side verification
 */
export { createTurnstileWorker } from "./src/turnstile/worker-factory.js";
export type { TurnstileWorkerConfig } from "./src/turnstile/worker-factory.js";
declare const _default: {
    fetch(request: Request, env: import("./index.js").Environment): Promise<Response>;
};
export default _default;
//# sourceMappingURL=turnstile-worker.d.ts.map