/**
 * Cloudflare Worker for Turnstile token verification
 * This worker provides a secure endpoint for verifying Turnstile tokens
 * Deploy this to Cloudflare Workers and use the URL for server-side verification
 */

import { createTurnstileWorker } from "./src/turnstile/worker-factory.js";
export { createTurnstileWorker } from "./src/turnstile/worker-factory.js";
export type { TurnstileWorkerConfig } from "./src/turnstile/worker-factory.js";

export default createTurnstileWorker();
