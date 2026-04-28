/**
 * Express.js and Node.js middleware for Turnstile verification
 */
import type { TurnstileServerOptions } from "./types.js";
/**
 * Express.js middleware for Node.js servers
 * Automatically uses the global optionsManager configuration.
 */
export declare const createTurnstileMiddleware: (options?: Partial<TurnstileServerOptions>) => (req: any, res: any, next: any) => Promise<any>;
//# sourceMappingURL=middleware.d.ts.map