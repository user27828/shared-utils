/**
 * Server utilities for Turnstile verification
 * Common functions used across server-side implementations
 */
import type { Environment, TurnstileVerifyResponse } from "./types.js";
/**
 * Check if the request is coming from localhost
 */
export declare const isLocalhostRequest: (request: Request, remoteip?: string) => boolean;
/**
 * Create a mock successful verification response for dev mode
 */
export declare const createMockVerifyResponse: () => TurnstileVerifyResponse;
/**
 * Get allowed origin for CORS
 */
export declare const getAllowedOrigin: (request: Request, env: Environment) => string;
//# sourceMappingURL=utils.d.ts.map