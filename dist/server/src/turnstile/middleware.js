/**
 * Express.js and Node.js middleware for Turnstile verification
 */
import { getTurnstileServerOptions, verifyTurnstileTokenEnhanced, } from "./turnstile.js";
/**
 * Express.js middleware for Node.js servers
 * Automatically uses the global optionsManager configuration
 * Configure using: optionsManager.setGlobalOptions({ 'turnstile-server': { ... } })
 */
export const createTurnstileMiddleware = (options) => {
    // If options are provided, warn about deprecated usage
    if (options) {
        console.warn('[DEPRECATED] Pass options to createTurnstileMiddleware. Use optionsManager.setGlobalOptions({ "turnstile-server": options }) instead');
    }
    return async (req, res, next) => {
        try {
            const token = req.body["cf-turnstile-response"] || req.body.turnstileToken;
            if (!token) {
                return res.status(400).json({
                    error: "Turnstile token is required",
                    code: "MISSING_TURNSTILE_TOKEN",
                });
            }
            // Get client IP
            const clientIP = req.ip ||
                req.connection?.remoteAddress ||
                req.socket?.remoteAddress ||
                req.headers["x-forwarded-for"] ||
                req.headers["x-real-ip"];
            // Mock request object for localhost detection
            const mockRequest = {
                headers: {
                    get: (name) => req.headers[name.toLowerCase()],
                },
            };
            const serverOptions = { ...getTurnstileServerOptions(), ...options };
            // Verify token with enhanced functionality
            const result = await verifyTurnstileTokenEnhanced(token, serverOptions.secretKey || "", clientIP, undefined, serverOptions, mockRequest);
            if (!result.success) {
                return res.status(400).json({
                    error: "Turnstile verification failed",
                    code: "TURNSTILE_VERIFICATION_FAILED",
                    details: result["error-codes"],
                });
            }
            // Add verification result to request for downstream use
            req.turnstile = result;
            next();
        }
        catch (error) {
            console.error("Turnstile verification error:", error);
            return res.status(500).json({
                error: "Internal server error during Turnstile verification",
                code: "TURNSTILE_INTERNAL_ERROR",
            });
        }
    };
};
//# sourceMappingURL=middleware.js.map