/**
 * Cloudflare Turnstile browser widget helper.
 */
import { OptionsManager } from "./options-manager.js";
const TURNSTILE_SCRIPT_BASE_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const DEFAULT_TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_SELECTOR = `script[src^="${TURNSTILE_SCRIPT_BASE_URL}"]`;
class Turnstile {
    constructor() {
        this.widgetIds = new Set();
        this.loadPromise = null;
        const defaultOptions = {
            siteKey: undefined,
            scriptUrl: DEFAULT_TURNSTILE_SCRIPT_URL,
            widget: {
                theme: "auto",
                size: "normal",
                execution: "render",
                appearance: "always",
                retry: "auto",
                "retry-interval": 8000,
                "refresh-expired": "auto",
                "refresh-timeout": "auto",
                "response-field": true,
                "response-field-name": "cf-turnstile-response",
                "feedback-enabled": true,
            },
        };
        this.optionsManager = new OptionsManager("turnstile", defaultOptions);
        try {
            const globalState = globalThis;
            const globalKey = Symbol.for("@shared-utils/options-manager");
            const globalOptionsManager = globalState.__shared_utils_optionsManager || globalState[globalKey];
            if (globalOptionsManager &&
                typeof globalOptionsManager.registerManager === "function") {
                globalOptionsManager.registerManager("turnstile", this.optionsManager);
            }
        }
        catch {
            // ignore registration failures
        }
    }
    get options() {
        return this.optionsManager.getOption();
    }
    assertClient() {
        if (typeof window === "undefined" || typeof document === "undefined") {
            throw new Error("Turnstile widget rendering requires a browser environment");
        }
    }
    getTurnstileApi() {
        this.assertClient();
        if (!window.turnstile) {
            throw new Error("Turnstile script is not loaded");
        }
        return window.turnstile;
    }
    waitForTurnstile(timeoutMs = 15000) {
        this.assertClient();
        return new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const checkReady = () => {
                if (window.turnstile) {
                    resolve();
                    return;
                }
                if (Date.now() - startedAt >= timeoutMs) {
                    reject(new Error("Timed out loading Turnstile script"));
                    return;
                }
                setTimeout(checkReady, 25);
            };
            checkReady();
        });
    }
    async loadScript() {
        this.assertClient();
        if (window.turnstile) {
            return;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }
        const existingScript = document.querySelector(TURNSTILE_SCRIPT_SELECTOR);
        if (existingScript) {
            const loadPromise = this.waitForTurnstile().finally(() => {
                this.loadPromise = null;
            });
            this.loadPromise = loadPromise;
            return loadPromise;
        }
        const loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = this.options.scriptUrl;
            script.defer = true;
            script.onload = () => {
                this.waitForTurnstile().then(resolve).catch(reject);
            };
            script.onerror = () => {
                reject(new Error("Failed to load Turnstile script"));
            };
            document.head.appendChild(script);
        }).finally(() => {
            this.loadPromise = null;
        });
        this.loadPromise = loadPromise;
        return loadPromise;
    }
    setOptions(values) {
        this.optionsManager.setOption(values);
    }
    resetOptions() {
        this.optionsManager.resetOptions();
    }
    getOptions() {
        return this.optionsManager.getOption();
    }
    async render(container, customOptions = {}) {
        this.assertClient();
        if (!this.options.siteKey) {
            throw new Error('Site key is required. Call turnstile.setOptions({ siteKey: "your-key" }) first.');
        }
        await this.loadScript();
        const widgetId = this.getTurnstileApi().render(container, {
            sitekey: this.options.siteKey,
            ...this.options.widget,
            ...customOptions,
        });
        this.widgetIds.add(widgetId);
        return widgetId;
    }
    execute(widgetIdOrContainer) {
        this.getTurnstileApi().execute(widgetIdOrContainer);
    }
    getResponse(widgetId) {
        return this.getTurnstileApi().getResponse(widgetId);
    }
    reset(widgetId) {
        this.getTurnstileApi().reset(widgetId);
    }
    remove(widgetId) {
        this.getTurnstileApi().remove(widgetId);
        this.widgetIds.delete(widgetId);
    }
    isExpired(widgetId) {
        return this.getTurnstileApi().isExpired(widgetId);
    }
    getActiveWidgets() {
        return Array.from(this.widgetIds);
    }
    removeAll() {
        this.assertClient();
        for (const widgetId of Array.from(this.widgetIds)) {
            this.remove(widgetId);
        }
    }
    cleanup() {
        if (typeof window !== "undefined" && typeof document !== "undefined") {
            this.removeAll();
        }
    }
}
const turnstile = new Turnstile();
export { Turnstile };
export default turnstile;
