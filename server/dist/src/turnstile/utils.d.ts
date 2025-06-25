/**
 * Server utilities for Turnstile verification
 * Common functions used across server-side implementations
 */
import type { TurnstileServerOptions, Environment, TurnstileVerifyResponse } from "./types.js";
/**
 * Detect if we're running in a development environment
 */
export declare function isDevMode(options?: TurnstileServerOptions, env?: Environment): boolean;
/**
 * Check if the request is coming from localhost
 */
export declare function isLocalhostRequest(request: Request, remoteip?: string): boolean;
/**
 * Create a mock successful verification response for dev mode
 */
export declare function createMockVerifyResponse(): TurnstileVerifyResponse;
/**
 * Get allowed origin for CORS
 */
export declare function getAllowedOrigin(request: Request, env: Environment): string;
//# sourceMappingURL=utils.d.ts.map