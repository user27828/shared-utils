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
}
// Default turnstile options
const defaultTurnstileOptions = {
    dev: false,
    bypassLocalhost: false,
    allowedOrigins: [],
};
// Global instance for turnstile options
export const optionsManager = new OptionsManager(defaultTurnstileOptions);
//# sourceMappingURL=options-manager.js.map