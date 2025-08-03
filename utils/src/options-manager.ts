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

type UtilityName = "log" | "turnstile" | "files" | "dates" | string; // string=future utilities

interface GlobalOptions {
  log?: any;
  turnstile?: any;
  files?: any;
  dates?: any;
  [key: string]: any; // future utilities
}

/**
 * Generic options manager for individual utilities
 */
export class OptionsManager<T extends Record<string, any>> {
  private options: T;
  private readonly defaultOptions: T;
  private readonly utilityName: string;

  constructor(utilityName: string, defaultOptions: T) {
    this.utilityName = utilityName;
    this.defaultOptions = cloneDeep(defaultOptions);
    this.options = cloneDeep(defaultOptions);
  }

  /**
   * Reset options to default values
   */
  resetOptions(): void {
    this.options = cloneDeep(this.defaultOptions);
  }

  /**
   * Set options with flexible parameter patterns
   * 1. setOption(categoryKey, values) - sets values for a specific category
   * 2. setOption({categoryKey: values, ...}) - sets values for multiple categories
   * All values are merged with existing options
   */
  setOption<K extends keyof T>(
    keyOrObject: K | Partial<T>,
    value?: T[K],
  ): void {
    if (
      typeof keyOrObject === "object" &&
      keyOrObject !== null &&
      value === undefined
    ) {
      // Pattern 2: setOption({categoryKey: values, ...}) - replaces setOptions functionality
      this.options = mergeWith(
        {},
        this.options,
        keyOrObject,
        (objValue, srcValue) => {
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
        },
      );
    } else if (
      typeof keyOrObject === "string" ||
      typeof keyOrObject === "symbol"
    ) {
      // Pattern 1: setOption(categoryKey, values)
      if (value === undefined) {
        return; // Don't set undefined values
      }
      this.options = mergeWith(
        {},
        this.options,
        { [keyOrObject]: value },
        (objValue, srcValue) => {
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
        },
      );
    }
  }

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
  getOption<K extends keyof T>(
    categoryKeyOrPath?: K | string,
    path?: string,
  ): T | T[K] | any {
    if (categoryKeyOrPath === undefined) {
      // Pattern 1: getOption() - return all options
      return cloneDeep(this.options);
    }

    if (path !== undefined) {
      // Pattern 3: getOption(categoryKey, path)
      const categoryValue = this.options[categoryKeyOrPath as K];
      return get(categoryValue, path);
    }

    if (
      typeof categoryKeyOrPath === "string" &&
      categoryKeyOrPath.includes(".")
    ) {
      // Pattern 4: getOption("category.path")
      return get(this.options, categoryKeyOrPath);
    }

    // Pattern 2: getOption(categoryKey)
    return this.options[categoryKeyOrPath as K];
  }

  /**
   * Check if option exists with flexible parameter patterns
   * 1. hasOption(categoryKey) - checks if category exists
   * 2. hasOption(categoryKey, path) - checks if specific path exists in category
   * 3. hasOption("category.path") - checks if path exists using dot notation
   */
  hasOption<K extends keyof T>(categoryKey: K): boolean;
  hasOption<K extends keyof T>(categoryKey: K, path: string): boolean;
  hasOption(path: string): boolean;
  hasOption<K extends keyof T>(
    categoryKeyOrPath: K | string,
    path?: string,
  ): boolean {
    if (path !== undefined) {
      // Pattern 2: hasOption(categoryKey, path)
      const categoryValue = this.options[categoryKeyOrPath as K];
      return categoryValue !== undefined && has(categoryValue, path);
    }

    if (
      typeof categoryKeyOrPath === "string" &&
      categoryKeyOrPath.includes(".")
    ) {
      // Pattern 3: hasOption("category.path")
      return has(this.options, categoryKeyOrPath);
    }

    // Pattern 1: hasOption(categoryKey)
    return this.options[categoryKeyOrPath as K] !== undefined;
  }

  /**
   * Get the utility name this manager handles
   */
  getUtilityName(): string {
    return this.utilityName;
  }

  // Backward compatibility methods for existing APIs
  /**
   * @deprecated Use setOption() instead. Backward compatibility method.
   */
  setOptions(options: Partial<T>): void {
    this.setOption(options);
  }

  /**
   * @deprecated Use getOption() instead. Backward compatibility method.
   */
  getOptions(): T {
    return this.getOption();
  }
}

/**
 * Global options manager for cross-utility configuration
 */
class GlobalOptionsManager {
  private managers: Map<UtilityName, OptionsManager<any>> = new Map();

  /**
   * Register a utility's options manager
   */
  registerManager<T extends Record<string, any>>(
    utilityName: UtilityName,
    manager: OptionsManager<T>,
  ): void {
    this.managers.set(utilityName, manager);
  }

  /**
   * Set options for multiple utilities at once
   */
  setGlobalOptions(options: GlobalOptions): void {
    for (const [utilityName, utilityOptions] of Object.entries(options)) {
      const manager = this.managers.get(utilityName as UtilityName);
      if (manager && utilityOptions) {
        manager.setOption(utilityOptions);
      }
    }
  }

  /**
   * Get options for all registered utilities
   */
  getAllOptions(): GlobalOptions {
    const result: GlobalOptions = {};
    for (const [utilityName, manager] of this.managers.entries()) {
      result[utilityName] = manager.getOption();
    }
    return result;
  }

  /**
   * Reset all utilities to their default options
   */
  resetAllOptions(): void {
    for (const manager of this.managers.values()) {
      manager.resetOptions();
    }
  }

  /**
   * Get a specific utility's manager
   */
  getManager<T extends Record<string, any>>(
    utilityName: UtilityName,
  ): OptionsManager<T> | undefined {
    return this.managers.get(utilityName);
  }

  /**
   * Get all registered utility names
   */
  getRegisteredUtilities(): UtilityName[] {
    return Array.from(this.managers.keys());
  }
}

// Create singleton instance for cross-utility configuration
export const optionsManager = new GlobalOptionsManager();

// Export types for external use
export type { UtilityName, GlobalOptions };
