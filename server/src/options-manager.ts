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
}

// Default turnstile options
const defaultTurnstileOptions: TurnstileOptions = {
  dev: false,
  bypassLocalhost: false,
  allowedOrigins: [],
};

// Global instance for turnstile options
export const optionsManager = new OptionsManager(defaultTurnstileOptions);
