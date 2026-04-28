/**
 * Cloudflare Worker for Turnstile token verification
 * This worker provides a secure endpoint for verifying Turnstile tokens
 * Deploy this to Cloudflare Workers and use the URL for server-side verification
 */

import { createTurnstileWorker } from "./src/turnstile/index.js";

export default createTurnstileWorker();

// Re-export main functionality for Node.js usage
export * from "./src/turnstile/index.js";
