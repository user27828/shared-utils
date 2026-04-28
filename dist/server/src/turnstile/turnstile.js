/**
 * Turnstile server-side verification helpers.
 */
import { OptionsManager, optionsManager as globalOptionsManager, } from "../../../utils/index.js";
const defaultServerOptions = {
    secretKey: "",
    apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    timeoutMs: 10000,
    expectedAction: undefined,
    expectedHostname: undefined,
    allowedOrigins: [],
    tokenFieldName: "cf-turnstile-response",
};
let turnstileServerManager = null;
/**
 * Initialize or get the server options manager
 * Integrates with the global optionsManager for unified configuration
 */
const getTurnstileServerManager = () => {
    if (!turnstileServerManager) {
        turnstileServerManager = new OptionsManager("turnstile-server", defaultServerOptions);
        // Register with global options manager for cross-utility configuration
        globalOptionsManager.registerManager("turnstile-server", turnstileServerManager);
    }
    return turnstileServerManager;
};
/**
 * Get current server-side Turnstile options
 * This integrates with the global optionsManager, so you can use:
 * globalOptionsManager.setGlobalOptions({ 'turnstile-server': { ... } })
 */
export const getTurnstileServerOptions = () => {
    const manager = getTurnstileServerManager();
    return manager.getOptions();
};
/**
 * Set global options for turnstile server configuration
 * This allows the same API pattern: setGlobalOptions({ 'turnstile-server': { ... } })
 */
export const setGlobalOptions = (options) => {
    globalOptionsManager.setGlobalOptions(options);
};
//# sourceMappingURL=turnstile.js.map