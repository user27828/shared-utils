/**
 * Express.js and Node.js middleware for Turnstile verification
 */
import { getTurnstileServerOptions } from "./turnstile.js";
import { verifyTurnstileToken } from "./verification.js";
const getTokenFromRequestBody = (body, tokenFieldName) => {
    if (!body) {
        return undefined;
    }
    const candidateTokens = [
        body[tokenFieldName],
        body.turnstileToken,
        body.token,
    ];
    return candidateTokens.find((candidate) => typeof candidate === "string" && candidate.trim() !== "");
};
const getClientIp = (req) => {
    const forwardedFor = req.headers?.["x-forwarded-for"];
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
        return forwardedFor[0];
    }
    if (typeof forwardedFor === "string") {
        return forwardedFor.split(",")[0]?.trim();
    }
    const realIp = req.headers?.["x-real-ip"];
    if (typeof realIp === "string" && realIp.trim() !== "") {
        return realIp;
    }
    return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
};
/**
 * Express.js middleware for Node.js servers
 * Automatically uses the global optionsManager configuration.
 */
export const createTurnstileMiddleware = (options = {}) => {
    return async (req, res, next) => {
        try {
            const serverOptions = { ...getTurnstileServerOptions(), ...options };
            const tokenFieldName = serverOptions.tokenFieldName || "cf-turnstile-response";
            const token = getTokenFromRequestBody(req.body, tokenFieldName);
            if (!token) {
                return res.status(400).json({
                    error: "Turnstile token is required",
                    code: "MISSING_TURNSTILE_TOKEN",
                });
            }
            const result = await verifyTurnstileToken(token, {
                ...serverOptions,
                secretKey: serverOptions.secretKey || "",
                remoteip: getClientIp(req),
            });
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