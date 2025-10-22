/**
 * Core Turnstile verification functionality
 * Handles the actual API calls to Cloudflare's verification service
 */
import type { TurnstileVerifyResponse } from "./types.js";
/**
 * Verify Turnstile token with Cloudflare API
 */
export declare const verifyTurnstileToken: (token: string, secretKey: string, remoteip?: string | null, idempotencyKey?: string) => Promise<TurnstileVerifyResponse>;
//# sourceMappingURL=verification.d.ts.map