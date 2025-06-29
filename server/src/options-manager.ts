/**
 * Simple options manager for server package
 * This is a minimal version of the utils options manager to avoid workspace dependencies
 */

export interface TurnstileOptions {
  siteKey?: string;
  secretKey?: string;
  dev?: boolean;
  bypassLocalhost?: boolean;
  allowedOrigins?: string[];
}

/**
 * Simple options manager for turnstile configuration
 */
export class OptionsManager<T extends Record<string, any>> {
  private options: T;
  private readonly defaultOptions: T;

  constructor(defaultOptions: T) {
    this.defaultOptions = { ...defaultOptions };
    this.options = { ...defaultOptions };
  }

  setOptions(newOptions: Partial<T>): void {
    this.options = { ...this.options, ...newOptions };
  }

  getOptions(): T {
    return { ...this.options };
  }

  resetOptions(): void {
    this.options = { ...this.defaultOptions };
  }

  getOption<K extends keyof T>(key: K): T[K] {
    return this.options[key];
  }

  setOption<K extends keyof T>(key: K, value: T[K]): void {
    this.options[key] = value;
  }

  /**
   * Set global options for compatibility with utils package API
   * Accepts an object with utility keys and applies the appropriate options
   */
  setGlobalOptions(options: {
    "turnstile-server"?: Partial<T>;
    [key: string]: any;
  }): void {
    if (options["turnstile-server"]) {
      this.setOptions(options["turnstile-server"]);
    }
  }
}

// Default turnstile options
const defaultTurnstileOptions: TurnstileOptions = {
  dev: false,
  bypassLocalhost: false,
  allowedOrigins: [],
};

/**
 * Global options interface for compatibility with utils package API
 */
interface GlobalTurnstileOptions {
  "turnstile-server"?: TurnstileOptions;
  [key: string]: any;
}

// Global instance for turnstile options
export const optionsManager = new OptionsManager(defaultTurnstileOptions);

/**
 * Set global options for compatibility with utils package API
 * This allows the same API pattern: optionsManager.setGlobalOptions({ 'turnstile-server': { ... } })
 */
export function setGlobalOptions(options: GlobalTurnstileOptions): void {
  if (options["turnstile-server"]) {
    optionsManager.setOptions(options["turnstile-server"]);
  }
}
