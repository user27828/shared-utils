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

type UtilityName =
  | "log"
  | "turnstile"
  | "files"
  | "dates"
  | "site"
  | "ENV"
  | string; // string=future utilities

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
    // Disallow writes when this manager is marked readonly via __READONLY__
    // This allows higher-level code to lock options after initialization.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const asAny: any = this.options as any;
      if (asAny && asAny.__READONLY__ === true) {
        throw new Error(
          `OptionsManager: cannot modify options for '${this.utilityName}' because it is readonly`,
        );
      }
    } catch (e) {
      // If anything weird happens checking readonly, fail fast by rethrowing
      throw e;
    }
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
      // Support dot-notation writes like "category.path.to.key"
      if (typeof keyOrObject === "string" && keyOrObject.includes(".")) {
        const newOptions = cloneDeep(this.options) as any;
        set(newOptions, keyOrObject as string, value);
        this.options = newOptions;
      } else {
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
  // Options that were set via setGlobalOptions before a utility registered.
  // We store these separately so getRegisteredUtilities() only reflects
  // utilities that explicitly called registerManager(). These pending
  // options will be merged into the real manager when registerManager
  // is invoked.
  private pendingOptions: Map<UtilityName, any> = new Map();

  /**
   * Register a utility's options manager
   */
  registerManager<T extends Record<string, any>>(
    utilityName: UtilityName,
    manager: OptionsManager<T>,
  ): void {
    // registration trace removed (avoid console output in tests)
    // If options were set earlier for this utility before it registered,
    // merge them into the incoming manager now and remove the pending
    // entry. This preserves early configuration without creating a
    // placeholder manager in the registered map.
    const pending = this.pendingOptions.get(utilityName as UtilityName);
    if (pending !== undefined) {
      try {
        manager.setOption(pending as any);
      } catch (e) {
        // Ignore merge errors to avoid breaking registration
      }
      this.pendingOptions.delete(utilityName as UtilityName);
    }

    // Replace any existing manager with the incoming manager. Do not
    // merge options from the old manager into the new one; that would
    // cause unexpected carry-over between tests or registration calls.
    this.managers.set(utilityName, manager);
  }

  /**
   * Set options for multiple utilities at once
   */
  setGlobalOptions(options: GlobalOptions): void {
    for (const [utilityName, utilityOptions] of Object.entries(options)) {
      const manager = this.managers.get(utilityName as UtilityName);
      if (manager) {
        if (utilityOptions) {
          manager.setOption(utilityOptions as any);
        }
      } else {
        // Utility hasn't registered yet; stash options for later.
        if (utilityOptions) {
          const existingPending = this.pendingOptions.get(
            utilityName as UtilityName,
          );
          if (existingPending) {
            // Merge incoming pending options with existing pending options
            // using the same semantics as setOption (replace arrays).
            const merged = mergeWith(
              {},
              existingPending,
              utilityOptions,
              (objValue, srcValue) => {
                if (srcValue === undefined) {
                  return objValue;
                }
                if (Array.isArray(srcValue)) {
                  return srcValue;
                }
                return undefined;
              },
            );
            this.pendingOptions.set(utilityName as UtilityName, merged);
          } else {
            this.pendingOptions.set(
              utilityName as UtilityName,
              utilityOptions as any,
            );
          }
        }
      }
    }
  }

  /**
   * Convenience helper to set options on a specific utility manager in one call.
   * Patterns:
   *  optionsManager.setOption('site', { files: { uploadDirectory: '/tmp' } })
   *  optionsManager.setOption('site', 'files.uploadDirectory', '/tmp')
   */
  setOption(utilityName: UtilityName, keyOrObject: any): void;
  setOption(utilityName: UtilityName, keyOrPath: string, value: any): void;
  setOption(utilityName: UtilityName, keyOrPath?: any, value?: any): void {
    const manager = this.managers.get(utilityName);
    if (!manager) {
      return;
    }

    // Pattern: (utilityName, object) -> merge multiple keys
    if (
      value === undefined &&
      (typeof keyOrPath === "object" || keyOrPath === undefined)
    ) {
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

  /**
   * Convenience helper to fetch an option from a specific utility manager in one call.
   * Examples:
   *  optionsManager.getOption('site') -> returns all site options
   *  optionsManager.getOption('site', 'files.uploadDirectory') -> returns nested value
   *  optionsManager.getOption('site', 'files', 'uploadDirectory') -> returns nested value
   */
  getOption<T = any>(utilityName: UtilityName): T | undefined;
  getOption<T = any>(
    utilityName: UtilityName,
    categoryKeyOrPath: string,
  ): T | undefined;
  getOption<T = any>(
    utilityName: UtilityName,
    categoryKeyOrPath?: string,
    path?: string,
  ): T | undefined {
    const manager = this.managers.get(utilityName);
    if (!manager) {
      return undefined;
    }

    if (categoryKeyOrPath === undefined) {
      return manager.getOption() as T;
    }

    if (path !== undefined) {
      // Pattern: (utilityName, categoryKey, path)
      return manager.getOption(categoryKeyOrPath as any, path) as T;
    }

    // If categoryKeyOrPath contains a dot, let manager handle it as a full path
    return manager.getOption(categoryKeyOrPath as any) as T;
  }
}

// Create or reuse a singleton instance for cross-utility configuration.
// Use a well-known symbol (Symbol.for) on globalThis so that even if the
// module is imported multiple times from different paths or bundlers, all
// consumers get the same instance.
const GLOBAL_OPTIONS_MANAGER_KEY = Symbol.for("@shared-utils/options-manager");
let _optionsManager: GlobalOptionsManager;
try {
  const g: any = globalThis as any;
  if (g && g[GLOBAL_OPTIONS_MANAGER_KEY]) {
    _optionsManager = g[GLOBAL_OPTIONS_MANAGER_KEY] as GlobalOptionsManager;
  } else {
    _optionsManager = new GlobalOptionsManager();
    if (g) {
      g[GLOBAL_OPTIONS_MANAGER_KEY] = _optionsManager;
      // Backwards-compatible reference
      g.__shared_utils_optionsManager = _optionsManager;
    }
    try {
      // Temporary debug: trace singleton creation
      // eslint-disable-next-line no-console
      console.log(
        "[DEBUG] options-manager: singleton created and stored on Symbol.for('@shared-utils/options-manager')",
      );
    } catch (e) {
      // ignore
    }
  }
} catch (e) {
  // If anything goes wrong accessing globalThis, just create a local instance
  _optionsManager = new GlobalOptionsManager();
}

export const optionsManager = _optionsManager;

// Bind commonly-used methods onto the instance as own-properties to improve
// interoperability when this module is consumed across different bundlers
// and module systems (some consumers call `optionsManager.getOption(...)`
// directly after importing). These bindings are simple runtime shims and
// intentionally use `any` to avoid changing the exported type shape.
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const om: any = optionsManager as any;
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

// Export types for external use
export type { UtilityName, GlobalOptions };
