/**
 * Cloudflare Worker Factory for Turnstile verification
 * This creates configurable workers for different deployment scenarios
 */
import { verifyTurnstileToken } from "./verification.js";
import { getAllowedOrigin } from "./utils.js";
const buildCorsHeaders = (request, env, baseHeaders = {}) => {
    const headers = {
        ...baseHeaders,
        Vary: "Origin",
    };
    const allowedOrigin = getAllowedOrigin(request, env);
    if (allowedOrigin) {
        headers["Access-Control-Allow-Origin"] = allowedOrigin;
    }
    return headers;
};
const isCrossOriginRequestAllowed = (request, env) => {
    const origin = request.headers.get("Origin");
    if (!origin) {
        return true;
    }
    return getAllowedOrigin(request, env) !== null;
};
const toEnvironment = (env, allowedOrigins) => {
    if (!allowedOrigins) {
        return env;
    }
    return {
        ...env,
        ALLOWED_ORIGINS: allowedOrigins.join(","),
    };
};
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
export const createTurnstileWorker = (config = {}) => {
    return {
        async fetch(request, env) {
            const workerEnv = toEnvironment(env, config.allowedOrigins);
            if (!isCrossOriginRequestAllowed(request, workerEnv)) {
                return new Response("Forbidden", {
                    status: 403,
                    headers: buildCorsHeaders(request, workerEnv),
                });
            }
            // Handle CORS preflight
            if (request.method === "OPTIONS") {
                return new Response(null, {
                    headers: buildCorsHeaders(request, workerEnv, {
                        "Access-Control-Allow-Methods": "POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Max-Age": "86400",
                    }),
                });
            }
            // Only allow POST requests
            if (request.method !== "POST") {
                return new Response("Method not allowed", {
                    status: 405,
                    headers: buildCorsHeaders(request, workerEnv),
                });
            }
            try {
                let body;
                try {
                    body = await request.json();
                }
                catch {
                    return new Response(JSON.stringify({
                        success: false,
                        "error-codes": ["bad-request"],
                    }), {
                        status: 400,
                        headers: buildCorsHeaders(request, workerEnv, {
                            "Content-Type": "application/json",
                        }),
                    });
                }
                if (!body.token) {
                    return new Response(JSON.stringify({
                        success: false,
                        "error-codes": ["missing-input-response"],
                    }), {
                        status: 400,
                        headers: buildCorsHeaders(request, workerEnv, {
                            "Content-Type": "application/json",
                        }),
                    });
                }
                // Get client IP if not provided
                const remoteip = body.remoteip ||
                    request.headers.get("CF-Connecting-IP") ||
                    request.headers.get("X-Forwarded-For") ||
                    request.headers.get("X-Real-IP");
                const options = {
                    secretKey: env.TURNSTILE_SECRET_KEY,
                    allowedOrigins: config.allowedOrigins,
                    apiUrl: config.apiUrl,
                    timeoutMs: config.timeoutMs,
                    expectedAction: config.expectedAction,
                    expectedHostname: config.expectedHostname,
                };
                const verifyResult = await verifyTurnstileToken(body.token, {
                    ...options,
                    secretKey: env.TURNSTILE_SECRET_KEY,
                    remoteip,
                    idempotencyKey: body.idempotencyKey,
                });
                return new Response(JSON.stringify(verifyResult), {
                    status: verifyResult.success ? 200 : 400,
                    headers: buildCorsHeaders(request, workerEnv, {
                        "Content-Type": "application/json",
                    }),
                });
            }
            catch (error) {
                console.error("Turnstile verification error:", error);
                return new Response(JSON.stringify({
                    success: false,
                    "error-codes": ["internal-error"],
                }), {
                    status: 500,
                    headers: buildCorsHeaders(request, workerEnv, {
                        "Content-Type": "application/json",
                    }),
                });
            }
        },
    };
};
//# sourceMappingURL=worker-factory.js.map