"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionsManager = exports.OptionsManager = exports.ORIGINAL_CONSOLE_METHODS = exports.Log = void 0;
var options_manager_js_1 = require("./options-manager.js");
Object.defineProperty(exports, "OptionsManager", { enumerable: true, get: function () { return options_manager_js_1.OptionsManager; } });
Object.defineProperty(exports, "optionsManager", { enumerable: true, get: function () { return options_manager_js_1.optionsManager; } });
// Store original console methods at module level
var ORIGINAL_CONSOLE_METHODS = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
};
exports.ORIGINAL_CONSOLE_METHODS = ORIGINAL_CONSOLE_METHODS;
var Log = /** @class */ (function () {
    function Log() {
        this.isProduction = this.detectProductionMode();
        this.interceptors = [];
        // Define default options
        var defaultOptions = {
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
        this.optionsManager = new options_manager_js_1.OptionsManager("log", defaultOptions);
        // Register with global options manager
        options_manager_js_1.optionsManager.registerManager("log", this.optionsManager);
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
    Object.defineProperty(Log.prototype, "options", {
        /**
         * Get current options via the options manager
         */
        get: function () {
            return this.optionsManager.getOption();
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Auto-detect if running in client or server environment
     */
    Log.prototype.detectEnvironment = function () {
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
    };
    /**
     * Detect if running in production mode
     */
    Log.prototype.detectProductionMode = function () {
        var _a, _b;
        // Client-side detection
        if (typeof window !== "undefined") {
            return (((_b = (_a = globalThis.process) === null || _a === void 0 ? void 0 : _a.env) === null || _b === void 0 ? void 0 : _b.NODE_ENV) === "production" ||
                window.location.hostname !== "localhost");
        }
        // Server-side detection
        if (typeof globalThis.process !== "undefined") {
            return globalThis.process.env.NODE_ENV === "production";
        }
        return false;
    };
    /**
     * Check localStorage override for client-side logging
     */
    Log.prototype.getLocalStorageOverride = function () {
        var options = this.options;
        if (options.type !== "client" || typeof localStorage === "undefined") {
            return null;
        }
        try {
            var override = localStorage.getItem(options.client.localStorageOverrideKey);
            if (!override) {
                return null;
            }
            if (override === "true") {
                return true; // Enable all levels
            }
            return JSON.parse(override);
        }
        catch (_a) {
            return null;
        }
    };
    /**
     * Get caller information from stack trace
     */
    Log.prototype.getCallerInfo = function () {
        try {
            var stack = new Error().stack;
            if (!stack)
                return null;
            var lines = stack.split("\n");
            // Skip Error line, this method, _log method, and the public log method
            // Look for the first line that's not from this log utility
            for (var i = 4; i < lines.length; i++) {
                var line = lines[i];
                if (line && !line.includes("log.ts") && !line.includes("log.js")) {
                    // Extract file and line number from stack trace
                    var match = line.match(/\((.*?):\d+:\d+\)|at (.*?):\d+:\d+/);
                    if (match) {
                        var filePath = match[1] || match[2];
                        if (filePath) {
                            // Get just the filename, not the full path
                            var fileName = filePath.split("/").pop() || filePath;
                            return fileName;
                        }
                    }
                }
            }
        }
        catch (_a) {
            // Ignore errors in stack parsing
        }
        return null;
    };
    /**
     * Check if a log level should be output
     */
    Log.prototype.shouldLog = function (level) {
        var _a, _b;
        var options = this.options;
        var config = options[options.type];
        // Always log in development
        if (!this.isProduction) {
            return true;
        }
        // Check localStorage override for client
        if (options.type === "client") {
            var override = this.getLocalStorageOverride();
            if (override === true) {
                return true;
            }
            if (Array.isArray(override) && override.includes(level)) {
                return true;
            }
        }
        // Check production config
        return (_b = (_a = config.production) === null || _a === void 0 ? void 0 : _a.includes(level)) !== null && _b !== void 0 ? _b : false;
    };
    /**
     * Format log message with namespace and timestamp
     */
    Log.prototype.formatMessage = function (level, args) {
        var options = this.options;
        var config = options[options.type];
        var timestamp = new Date().toISOString();
        var namespace = config.namespace;
        // Get caller information if enabled
        var callerInfo = options.showCaller ? this.getCallerInfo() : null;
        // Add namespace and timestamp prefix
        //const prefix = `[${timestamp}] [${namespace}] [${level.toUpperCase()}]`;
        var prefix = null;
        // Add caller information if available
        if (callerInfo) {
            var callerPrefix = "[".concat(callerInfo, "]");
            return prefix ? __spreadArray([prefix, callerPrefix], args, true) : __spreadArray([callerPrefix], args, true);
        }
        return prefix ? __spreadArray([prefix], args, true) : args;
    };
    /**
     * Core logging method
     */
    Log.prototype._log = function (level, args) {
        var options = this.options;
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
        for (var _i = 0, _a = this.interceptors; _i < _a.length; _i++) {
            var interceptor = _a[_i];
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
        var formattedArgs = this.formatMessage(level, args);
        // In test environment, use current console methods to allow mocking
        // Otherwise use original methods to preserve call stack
        var isTestEnvironment = this.isTestEnvironment();
        if (isTestEnvironment) {
            // Use current console methods for Jest mocking to work
            var currentMethod = console[level] || console.log;
            currentMethod.apply(void 0, formattedArgs);
        }
        else {
            // Use the original console methods to try to preserve call stack
            // This helps the browser show better source information
            var originalMethod = this.ORIGINAL_CONSOLE_METHODS[level] ||
                this.ORIGINAL_CONSOLE_METHODS.log;
            originalMethod.apply(void 0, formattedArgs);
        }
    };
    /**
     * Detect if we're running in a test environment
     */
    Log.prototype.isTestEnvironment = function () {
        var _a;
        // Check for Jest environment
        if (typeof global !== "undefined" &&
            global.expect &&
            global.describe &&
            global.it) {
            return true;
        }
        // Check NODE_ENV
        if (typeof process !== "undefined" && ((_a = process.env) === null || _a === void 0 ? void 0 : _a.NODE_ENV) === "test") {
            return true;
        }
        // Check for common test runners
        if (typeof window === "undefined" &&
            (typeof global !== "undefined" || typeof globalThis !== "undefined")) {
            var g = typeof global !== "undefined" ? global : globalThis;
            if (g.__coverage__ || g.jasmine || g.mocha) {
                return true;
            }
        }
        return false;
    };
    /**
     * Set logging options (delegates to OptionsManager)
     */
    Log.prototype.setOptions = function (values) {
        this.optionsManager.setOption(values);
    };
    /**
     * Get current options (delegates to OptionsManager)
     */
    Log.prototype.getOptions = function () {
        return this.optionsManager.getOption();
    };
    /**
     * Console.log equivalent
     */
    Log.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log("log", args);
    };
    /**
     * Console.info equivalent
     */
    Log.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log("info", args);
    };
    /**
     * Console.warn equivalent
     */
    Log.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log("warn", args);
    };
    /**
     * Console.error equivalent
     */
    Log.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log("error", args);
    };
    /**
     * Console.debug equivalent
     */
    Log.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log("debug", args);
    };
    /**
     * Enable debug logging in localStorage (client-side only)
     */
    Log.prototype.enableDebug = function (levels) {
        if (levels === void 0) { levels = true; }
        var options = this.options;
        if (options.type === "client") {
            if (typeof localStorage !== "undefined") {
                var value = levels === true ? "true" : JSON.stringify(levels); // Use levels argument
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
    };
    /**
     * Disable debug mode (client-side only)
     */
    Log.prototype.disableDebug = function () {
        var options = this.options;
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
    };
    /**
     * Add an interceptor function that will be called for every log message
     * @param {Function} interceptor - Function that receives (level, args) parameters
     */
    Log.prototype.addInterceptor = function (interceptor) {
        if (typeof interceptor === "function") {
            this.interceptors.push(interceptor);
        }
    };
    /**
     * Remove a previously added interceptor function
     * @param {Function} interceptor - The interceptor function to remove
     */
    Log.prototype.removeInterceptor = function (interceptor) {
        var index = this.interceptors.indexOf(interceptor);
        if (index !== -1) {
            this.interceptors.splice(index, 1);
        }
    };
    return Log;
}());
exports.Log = Log;
// Create singleton instance
var log = new Log();
exports.default = log;
