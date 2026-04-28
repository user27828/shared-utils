/**
 * Core Turnstile verification functionality
 * Handles the actual API calls to Cloudflare's verification service
 */
import type { TurnstileVerificationOptions, TurnstileVerifyResponse } from "./types.js";
/**
 * Verify Turnstile token with Cloudflare API
 */
export declare const verifyTurnstileToken: (token: string, options: TurnstileVerificationOptions) => Promise<TurnstileVerifyResponse>;
//# sourceMappingURL=verification.d.ts.map