/**
 * Server utilities for Turnstile verification
 * Common functions used across server-side implementations
 */
import type { Environment } from "./types.js";
/**
 * Get allowed origin for CORS
 */
export declare const getAllowedOrigin: (request: Request, env: Environment) => string | null;
//# sourceMappingURL=utils.d.ts.map