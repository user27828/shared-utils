/**
 * Cloudflare Worker Factory for Turnstile verification
 * This creates configurable workers for different deployment scenarios
 */
import type { Environment, TurnstileServerOptions } from "./types.js";
/**
 * Configuration options for the Turnstile worker
 */
export interface TurnstileWorkerConfig extends Omit<TurnstileServerOptions, "secretKey" | "tokenFieldName"> {
}
/**
 * Creates a Cloudflare Worker for Turnstile verification with optional configuration
 *
 * @param config Optional configuration to override defaults
 * @returns A Cloudflare Worker export default object
 *
 * @example
 * ```typescript
 * // Basic usage (uses environment variables and defaults)
 * export default createTurnstileWorker();
 *
 * // With custom configuration
 * export default createTurnstileWorker({
 *   allowedOrigins: ["https://myapp.com", "https://www.myapp.com"],
 *   expectedHostname: "myapp.com",
 * });
 * ```
 */
export declare const createTurnstileWorker: (config?: TurnstileWorkerConfig) => {
    fetch(request: Request, env: Environment): Promise<Response>;
};
//# sourceMappingURL=worker-factory.d.ts.map