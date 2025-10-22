/**
 * Enhanced Turnstile server-side verification with dev mode and localhost bypass
 */
import type { TurnstileServerOptions, TurnstileVerifyResponse, TurnstileOptions } from "./types.js";
/**
 * Get current server-side Turnstile options
 * This integrates with the global optionsManager, so you can use:
 * globalOptionsManager.setGlobalOptions({ 'turnstile-server': { ... } })
 */
export declare const getTurnstileServerOptions: () => TurnstileServerOptions;
/**
 * Set global options for turnstile server configuration
 * This allows the same API pattern: setGlobalOptions({ 'turnstile-server': { ... } })
 */
export declare const setGlobalOptions: (options: {
    "turnstile-server"?: TurnstileOptions;
    [key: string]: any;
}) => void;
/**
 * Enhanced verification function with dev mode support
 */
export declare const verifyTurnstileTokenEnhanced: (token: string, secretKey: string, remoteip?: string | null, idempotencyKey?: string, options?: TurnstileServerOptions, request?: Request) => Promise<TurnstileVerifyResponse>;
/**
 * Simple verification function for custom implementations
 */
export declare const verifyTurnstileSimple: (token: string, secretKey?: string, remoteip?: string, options?: Partial<TurnstileServerOptions>) => Promise<TurnstileVerifyResponse>;
//# sourceMappingURL=turnstile.d.ts.map