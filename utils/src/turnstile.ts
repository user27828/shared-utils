/**
 * Cloudflare Turnstile Widget and Verification Utility
 */
import { OptionsManager } from "./options-manager.js";

type TurnstileTheme = "light" | "dark" | "auto";
type TurnstileSize = "normal" | "compact";
type TurnstileAction = string;
type Environment = "client" | "server";

interface TurnstileWidgetOptions {
  sitekey: string;
  theme?: TurnstileTheme;
  size?: TurnstileSize;
  action?: TurnstileAction;
  cData?: string;
  callback?: (token: string) => void;
  "error-callback"?: (error?: Error) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  "after-interactive-callback"?: () => void;
  "before-interactive-callback"?: () => void;
  "unsupported-callback"?: () => void;
  retry?: "auto" | "never";
  "retry-interval"?: number;
  "refresh-expired"?: "auto" | "manual" | "never";
  language?: string;
  appearance?: "always" | "execute" | "interaction-only";
  "response-field"?: boolean;
  "response-field-name"?: string;
}

interface TurnstileOptions {
  environment?: Environment;
  siteKey?: string;
  secretKey?: string;
  apiUrl?: string;
  scriptUrl?: string;
  widget?: Partial<TurnstileWidgetOptions>;
  interceptor?: (action: string, data: any) => void;
}

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

declare global {
  interface Window {
    turnstile?: {
      ready: (callback: () => void) => void;
      render: (
        container: string | HTMLElement,
        options: TurnstileWidgetOptions,
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
      isExpired: (widgetId?: string) => boolean;
    };
  }
}

class Turnstile {
  private readonly optionsManager: OptionsManager<
    TurnstileOptions & {
      environment: Environment;
      apiUrl: string;
      scriptUrl: string;
      widget: Partial<TurnstileWidgetOptions>;
    }
  >;
  private widgetIds: Set<string> = new Set();
  private scriptLoaded = false;
  private scriptLoading = false;

  constructor() {
    const defaultOptions = {
      environment: this.detectEnvironment(),
      apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      scriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js",
      widget: {
        theme: "auto" as TurnstileTheme,
        size: "normal" as TurnstileSize,
        retry: "auto" as const,
        "retry-interval": 8000,
        "refresh-expired": "auto" as const,
        appearance: "always" as const,
        "response-field": true,
        "response-field-name": "cf-turnstile-response",
      },
      siteKey: undefined,
      secretKey: undefined,
      interceptor: undefined,
    };

    this.optionsManager = new OptionsManager("turnstile", defaultOptions);
    // Register with the global options manager if present. Prefer the
    // canonical singleton exposed on globalThis (Symbol.for) to avoid
    // creating another direct import path to the singleton which can confuse
    // consumers. Fall back to legacy __shared_utils_optionsManager if present.
    try {
      const g: any = globalThis as any;
      const GLOBAL_KEY = Symbol.for("@shared-utils/options-manager");
      const globalOm =
        (g && g.__shared_utils_optionsManager) || (g && g[GLOBAL_KEY]);
      if (globalOm && typeof globalOm.registerManager === "function") {
        globalOm.registerManager("turnstile", this.optionsManager);
      }
    } catch (e) {
      // ignore registration failures
    }

    this.render = this.render.bind(this);
    this.verify = this.verify.bind(this);
    this.reset = this.reset.bind(this);
    this.remove = this.remove.bind(this);
  }

  private get options() {
    return this.optionsManager.getOption();
  }

  private detectEnvironment(): Environment {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      return "client";
    }
    if (
      typeof globalThis !== "undefined" &&
      (globalThis as any).process?.versions?.node
    ) {
      return "server";
    }
    return "client";
  }

  private async loadScript(): Promise<void> {
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
          } else {
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

  private callInterceptor(action: string, data: any): void {
    const options = this.options;
    if (options.interceptor) {
      try {
        options.interceptor(action, data);
      } catch (error) {
        console.error("Turnstile interceptor error:", error);
      }
    }
  }

  setOptions(values: TurnstileOptions): void {
    this.optionsManager.setOption(values);
  }

  resetOptions(): void {
    this.optionsManager.resetOptions();
  }

  getOptions(): typeof this.options {
    return this.optionsManager.getOption();
  }

  async render(
    container: string | HTMLElement,
    customOptions: Partial<TurnstileWidgetOptions> = {},
  ): Promise<string> {
    const options = this.options;
    if (options.environment !== "client") {
      throw new Error("Widget rendering is only available on client-side");
    }

    if (!options.siteKey) {
      throw new Error(
        'Site key is required. Call turnstile.setOptions({ siteKey: "your-key" }) first.',
      );
    }

    this.callInterceptor("render-start", { container, customOptions });

    await this.loadScript();

    return new Promise((resolve, reject) => {
      const renderWidget = () => {
        try {
          const widgetOptions: TurnstileWidgetOptions = {
            sitekey: options.siteKey!,
            ...options.widget,
            ...customOptions,
          };

          const widgetId = window.turnstile!.render(container, widgetOptions);
          this.widgetIds.add(widgetId);

          this.callInterceptor("render-success", {
            container,
            widgetId,
            options: widgetOptions,
          });
          resolve(widgetId);
        } catch (error) {
          this.callInterceptor("render-error", { container, error });
          reject(error);
        }
      };

      // When script is dynamically loaded, don't use turnstile.ready()
      // Just render directly since the script is already loaded when we get here
      if (window.turnstile) {
        renderWidget();
      } else {
        renderWidget();
      }
    });
  }

  getResponse(widgetId?: string): string | undefined {
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

  reset(widgetId?: string): void {
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

  remove(widgetId: string): void {
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

  isExpired(widgetId?: string): boolean {
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

  async verify(
    token: string,
    remoteip?: string,
  ): Promise<TurnstileVerifyResponse> {
    const options = this.options;
    if (options.environment !== "server") {
      throw new Error("Token verification is only available on server-side");
    }

    if (!options.secretKey) {
      throw new Error(
        'Secret key is required. Call turnstile.setOptions({ secretKey: "your-key" }) first.',
      );
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

      const result: TurnstileVerifyResponse = await response.json();
      this.callInterceptor("verify-complete", { token, remoteip, result });
      return result;
    } catch (error) {
      this.callInterceptor("verify-error", { token, remoteip, error });
      throw error;
    }
  }

  getActiveWidgets(): string[] {
    return Array.from(this.widgetIds);
  }

  removeAll(): void {
    const options = this.options;
    if (options.environment !== "client") {
      throw new Error("Widget removal is only available on client-side");
    }

    const widgetIds = Array.from(this.widgetIds);
    for (const widgetId of widgetIds) {
      this.remove(widgetId);
    }
  }

  cleanup(): void {
    if (this.options.environment === "client") {
      this.removeAll();
    }
  }
}

// Create singleton instance
const turnstile = new Turnstile();

// Export both the instance and the class, plus OptionsManager components
export { Turnstile };
export default turnstile;
