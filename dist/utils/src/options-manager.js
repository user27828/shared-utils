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
import { mergeWith, cloneDeep, get, has } from "lodash-es";
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
     * Reset options to default values
     */
    resetOptions() {
        this.options = cloneDeep(this.defaultOptions);
    }
    /**
     * Set options with flexible parameter patterns
     * 1. setOption(categoryKey, values) - sets values for a specific category
     * 2. setOption({categoryKey: values, ...}) - sets values for multiple categories
     * All values are merged with existing options
     */
    setOption(keyOrObject, value) {
        if (typeof keyOrObject === "object" &&
            keyOrObject !== null &&
            value === undefined) {
            // Pattern 2: setOption({categoryKey: values, ...}) - replaces setOptions functionality
            this.options = mergeWith({}, this.options, keyOrObject, (objValue, srcValue) => {
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
        else if (typeof keyOrObject === "string" ||
            typeof keyOrObject === "symbol") {
            // Pattern 1: setOption(categoryKey, values)
            if (value === undefined) {
                return; // Don't set undefined values
            }
            this.options = mergeWith({}, this.options, { [keyOrObject]: value }, (objValue, srcValue) => {
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
    }
    getOption(categoryKeyOrPath, path) {
        if (categoryKeyOrPath === undefined) {
            // Pattern 1: getOption() - return all options
            return cloneDeep(this.options);
        }
        if (path !== undefined) {
            // Pattern 3: getOption(categoryKey, path)
            const categoryValue = this.options[categoryKeyOrPath];
            return get(categoryValue, path);
        }
        if (typeof categoryKeyOrPath === "string" &&
            categoryKeyOrPath.includes(".")) {
            // Pattern 4: getOption("category.path")
            return get(this.options, categoryKeyOrPath);
        }
        // Pattern 2: getOption(categoryKey)
        return this.options[categoryKeyOrPath];
    }
    hasOption(categoryKeyOrPath, path) {
        if (path !== undefined) {
            // Pattern 2: hasOption(categoryKey, path)
            const categoryValue = this.options[categoryKeyOrPath];
            return categoryValue !== undefined && has(categoryValue, path);
        }
        if (typeof categoryKeyOrPath === "string" &&
            categoryKeyOrPath.includes(".")) {
            // Pattern 3: hasOption("category.path")
            return has(this.options, categoryKeyOrPath);
        }
        // Pattern 1: hasOption(categoryKey)
        return this.options[categoryKeyOrPath] !== undefined;
    }
    /**
     * Get the utility name this manager handles
     */
    getUtilityName() {
        return this.utilityName;
    }
    // Backward compatibility methods for existing APIs
    /**
     * @deprecated Use setOption() instead. Backward compatibility method.
     */
    setOptions(options) {
        this.setOption(options);
    }
    /**
     * @deprecated Use getOption() instead. Backward compatibility method.
     */
    getOptions() {
        return this.getOption();
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
                manager.setOption(utilityOptions);
            }
        }
    }
    /**
     * Get options for all registered utilities
     */
    getAllOptions() {
        const result = {};
        for (const [utilityName, manager] of this.managers.entries()) {
            result[utilityName] = manager.getOption();
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
