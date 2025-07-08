/**
 * Enhanced Turnstile server-side verification with dev mode and localhost bypass
 */
import { OptionsManager, optionsManager as globalOptionsManager, } from "../../../utils/index.js";
import { isDevMode, isLocalhostRequest, createMockVerifyResponse, } from "./utils.js";
import { verifyTurnstileToken } from "./verification.js";
// Default options for server-side Turnstile verification
const defaultServerOptions = {
    secretKey: "",
    allowedOrigins: ["*"],
    devMode: false,
    bypassLocalhost: true,
    apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    interceptor: () => { },
};
// Default turnstile options for the options manager
const defaultTurnstileOptions = {
    dev: false,
    bypassLocalhost: false,
    allowedOrigins: [],
};
// Options manager for server-side configuration
let turnstileServerManager = null;
/**
 * Initialize or get the server options manager
 * Integrates with the global optionsManager for unified configuration
 */
function getTurnstileServerManager() {
    if (!turnstileServerManager) {
        turnstileServerManager = new OptionsManager("turnstile-server", defaultServerOptions);
        // Register with global options manager for cross-utility configuration
        globalOptionsManager.registerManager("turnstile-server", turnstileServerManager);
    }
    return turnstileServerManager;
}
/**
 * Get current server-side Turnstile options
 * This integrates with the global optionsManager, so you can use:
 * globalOptionsManager.setGlobalOptions({ 'turnstile-server': { ... } })
 */
export function getTurnstileServerOptions() {
    const manager = getTurnstileServerManager();
    return manager.getOptions();
}
/**
 * Set global options for turnstile server configuration
 * This allows the same API pattern: setGlobalOptions({ 'turnstile-server': { ... } })
 */
export function setGlobalOptions(options) {
    globalOptionsManager.setGlobalOptions(options);
}
/**
 * Enhanced verification function with dev mode support
 */
export async function verifyTurnstileTokenEnhanced(token, secretKey, remoteip, idempotencyKey, options, request) {
    const serverOptions = options || getTurnstileServerOptions();
    const devMode = isDevMode(serverOptions);
    const isLocalhost = request
        ? isLocalhostRequest(request, remoteip || undefined)
        : false;
    // Call interceptor for verification start
    if (serverOptions.interceptor) {
        try {
            serverOptions.interceptor("verify-start", {
                token,
                remoteip,
                idempotencyKey,
                devMode,
                isLocalhost,
            });
        }
        catch (error) {
            console.warn("Turnstile interceptor error:", error);
        }
    }
    // Dev mode: return mock success or bypass for localhost
    if (devMode) {
        const mockResponse = createMockVerifyResponse();
        if (serverOptions.interceptor) {
            try {
                serverOptions.interceptor("verify-dev-mode", {
                    token,
                    remoteip,
                    response: mockResponse,
                    bypassReason: "dev-mode",
                });
            }
            catch (error) {
                console.warn("Turnstile interceptor error:", error);
            }
        }
        return mockResponse;
    }
    // Localhost bypass (if enabled)
    if (serverOptions.bypassLocalhost && isLocalhost) {
        const mockResponse = createMockVerifyResponse();
        mockResponse.action = "localhost-bypass";
        mockResponse.cdata = "localhost-bypass";
        if (serverOptions.interceptor) {
            try {
                serverOptions.interceptor("verify-localhost-bypass", {
                    token,
                    remoteip,
                    response: mockResponse,
                    bypassReason: "localhost",
                });
            }
            catch (error) {
                console.warn("Turnstile interceptor error:", error);
            }
        }
        return mockResponse;
    }
    // Standard verification
    return await verifyTurnstileToken(token, secretKey, remoteip, idempotencyKey);
}
/**
 * Simple verification function for custom implementations
 */
export async function verifyTurnstileSimple(token, secretKey, remoteip, options) {
    const serverOptions = { ...getTurnstileServerOptions(), ...options };
    if (secretKey) {
        serverOptions.secretKey = secretKey;
    }
    return await verifyTurnstileTokenEnhanced(token, serverOptions.secretKey || "", remoteip, undefined, serverOptions);
}
//# sourceMappingURL=turnstile.js.map