/**
 * Cloudflare Turnstile Widget and Verification Utility
 */
import { OptionsManager, optionsManager } from "./options-manager.js";
class Turnstile {
    constructor() {
        this.widgetIds = new Set();
        this.scriptLoaded = false;
        this.scriptLoading = false;
        const defaultOptions = {
            environment: this.detectEnvironment(),
            apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            scriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js",
            widget: {
                theme: "auto",
                size: "normal",
                retry: "auto",
                "retry-interval": 8000,
                "refresh-expired": "auto",
                appearance: "always",
                "response-field": true,
                "response-field-name": "cf-turnstile-response",
            },
            siteKey: undefined,
            secretKey: undefined,
            interceptor: undefined,
        };
        this.optionsManager = new OptionsManager("turnstile", defaultOptions);
        optionsManager.registerManager("turnstile", this.optionsManager);
        this.render = this.render.bind(this);
        this.verify = this.verify.bind(this);
        this.reset = this.reset.bind(this);
        this.remove = this.remove.bind(this);
    }
    get options() {
        return this.optionsManager.getOption();
    }
    detectEnvironment() {
        if (typeof window !== "undefined" && typeof document !== "undefined") {
            return "client";
        }
        if (typeof globalThis !== "undefined" &&
            globalThis.process?.versions?.node) {
            return "server";
        }
        return "client";
    }
    async loadScript() {
        const options = this.options;
        if (options.environment !== "client") {
            throw new Error("Script loading is only available on client-side");
        }
        if (this.scriptLoaded) {
            return Promise.resolve();
        }
        if (this.scriptLoading) {
            return new Promise((resolve) => {
                const checkLoaded = () => {
                    if (this.scriptLoaded) {
                        resolve();
                    }
                    else {
                        setTimeout(checkLoaded, 50);
                    }
                };
                checkLoaded();
            });
        }
        this.scriptLoading = true;
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = options.scriptUrl;
            // Remove async/defer to fix "Remove async/defer from the Turnstile api.js script tag" error
            // script.async = true;
            // script.defer = true;
            script.onload = () => {
                this.scriptLoaded = true;
                this.scriptLoading = false;
                resolve();
            };
            script.onerror = () => {
                this.scriptLoading = false;
                reject(new Error("Failed to load Turnstile script"));
            };
            document.head.appendChild(script);
        });
    }
    callInterceptor(action, data) {
        const options = this.options;
        if (options.interceptor) {
            try {
                options.interceptor(action, data);
            }
            catch (error) {
                console.error("Turnstile interceptor error:", error);
            }
        }
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
        const options = this.options;
        if (options.environment !== "client") {
            throw new Error("Widget rendering is only available on client-side");
        }
        if (!options.siteKey) {
            throw new Error('Site key is required. Call turnstile.setOptions({ siteKey: "your-key" }) first.');
        }
        this.callInterceptor("render-start", { container, customOptions });
        await this.loadScript();
        return new Promise((resolve, reject) => {
            const renderWidget = () => {
                try {
                    const widgetOptions = {
                        sitekey: options.siteKey,
                        ...options.widget,
                        ...customOptions,
                    };
                    const widgetId = window.turnstile.render(container, widgetOptions);
                    this.widgetIds.add(widgetId);
                    this.callInterceptor("render-success", {
                        container,
                        widgetId,
                        options: widgetOptions,
                    });
                    resolve(widgetId);
                }
                catch (error) {
                    this.callInterceptor("render-error", { container, error });
                    reject(error);
                }
            };
            // When script is dynamically loaded, don't use turnstile.ready()
            // Just render directly since the script is already loaded when we get here
            if (window.turnstile) {
                renderWidget();
            }
            else {
                renderWidget();
            }
        });
    }
    getResponse(widgetId) {
        const options = this.options;
        if (options.environment !== "client") {
            throw new Error("Getting response is only available on client-side");
        }
        if (!window.turnstile) {
            throw new Error("Turnstile script not loaded");
        }
        const response = window.turnstile.getResponse(widgetId);
        this.callInterceptor("get-response", { widgetId, response });
        return response;
    }
    reset(widgetId) {
        const options = this.options;
        if (options.environment !== "client") {
            throw new Error("Widget reset is only available on client-side");
        }
        if (!window.turnstile) {
            throw new Error("Turnstile script not loaded");
        }
        window.turnstile.reset(widgetId);
        this.callInterceptor("reset", { widgetId });
    }
    remove(widgetId) {
        const options = this.options;
        if (options.environment !== "client") {
            throw new Error("Widget removal is only available on client-side");
        }
        if (!window.turnstile) {
            throw new Error("Turnstile script not loaded");
        }
        window.turnstile.remove(widgetId);
        this.widgetIds.delete(widgetId);
        this.callInterceptor("remove", { widgetId });
    }
    isExpired(widgetId) {
        const options = this.options;
        if (options.environment !== "client") {
            throw new Error("Widget expiry check is only available on client-side");
        }
        if (!window.turnstile) {
            throw new Error("Turnstile script not loaded");
        }
        const expired = window.turnstile.isExpired(widgetId);
        this.callInterceptor("is-expired", { widgetId, expired });
        return expired;
    }
    async verify(token, remoteip) {
        const options = this.options;
        if (options.environment !== "server") {
            throw new Error("Token verification is only available on server-side");
        }
        if (!options.secretKey) {
            throw new Error('Secret key is required. Call turnstile.setOptions({ secretKey: "your-key" }) first.');
        }
        this.callInterceptor("verify-start", { token, remoteip });
        const formData = new URLSearchParams();
        formData.append("secret", options.secretKey);
        formData.append("response", token);
        if (remoteip) {
            formData.append("remoteip", remoteip);
        }
        try {
            const response = await fetch(options.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            this.callInterceptor("verify-complete", { token, remoteip, result });
            return result;
        }
        catch (error) {
            this.callInterceptor("verify-error", { token, remoteip, error });
            throw error;
        }
    }
    getActiveWidgets() {
        return Array.from(this.widgetIds);
    }
    removeAll() {
        const options = this.options;
        if (options.environment !== "client") {
            throw new Error("Widget removal is only available on client-side");
        }
        const widgetIds = Array.from(this.widgetIds);
        for (const widgetId of widgetIds) {
            this.remove(widgetId);
        }
    }
    cleanup() {
        if (this.options.environment === "client") {
            this.removeAll();
        }
    }
}
// Create singleton instance
const turnstile = new Turnstile();
// Export both the instance and the class, plus OptionsManager components
export { Turnstile, OptionsManager, optionsManager };
export default turnstile;
