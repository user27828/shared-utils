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
type UtilityName = 'log' | 'turnstile';
interface GlobalOptions {
    log?: any;
    turnstile?: any;
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
     * Set options (merges with existing options)
     */
    setOptions(values: Partial<T>): void;
    /**
     * Get current options (returns a copy)
     */
    getOptions(): T;
    /**
     * Reset options to default values
     */
    resetOptions(): void;
    /**
     * Get a specific option value
     */
    getOption<K extends keyof T>(key: K): T[K];
    /**
     * Set a specific option value
     */
    setOption<K extends keyof T>(key: K, value: T[K]): void;
    /**
     * Check if an option has been set (not undefined)
     */
    hasOption<K extends keyof T>(key: K): boolean;
    /**
     * Get the utility name this manager handles
     */
    getUtilityName(): string;
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
