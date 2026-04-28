/**
 * Turnstile server-side verification helpers.
 */
import type { GlobalTurnstileOptions, TurnstileServerOptions } from "./types.js";
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
export declare const setGlobalOptions: (options: GlobalTurnstileOptions) => void;
//# sourceMappingURL=turnstile.d.ts.map