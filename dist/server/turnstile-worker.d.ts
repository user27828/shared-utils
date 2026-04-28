/**
 * Cloudflare Worker for Turnstile token verification
 * This worker provides a secure endpoint for verifying Turnstile tokens
 * Deploy this to Cloudflare Workers and use the URL for server-side verification
 */
declare const _default: {
    fetch(request: Request, env: import("./index.js").Environment): Promise<Response>;
};
export default _default;
export * from "./src/turnstile/index.js";
//# sourceMappingURL=turnstile-worker.d.ts.map