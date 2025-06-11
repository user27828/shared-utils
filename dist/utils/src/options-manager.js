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
import { mergeWith, cloneDeep } from 'lodash-es';
/**
 * Generic options manager for individual utilities
 */
export class OptionsManager {
    constructor(utilityName, defaultOptions) {
        this.utilityName = utilityName;
        this.defaultOptions = cloneDeep(defaultOptions);
        this.options = cloneDeep(defaultOptions);
    }
    /**
     * Set options (merges with existing options)
     */
    setOptions(values) {
        this.options = mergeWith({}, this.options, values, (objValue, srcValue) => {
            // Skip undefined values
            if (srcValue === undefined) {
                return objValue;
            }
            // Replace arrays instead of merging them
            if (Array.isArray(srcValue)) {
                return srcValue;
            }
            // Let lodash handle other cases (objects, primitives)
            return undefined;
        });
    }
    /**
     * Get current options (returns a copy)
     */
    getOptions() {
        return cloneDeep(this.options);
    }
    /**
     * Reset options to default values
     */
    resetOptions() {
        this.options = cloneDeep(this.defaultOptions);
    }
    /**
     * Get a specific option value
     */
    getOption(key) {
        return this.options[key];
    }
    /**
     * Set a specific option value
     */
    setOption(key, value) {
        this.options[key] = value;
    }
    /**
     * Check if an option has been set (not undefined)
     */
    hasOption(key) {
        return this.options[key] !== undefined;
    }
    /**
     * Get the utility name this manager handles
     */
    getUtilityName() {
        return this.utilityName;
    }
}
/**
 * Global options manager for cross-utility configuration
 */
class GlobalOptionsManager {
    constructor() {
        this.managers = new Map();
    }
    /**
     * Register a utility's options manager
     */
    registerManager(utilityName, manager) {
        this.managers.set(utilityName, manager);
    }
    /**
     * Set options for multiple utilities at once
     */
    setGlobalOptions(options) {
        for (const [utilityName, utilityOptions] of Object.entries(options)) {
            const manager = this.managers.get(utilityName);
            if (manager && utilityOptions) {
                manager.setOptions(utilityOptions);
            }
        }
    }
    /**
     * Get options for all registered utilities
     */
    getAllOptions() {
        const result = {};
        for (const [utilityName, manager] of this.managers.entries()) {
            result[utilityName] = manager.getOptions();
        }
        return result;
    }
    /**
     * Reset all utilities to their default options
     */
    resetAllOptions() {
        for (const manager of this.managers.values()) {
            manager.resetOptions();
        }
    }
    /**
     * Get a specific utility's manager
     */
    getManager(utilityName) {
        return this.managers.get(utilityName);
    }
    /**
     * Get all registered utility names
     */
    getRegisteredUtilities() {
        return Array.from(this.managers.keys());
    }
}
// Create singleton instance for cross-utility configuration
export const optionsManager = new GlobalOptionsManager();
