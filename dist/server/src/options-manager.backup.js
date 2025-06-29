/**
 * Simple options manager for server package
 * This is a minimal version of the utils options manager to avoid workspace dependencies
 */
/**
 * Simple options manager for turnstile configuration
 */
export class OptionsManager {
    options;
    defaultOptions;
    constructor(defaultOptions) {
        this.defaultOptions = { ...defaultOptions };
        this.options = { ...defaultOptions };
    }
    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }
    getOptions() {
        return { ...this.options };
    }
    resetOptions() {
        this.options = { ...this.defaultOptions };
    }
    getOption(key) {
        return this.options[key];
    }
    setOption(key, value) {
        this.options[key] = value;
    }
    /**
     * Set global options for compatibility with utils package API
     * Accepts an object with utility keys and applies the appropriate options
     */
    setGlobalOptions(options) {
        if (options["turnstile-server"]) {
            this.setOptions(options["turnstile-server"]);
        }
    }
}
// Default turnstile options
const defaultTurnstileOptions = {
    dev: false,
    bypassLocalhost: false,
    allowedOrigins: [],
};
// Global instance for turnstile options
export const optionsManager = new OptionsManager(defaultTurnstileOptions);
/**
 * Set global options for compatibility with utils package API
 * This allows the same API pattern: optionsManager.setGlobalOptions({ 'turnstile-server': { ... } })
 */
export function setGlobalOptions(options) {
    if (options["turnstile-server"]) {
        optionsManager.setOptions(options["turnstile-server"]);
    }
}
//# sourceMappingURL=options-manager.backup.js.map