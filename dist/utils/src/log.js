/**
 * Logging utility that wraps console.<log|info|warn|error>
 * The default behavior of this utility is to log NOTHING for client-side production environments,
 * unlike the default console methods.
 * The server-side will automatically disable non-warn/error logging for non-production environments.
 * Either default behavior can be overridden by changing it's configuration.
 * @module utils/log
 * @example
 * import { log } from 'utils/log';
 * log('This is a log message');          // Equal to console.log
 * log.info('This is an info message');   // Equal to console.info
 * log.warn('This is a warning message'); // Equal to console.warn
 * log.error('This is an error message'); // Equal to console.error
 * log.debug('This is a debug message');  // Equal to console.debug - Will not log in production
 *
 * // Configuration (set once on initialization)
 * log.setOptions({ type: 'client', client: { production: ['warn', 'error'] } });
 *
 * // Show caller file information in log messages
 * log.setOptions({ showCaller: true });
 * // Now logs will include [filename.js] prefix showing where log was called from
 *
 * // Custom interceptor
 * log.setOptions({ interceptor: (level, args) => { sendToAnalytics(level, args); } });
 *
 * // Cross-utility configuration via OptionsManager
 * import { optionsManager } from 'utils/options-manager';
 * optionsManager.setGlobalOptions({
 *   log: { type: 'client', client: { production: ['warn', 'error'] }, showCaller: true },
 *   turnstile: { siteKey: 'your-key' }
 * });
 */
import { OptionsManager, optionsManager } from "./options-manager.js";
// Store original console methods at module level
const ORIGINAL_CONSOLE_METHODS = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
};
class Log {
    constructor() {
        this.isProduction = this.detectProductionMode();
        this.interceptors = [];
        // Define default options
        const defaultOptions = {
            // Auto-detect environment - 'client' or 'server'
            type: this.detectEnvironment(),
            showCaller: true, // Add caller information to log messages
            client: {
                namespace: "client", // Namespace for client-side logging
                production: [], // List of log levels to log in production, e.g. ['warn', 'error']
                // key to override log levels in localStorage - if set, then production can see specified log levels, or all
                // if the key is set to [true] = all log levels, otherwise allow specifying levels as a string[]
                localStorageOverrideKey: "logLevels",
                attachWindow: true, // Attach to window.log for easy access in client-side code
            },
            server: {
                namespace: "server",
                production: ["error"],
            },
            interceptor: undefined,
        };
        // Initialize options manager
        this.optionsManager = new OptionsManager("log", defaultOptions);
        // Register with global options manager
        optionsManager.registerManager("log", this.optionsManager);
        this.ORIGINAL_CONSOLE_METHODS = ORIGINAL_CONSOLE_METHODS; // Assign module-level const to instance property
        // Bind methods to maintain context when destructured
        this.log = this.log.bind(this);
        this.info = this.info.bind(this);
        this.warn = this.warn.bind(this);
        this.error = this.error.bind(this);
        this.debug = this.debug.bind(this);
        if (this.options.type === "client" && this.options.client.attachWindow) {
            // Attach to window.log for easy access in client-side code
            globalThis.log = this;
        }
    }
    /**
     * Get current options via the options manager
     */
    get options() {
        return this.optionsManager.getOption();
    }
    /**
     * Auto-detect if running in client or server environment
     */
    detectEnvironment() {
        if (typeof window !== "undefined" && typeof document !== "undefined") {
            return "client";
        }
        if (typeof globalThis.process !== "undefined" &&
            globalThis.process.versions &&
            globalThis.process.versions.node) {
            return "server";
        }
        // Fallback - assume client if uncertain
        return "client";
    }
    /**
     * Detect if running in production mode
     */
    detectProductionMode() {
        // Client-side detection
        if (typeof window !== "undefined") {
            return (globalThis.process?.env?.NODE_ENV === "production" ||
                window.location.hostname !== "localhost");
        }
        // Server-side detection
        if (typeof globalThis.process !== "undefined") {
            return globalThis.process.env.NODE_ENV === "production";
        }
        return false;
    }
    /**
     * Check localStorage override for client-side logging
     */
    getLocalStorageOverride() {
        const options = this.options;
        if (options.type !== "client" || typeof localStorage === "undefined") {
            return null;
        }
        try {
            const override = localStorage.getItem(options.client.localStorageOverrideKey);
            if (!override) {
                return null;
            }
            if (override === "true") {
                return true; // Enable all levels
            }
            return JSON.parse(override);
        }
        catch {
            return null;
        }
    }
    /**
     * Get caller information from stack trace
     */
    getCallerInfo() {
        try {
            const stack = new Error().stack;
            if (!stack)
                return null;
            const lines = stack.split("\n");
            // Skip Error line, this method, _log method, and the public log method
            // Look for the first line that's not from this log utility
            for (let i = 4; i < lines.length; i++) {
                const line = lines[i];
                if (line && !line.includes("log.ts") && !line.includes("log.js")) {
                    // Extract file and line number from stack trace
                    const match = line.match(/\((.*?):\d+:\d+\)|at (.*?):\d+:\d+/);
                    if (match) {
                        const filePath = match[1] || match[2];
                        if (filePath) {
                            // Get just the filename, not the full path
                            const fileName = filePath.split("/").pop() || filePath;
                            return fileName;
                        }
                    }
                }
            }
        }
        catch {
            // Ignore errors in stack parsing
        }
        return null;
    }
    /**
     * Check if a log level should be output
     */
    shouldLog(level) {
        const options = this.options;
        const config = options[options.type];
        // Always log in development
        if (!this.isProduction) {
            return true;
        }
        // Check localStorage override for client
        if (options.type === "client") {
            const override = this.getLocalStorageOverride();
            if (override === true) {
                return true;
            }
            if (Array.isArray(override) && override.includes(level)) {
                return true;
            }
        }
        // Check production config
        return config.production?.includes(level) ?? false;
    }
    /**
     * Format log message with namespace and timestamp
     */
    formatMessage(level, args) {
        const options = this.options;
        const config = options[options.type];
        const timestamp = new Date().toISOString();
        const namespace = config.namespace;
        // Get caller information if enabled
        const callerInfo = options.showCaller ? this.getCallerInfo() : null;
        // Add namespace and timestamp prefix
        //const prefix = `[${timestamp}] [${namespace}] [${level.toUpperCase()}]`;
        const prefix = null;
        // Add caller information if available
        if (callerInfo) {
            const callerPrefix = `[${callerInfo}]`;
            return prefix ? [prefix, callerPrefix, ...args] : [callerPrefix, ...args];
        }
        return prefix ? [prefix, ...args] : args;
    }
    /**
     * Core logging method
     */
    _log(level, args) {
        const options = this.options;
        // Call legacy interceptor if configured (for backward compatibility)
        if (options.interceptor) {
            try {
                options.interceptor(level, args);
            }
            catch (error) {
                // Don't let interceptor errors break logging
                this.ORIGINAL_CONSOLE_METHODS.error("Log interceptor error:", error);
            }
        }
        // Call all registered interceptors
        for (const interceptor of this.interceptors) {
            try {
                interceptor(level, args);
            }
            catch (error) {
                // Don't let interceptor errors break logging
                this.ORIGINAL_CONSOLE_METHODS.error("Log interceptor error:", error);
            }
        }
        // Check if we should actually log
        if (!this.shouldLog(level)) {
            return;
        }
        // Format message and log
        const formattedArgs = this.formatMessage(level, args);
        // In test environment, use current console methods to allow mocking
        // Otherwise use original methods to preserve call stack
        const isTestEnvironment = this.isTestEnvironment();
        if (isTestEnvironment) {
            // Use current console methods for Jest mocking to work
            const currentMethod = console[level] || console.log;
            currentMethod(...formattedArgs);
        }
        else {
            // Use the original console methods to try to preserve call stack
            // This helps the browser show better source information
            const originalMethod = this.ORIGINAL_CONSOLE_METHODS[level] ||
                this.ORIGINAL_CONSOLE_METHODS.log;
            originalMethod(...formattedArgs);
        }
    }
    /**
     * Detect if we're running in a test environment
     */
    isTestEnvironment() {
        // Check for Jest environment
        if (typeof globalThis.global !== "undefined" &&
            globalThis.global.expect &&
            globalThis.global.describe &&
            globalThis.global.it) {
            return true;
        }
        // Check NODE_ENV
        if (typeof globalThis.process !== "undefined" &&
            globalThis.process.env?.NODE_ENV === "test") {
            return true;
        }
        // Check for common test runners
        if (typeof window === "undefined" &&
            (typeof globalThis.global !== "undefined" ||
                typeof globalThis !== "undefined")) {
            const g = typeof globalThis.global !== "undefined"
                ? globalThis.global
                : globalThis;
            if (g.__coverage__ || g.jasmine || g.mocha) {
                return true;
            }
        }
        return false;
    }
    /**
     * Set logging options (delegates to OptionsManager)
     */
    setOptions(values) {
        this.optionsManager.setOption(values);
    }
    /**
     * Get current options (delegates to OptionsManager)
     */
    getOptions() {
        return this.optionsManager.getOption();
    }
    /**
     * Console.log equivalent
     */
    log(...args) {
        this._log("log", args);
    }
    /**
     * Console.info equivalent
     */
    info(...args) {
        this._log("info", args);
    }
    /**
     * Console.warn equivalent
     */
    warn(...args) {
        this._log("warn", args);
    }
    /**
     * Console.error equivalent
     */
    error(...args) {
        this._log("error", args);
    }
    /**
     * Console.debug equivalent
     */
    debug(...args) {
        this._log("debug", args);
    }
    /**
     * Enable debug logging in localStorage (client-side only)
     */
    enableDebug(levels = true) {
        const options = this.options;
        if (options.type === "client") {
            if (typeof localStorage !== "undefined") {
                const value = levels === true ? "true" : JSON.stringify(levels); // Use levels argument
                localStorage.setItem(options.client.localStorageOverrideKey, value);
                this.ORIGINAL_CONSOLE_METHODS.info("Debug mode enabled. Refresh page to see all logs.");
            }
            else {
                this.ORIGINAL_CONSOLE_METHODS.warn("localStorage not available, cannot enable debug mode.");
            }
        }
        else {
            this.ORIGINAL_CONSOLE_METHODS.warn("enableDebug only works on client-side");
        }
    }
    /**
     * Disable debug mode (client-side only)
     */
    disableDebug() {
        const options = this.options;
        if (options.type === "client") {
            if (typeof localStorage !== "undefined") {
                localStorage.removeItem(options.client.localStorageOverrideKey);
                this.ORIGINAL_CONSOLE_METHODS.info("Debug mode disabled. Refresh page to restore production log levels.");
            }
            else {
                this.ORIGINAL_CONSOLE_METHODS.warn("localStorage not available, cannot disable debug mode.");
            }
        }
        else {
            this.ORIGINAL_CONSOLE_METHODS.warn("disableDebug only works on client-side");
        }
    }
    /**
     * Add an interceptor function that will be called for every log message
     * @param {Function} interceptor - Function that receives (level, args) parameters
     */
    addInterceptor(interceptor) {
        if (typeof interceptor === "function") {
            this.interceptors.push(interceptor);
        }
    }
    /**
     * Remove a previously added interceptor function
     * @param {Function} interceptor - The interceptor function to remove
     */
    removeInterceptor(interceptor) {
        const index = this.interceptors.indexOf(interceptor);
        if (index !== -1) {
            this.interceptors.splice(index, 1);
        }
    }
}
// Create singleton instance
const log = new Log();
// Export both the instance and the class, plus OptionsManager components
export { Log, ORIGINAL_CONSOLE_METHODS, OptionsManager, optionsManager };
export default log;
