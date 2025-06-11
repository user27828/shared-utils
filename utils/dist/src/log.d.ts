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
 * // Custom interceptor
 * log.setOptions({ interceptor: (level, args) => { sendToAnalytics(level, args); } });
 *
 * // Cross-utility configuration via OptionsManager
 * import { optionsManager } from 'utils/options-manager';
 * optionsManager.setGlobalOptions({
 *   log: { type: 'client', client: { production: ['warn', 'error'] } },
 *   turnstile: { siteKey: 'your-key' }
 * });
 */
import { OptionsManager, optionsManager } from './options-manager.js';
type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
type Environment = 'client' | 'server';
interface OriginalConsoleMethods {
    log: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
}
declare const ORIGINAL_CONSOLE_METHODS: OriginalConsoleMethods;
interface LogOptions {
    type?: Environment;
    interceptor?: (level: LogLevel, args: any[]) => void;
    client?: {
        namespace?: string;
        production?: LogLevel[];
        localStorageOverrideKey?: string;
        attachWindow?: boolean;
    };
    server?: {
        namespace?: string;
        production?: LogLevel[];
    };
}
declare class Log {
    private readonly optionsManager;
    private isProduction;
    readonly ORIGINAL_CONSOLE_METHODS: OriginalConsoleMethods;
    private interceptors;
    constructor();
    /**
     * Get current options via the options manager
     */
    private get options();
    /**
     * Auto-detect if running in client or server environment
     */
    private detectEnvironment;
    /**
     * Detect if running in production mode
     */
    private detectProductionMode;
    /**
     * Check localStorage override for client-side logging
     */
    private getLocalStorageOverride;
    /**
     * Check if a log level should be output
     */
    private shouldLog;
    /**
     * Format log message with namespace and timestamp
     */
    private formatMessage;
    /**
     * Core logging method
     */
    private _log;
    /**
     * Set logging options (delegates to OptionsManager)
     */
    setOptions(values: LogOptions): void;
    /**
     * Get current options (delegates to OptionsManager)
     */
    getOptions(): typeof this.options;
    /**
     * Console.log equivalent
     */
    log(...args: any[]): void;
    /**
     * Console.info equivalent
     */
    info(...args: any[]): void;
    /**
     * Console.warn equivalent
     */
    warn(...args: any[]): void;
    /**
     * Console.error equivalent
     */
    error(...args: any[]): void;
    /**
     * Console.debug equivalent
     */
    debug(...args: any[]): void;
    /**
     * Enable debug logging in localStorage (client-side only)
     */
    enableDebug(levels?: LogLevel[] | boolean): void;
    /**
     * Disable debug mode (client-side only)
     */
    disableDebug(): void;
    /**
     * Add an interceptor function that will be called for every log message
     * @param {Function} interceptor - Function that receives (level, args) parameters
     */
    addInterceptor(interceptor: (level: LogLevel, args: any[]) => void): void;
    /**
     * Remove a previously added interceptor function
     * @param {Function} interceptor - The interceptor function to remove
     */
    removeInterceptor(interceptor: (level: LogLevel, args: any[]) => void): void;
}
declare const log: Log;
export { Log, ORIGINAL_CONSOLE_METHODS, OptionsManager, optionsManager };
export default log;
