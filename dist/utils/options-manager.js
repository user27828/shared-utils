"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionsManager = exports.OptionsManager = void 0;
var lodash_es_1 = require("lodash-es");
/**
 * Generic options manager for individual utilities
 */
var OptionsManager = /** @class */ (function () {
    function OptionsManager(utilityName, defaultOptions) {
        this.utilityName = utilityName;
        this.defaultOptions = (0, lodash_es_1.cloneDeep)(defaultOptions);
        this.options = (0, lodash_es_1.cloneDeep)(defaultOptions);
    }
    /**
     * Reset options to default values
     */
    OptionsManager.prototype.resetOptions = function () {
        this.options = (0, lodash_es_1.cloneDeep)(this.defaultOptions);
    };
    /**
     * Set options with flexible parameter patterns
     * 1. setOption(categoryKey, values) - sets values for a specific category
     * 2. setOption({categoryKey: values, ...}) - sets values for multiple categories
     * All values are merged with existing options
     */
    OptionsManager.prototype.setOption = function (keyOrObject, value) {
        var _a;
        if (typeof keyOrObject === "object" &&
            keyOrObject !== null &&
            value === undefined) {
            // Pattern 2: setOption({categoryKey: values, ...}) - replaces setOptions functionality
            this.options = (0, lodash_es_1.mergeWith)({}, this.options, keyOrObject, function (objValue, srcValue) {
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
            this.options = (0, lodash_es_1.mergeWith)({}, this.options, (_a = {}, _a[keyOrObject] = value, _a), function (objValue, srcValue) {
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
    };
    OptionsManager.prototype.getOption = function (categoryKeyOrPath, path) {
        if (categoryKeyOrPath === undefined) {
            // Pattern 1: getOption() - return all options
            return (0, lodash_es_1.cloneDeep)(this.options);
        }
        if (path !== undefined) {
            // Pattern 3: getOption(categoryKey, path)
            var categoryValue = this.options[categoryKeyOrPath];
            return (0, lodash_es_1.get)(categoryValue, path);
        }
        if (typeof categoryKeyOrPath === "string" &&
            categoryKeyOrPath.includes(".")) {
            // Pattern 4: getOption("category.path")
            return (0, lodash_es_1.get)(this.options, categoryKeyOrPath);
        }
        // Pattern 2: getOption(categoryKey)
        return this.options[categoryKeyOrPath];
    };
    OptionsManager.prototype.hasOption = function (categoryKeyOrPath, path) {
        if (path !== undefined) {
            // Pattern 2: hasOption(categoryKey, path)
            var categoryValue = this.options[categoryKeyOrPath];
            return categoryValue !== undefined && (0, lodash_es_1.has)(categoryValue, path);
        }
        if (typeof categoryKeyOrPath === "string" &&
            categoryKeyOrPath.includes(".")) {
            // Pattern 3: hasOption("category.path")
            return (0, lodash_es_1.has)(this.options, categoryKeyOrPath);
        }
        // Pattern 1: hasOption(categoryKey)
        return this.options[categoryKeyOrPath] !== undefined;
    };
    /**
     * Get the utility name this manager handles
     */
    OptionsManager.prototype.getUtilityName = function () {
        return this.utilityName;
    };
    // Backward compatibility methods for existing APIs
    /**
     * @deprecated Use setOption() instead. Backward compatibility method.
     */
    OptionsManager.prototype.setOptions = function (options) {
        this.setOption(options);
    };
    /**
     * @deprecated Use getOption() instead. Backward compatibility method.
     */
    OptionsManager.prototype.getOptions = function () {
        return this.getOption();
    };
    return OptionsManager;
}());
exports.OptionsManager = OptionsManager;
/**
 * Global options manager for cross-utility configuration
 */
var GlobalOptionsManager = /** @class */ (function () {
    function GlobalOptionsManager() {
        this.managers = new Map();
    }
    /**
     * Register a utility's options manager
     */
    GlobalOptionsManager.prototype.registerManager = function (utilityName, manager) {
        this.managers.set(utilityName, manager);
    };
    /**
     * Set options for multiple utilities at once
     */
    GlobalOptionsManager.prototype.setGlobalOptions = function (options) {
        for (var _i = 0, _a = Object.entries(options); _i < _a.length; _i++) {
            var _b = _a[_i], utilityName = _b[0], utilityOptions = _b[1];
            var manager = this.managers.get(utilityName);
            if (manager && utilityOptions) {
                manager.setOption(utilityOptions);
            }
        }
    };
    /**
     * Get options for all registered utilities
     */
    GlobalOptionsManager.prototype.getAllOptions = function () {
        var result = {};
        for (var _i = 0, _a = this.managers.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], utilityName = _b[0], manager = _b[1];
            result[utilityName] = manager.getOption();
        }
        return result;
    };
    /**
     * Reset all utilities to their default options
     */
    GlobalOptionsManager.prototype.resetAllOptions = function () {
        for (var _i = 0, _a = this.managers.values(); _i < _a.length; _i++) {
            var manager = _a[_i];
            manager.resetOptions();
        }
    };
    /**
     * Get a specific utility's manager
     */
    GlobalOptionsManager.prototype.getManager = function (utilityName) {
        return this.managers.get(utilityName);
    };
    /**
     * Get all registered utility names
     */
    GlobalOptionsManager.prototype.getRegisteredUtilities = function () {
        return Array.from(this.managers.keys());
    };
    return GlobalOptionsManager;
}());
// Create singleton instance for cross-utility configuration
exports.optionsManager = new GlobalOptionsManager();
