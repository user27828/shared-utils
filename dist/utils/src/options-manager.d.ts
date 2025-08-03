/**
 * Centralized options management system for all utilities
 * Provides a unified interface for managing configuration across log, turnstile, and future tools
 * while preserving individual utility APIs
 * @module utils/options-manager
 * @example
 * import { OptionsManager } from 'utils/options-manager';
 *
 * // Create manager for a specific utility
 * const manager = new OptionsManager('log', defaultLogOptions);
 *
 * // Set options (merges with existing)
 * manager.setOptions({ type: 'client' });
 *
 * // Get current options
 * const currentOptions = manager.getOptions();
 *
 * // Reset to defaults
 * manager.resetOptions();
 *
 * // Cross-utility configuration
 * import { optionsManager } from 'utils/options-manager';
 * optionsManager.setGlobalOptions({
 *   log: { type: 'client' },
 *   turnstile: { siteKey: 'key' }
 * });
 */
type UtilityName = "log" | "turnstile" | "files" | "dates" | string;
interface GlobalOptions {
    log?: any;
    turnstile?: any;
    files?: any;
    dates?: any;
    [key: string]: any;
}
/**
 * Generic options manager for individual utilities
 */
export declare class OptionsManager<T extends Record<string, any>> {
    private options;
    private readonly defaultOptions;
    private readonly utilityName;
    constructor(utilityName: string, defaultOptions: T);
    /**
     * Reset options to default values
     */
    resetOptions(): void;
    /**
     * Set options with flexible parameter patterns
     * 1. setOption(categoryKey, values) - sets values for a specific category
     * 2. setOption({categoryKey: values, ...}) - sets values for multiple categories
     * All values are merged with existing options
     */
    setOption<K extends keyof T>(keyOrObject: K | Partial<T>, value?: T[K]): void;
    /**
     * Get option value(s) with flexible parameter patterns
     * 1. getOption() - returns all options
     * 2. getOption(categoryKey) - returns all values for a category
     * 3. getOption(categoryKey, path) - returns specific value using lodash get
     * 4. getOption("category.path") - returns specific value using dot notation
     */
    getOption(): T;
    getOption<K extends keyof T>(categoryKey: K): T[K];
    getOption<K extends keyof T>(categoryKey: K, path: string): any;
    getOption(path: string): any;
    /**
     * Check if option exists with flexible parameter patterns
     * 1. hasOption(categoryKey) - checks if category exists
     * 2. hasOption(categoryKey, path) - checks if specific path exists in category
     * 3. hasOption("category.path") - checks if path exists using dot notation
     */
    hasOption<K extends keyof T>(categoryKey: K): boolean;
    hasOption<K extends keyof T>(categoryKey: K, path: string): boolean;
    hasOption(path: string): boolean;
    /**
     * Get the utility name this manager handles
     */
    getUtilityName(): string;
    /**
     * @deprecated Use setOption() instead. Backward compatibility method.
     */
    setOptions(options: Partial<T>): void;
    /**
     * @deprecated Use getOption() instead. Backward compatibility method.
     */
    getOptions(): T;
}
/**
 * Global options manager for cross-utility configuration
 */
declare class GlobalOptionsManager {
    private managers;
    /**
     * Register a utility's options manager
     */
    registerManager<T extends Record<string, any>>(utilityName: UtilityName, manager: OptionsManager<T>): void;
    /**
     * Set options for multiple utilities at once
     */
    setGlobalOptions(options: GlobalOptions): void;
    /**
     * Get options for all registered utilities
     */
    getAllOptions(): GlobalOptions;
    /**
     * Reset all utilities to their default options
     */
    resetAllOptions(): void;
    /**
     * Get a specific utility's manager
     */
    getManager<T extends Record<string, any>>(utilityName: UtilityName): OptionsManager<T> | undefined;
    /**
     * Get all registered utility names
     */
    getRegisteredUtilities(): UtilityName[];
}
export declare const optionsManager: GlobalOptionsManager;
export type { UtilityName, GlobalOptions };
//# sourceMappingURL=options-manager.d.ts.map