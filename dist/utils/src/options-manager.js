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
import { mergeWith, cloneDeep, get, has, set } from "lodash-es";
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
        // Disallow writes when this manager is marked readonly via __READONLY__
        // This allows higher-level code to lock options after initialization.
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const asAny = this.options;
            if (asAny && asAny.__READONLY__ === true) {
                throw new Error(`OptionsManager: cannot modify options for '${this.utilityName}' because it is readonly`);
            }
        }
        catch (e) {
            // If anything weird happens checking readonly, fail fast by rethrowing
            throw e;
        }
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
            // Support dot-notation writes like "category.path.to.key"
            if (typeof keyOrObject === "string" && keyOrObject.includes(".")) {
                const newOptions = cloneDeep(this.options);
                set(newOptions, keyOrObject, value);
                this.options = newOptions;
            }
            else {
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
    setOption(utilityName, keyOrPath, value) {
        const manager = this.managers.get(utilityName);
        if (!manager) {
            return;
        }
        // Pattern: (utilityName, object) -> merge multiple keys
        if (value === undefined &&
            (typeof keyOrPath === "object" || keyOrPath === undefined)) {
            // If no second arg provided or it's an object, pass-through to manager.setOption
            manager.setOption(keyOrPath);
            return;
        }
        // Pattern: (utilityName, keyOrPath, value) -> set specific category/path
        if (typeof keyOrPath === "string") {
            manager.setOption(keyOrPath, value);
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
    getOption(utilityName, categoryKeyOrPath, path) {
        const manager = this.managers.get(utilityName);
        if (!manager) {
            return undefined;
        }
        if (categoryKeyOrPath === undefined) {
            return manager.getOption();
        }
        if (path !== undefined) {
            // Pattern: (utilityName, categoryKey, path)
            return manager.getOption(categoryKeyOrPath, path);
        }
        // If categoryKeyOrPath contains a dot, let manager handle it as a full path
        return manager.getOption(categoryKeyOrPath);
    }
}
// Create singleton instance for cross-utility configuration
export const optionsManager = new GlobalOptionsManager();
// Bind commonly-used methods onto the instance as own-properties to improve
// interoperability when this module is consumed across different bundlers
// and module systems (some consumers call `optionsManager.getOption(...)`
// directly after importing). These bindings are simple runtime shims and
// intentionally use `any` to avoid changing the exported type shape.
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const om = optionsManager;
    if (typeof om.getOption === "function") {
        om.getOption = om.getOption.bind(om);
    }
    if (typeof om.setGlobalOptions === "function") {
        om.setGlobalOptions = om.setGlobalOptions.bind(om);
    }
    if (typeof om.getAllOptions === "function") {
        om.getAllOptions = om.getAllOptions.bind(om);
    }
    if (typeof om.resetAllOptions === "function") {
        om.resetAllOptions = om.resetAllOptions.bind(om);
    }
    if (typeof om.registerManager === "function") {
        om.registerManager = om.registerManager.bind(om);
    }
    if (typeof om.getManager === "function") {
        om.getManager = om.getManager.bind(om);
    }
    if (typeof om.getRegisteredUtilities === "function") {
        om.getRegisteredUtilities = om.getRegisteredUtilities.bind(om);
    }
    if (typeof om.setOption === "function") {
        om.setOption = om.setOption.bind(om);
    }
}
