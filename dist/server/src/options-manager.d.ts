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
export declare class OptionsManager<T extends Record<string, any>> {
    private options;
    private readonly defaultOptions;
    constructor(defaultOptions: T);
    setOptions(newOptions: Partial<T>): void;
    getOptions(): T;
    resetOptions(): void;
    getOption<K extends keyof T>(key: K): T[K];
    setOption<K extends keyof T>(key: K, value: T[K]): void;
}
export declare const optionsManager: OptionsManager<TurnstileOptions>;
//# sourceMappingURL=options-manager.d.ts.map