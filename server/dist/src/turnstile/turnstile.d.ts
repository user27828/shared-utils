/**
 * Enhanced Turnstile server-side verification with dev mode and localhost bypass
 */
import type { TurnstileServerOptions, TurnstileVerifyResponse } from "./types.js";
/**
 * Get current server-side Turnstile options
 * This integrates with the global optionsManager, so you can use:
 * optionsManager.setGlobalOptions({ 'turnstile-server': { ... } })
 */
export declare function getTurnstileServerOptions(): TurnstileServerOptions;
/**
 * Enhanced verification function with dev mode support
 */
export declare function verifyTurnstileTokenEnhanced(token: string, secretKey: string, remoteip?: string | null, idempotencyKey?: string, options?: TurnstileServerOptions, request?: Request): Promise<TurnstileVerifyResponse>;
/**
 * Simple verification function for custom implementations
 */
export declare function verifyTurnstileSimple(token: string, secretKey?: string, remoteip?: string, options?: Partial<TurnstileServerOptions>): Promise<TurnstileVerifyResponse>;
//# sourceMappingURL=turnstile.d.ts.map