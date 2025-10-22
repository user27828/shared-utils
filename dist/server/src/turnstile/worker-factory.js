/**
 * Cloudflare Worker Factory for Turnstile verification
 * This creates configurable workers for different deployment scenarios
 */
import { verifyTurnstileTokenEnhanced, getAllowedOrigin } from "./index.js";
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
 *   devMode: process.env.NODE_ENV === "development",
 *   bypassLocalhost: true,
 * });
 * ```
 */
export const createTurnstileWorker = (config = {}) => {
    return {
        async fetch(request, env) {
            // Handle CORS preflight
            if (request.method === "OPTIONS") {
                return new Response(null, {
                    headers: {
                        "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
                        "Access-Control-Allow-Methods": "POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Max-Age": "86400",
                    },
                });
            }
            // Only allow POST requests
            if (request.method !== "POST") {
                return new Response("Method not allowed", {
                    status: 405,
                    headers: {
                        "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
                    },
                });
            }
            try {
                // Parse request body
                const body = await request.json();
                if (!body.token) {
                    return new Response(JSON.stringify({
                        success: false,
                        "error-codes": ["missing-input-response"],
                    }), {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
                        },
                    });
                }
                // Get client IP if not provided
                const remoteip = body.remoteip ||
                    request.headers.get("CF-Connecting-IP") ||
                    request.headers.get("X-Forwarded-For") ||
                    request.headers.get("X-Real-IP");
                // Merge configuration with environment variables
                const options = {
                    secretKey: env.TURNSTILE_SECRET_KEY,
                    devMode: config.devMode ??
                        (env.DEV_MODE === "true" || env.NODE_ENV === "development"),
                    bypassLocalhost: config.bypassLocalhost ?? true,
                    allowedOrigins: config.allowedOrigins ??
                        (env.ALLOWED_ORIGINS
                            ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
                            : ["*"]),
                    apiUrl: config.apiUrl ??
                        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                    interceptor: config.interceptor,
                };
                // Verify with enhanced verification
                const verifyResult = await verifyTurnstileTokenEnhanced(body.token, env.TURNSTILE_SECRET_KEY, remoteip, body.idempotencyKey, options, request);
                return new Response(JSON.stringify(verifyResult), {
                    status: verifyResult.success ? 200 : 400,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
                    },
                });
            }
            catch (error) {
                // Use interceptor for error logging if provided
                if (config.interceptor) {
                    config.interceptor("error", {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
                else {
                    console.error("Turnstile verification error:", error);
                }
                return new Response(JSON.stringify({
                    success: false,
                    "error-codes": ["internal-error"],
                }), {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
                    },
                });
            }
        },
    };
};
//# sourceMappingURL=worker-factory.js.map