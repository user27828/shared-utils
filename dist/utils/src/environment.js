/**
 * Check if the current environment is development
 *
 * Automatically detects whether code is running in client (browser) or server (Node.js) context,
 * then applies environment-specific development checks. Can be overridden via the `environment` parameter.
 *
 * For **client-side** development detection:
 * - Checks if hostname is localhost or 127.0.0.1
 * - Checks if hostname includes "dev"
 * - Checks if running on Vite dev server (port 5173) or common dev port (3000)
 *
 * For **server-side** development detection:
 * - Explicit `devMode` override takes precedence
 * - Checks if DEV_MODE environment variable is "true"
 * - Checks if NODE_ENV === "development"
 * - Checks if DEV environment variable is "true" or "1"
 *
 * @param options - Configuration options
 * @param options.xCriteria - Extra criteria function to check if development (additional check to default)
 * @param options.environment - Override environment detection: "client" or "server". If not provided, auto-detects.
 * @param options.devMode - Explicit development mode override (takes precedence over all checks). Used for Turnstile options.
 * @param options.env - Custom environment object to use instead of process.env. Useful for testing or passing loaded env vars.
 * @returns true if development environment is detected, false otherwise
 *
 * @example
 * // Auto-detect and check
 * isDev(); // true if in dev, false otherwise
 *
 * // Override detection
 * isDev({ environment: "server" }); // Always use server dev checks
 * isDev({ environment: "client" }); // Always use client dev checks
 *
 * // With explicit devMode (Turnstile options integration)
 * isDev({ devMode: true, environment: "server" }); // Always true
 *
 * // With custom environment object
 * isDev({ env: { NODE_ENV: "development" }, environment: "server" });
 *
 * // With extra criteria
 * isDev({ xCriteria: () => process.env.DEBUG === "true" });
 */
export const isDev = ({ xCriteria = null, environment, devMode, env, } = {}) => {
    // Explicit devMode override takes precedence (for Turnstile options integration)
    if (devMode !== undefined) {
        return devMode;
    }
    // Auto-detect environment if not explicitly provided
    const isClient = environment === "client" ||
        (environment !== "server" &&
            typeof window !== "undefined" &&
            typeof document !== "undefined" &&
            typeof navigator !== "undefined");
    let result;
    if (isClient) {
        // Client-side development detection
        const hostname = window.location.hostname;
        const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
        const isDevelopmentEnv = hostname.includes("dev") ||
            hostname.includes("localhost") ||
            [5173, 5174, 5169, 3000, 3001, 3069].includes(parseInt(window.location.port, 10));
        result = isLocalhost || isDevelopmentEnv;
    }
    else {
        // Server-side development detection
        const envObj = env || process.env;
        const nodeEnv = envObj.NODE_ENV;
        const devModeEnv = envObj.DEV_MODE;
        const devEnv = envObj.DEV;
        const isDevelopmentEnv = nodeEnv === "development";
        const isDevModeTrue = devModeEnv === "true";
        const isDevEnvTrue = devEnv === "true" || devEnv === "1";
        result = isDevModeTrue || isDevelopmentEnv || isDevEnvTrue;
    }
    // Apply extra criteria if provided
    if (typeof xCriteria === "function") {
        result = result || xCriteria();
    }
    return result;
};
