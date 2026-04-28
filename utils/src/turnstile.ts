/**
 * Cloudflare Turnstile browser widget helper.
 */
import { OptionsManager } from "./options-manager.js";

type TurnstileTheme = "light" | "dark" | "auto";
type TurnstileSize = "normal" | "compact" | "flexible";
type TurnstileAppearance = "always" | "execute" | "interaction-only";
type TurnstileExecution = "render" | "execute";
type TurnstileRetry = "auto" | "never";
type TurnstileRefresh = "auto" | "manual" | "never";

interface TurnstileWidgetOptions {
  sitekey: string;
  action?: string;
  cData?: string;
  callback?: (token: string) => void;
  "error-callback"?: (errorCode?: string) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  "before-interactive-callback"?: () => void;
  "after-interactive-callback"?: () => void;
  "unsupported-callback"?: () => void;
  theme?: TurnstileTheme;
  language?: string;
  tabindex?: number;
  size?: TurnstileSize;
  retry?: TurnstileRetry;
  "retry-interval"?: number;
  "refresh-expired"?: TurnstileRefresh;
  "refresh-timeout"?: TurnstileRefresh;
  execution?: TurnstileExecution;
  appearance?: TurnstileAppearance;
  "response-field"?: boolean;
  "response-field-name"?: string;
  "feedback-enabled"?: boolean;
  "offlabel-show-privacy"?: boolean;
  "offlabel-show-help"?: boolean;
}

interface TurnstileOptions {
  siteKey?: string;
  scriptUrl?: string;
  widget?: Partial<Omit<TurnstileWidgetOptions, "sitekey">>;
}

declare global {
  interface Window {
    turnstile?: {
      ready?: (callback: () => void) => void;
      render: (
        container: string | HTMLElement,
        options: TurnstileWidgetOptions,
      ) => string;
      execute: (widgetIdOrContainer?: string | HTMLElement) => void;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
      isExpired: (widgetId?: string) => boolean;
    };
  }
}

const TURNSTILE_SCRIPT_BASE_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";
const DEFAULT_TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_SELECTOR = `script[src^="${TURNSTILE_SCRIPT_BASE_URL}"]`;

class Turnstile {
  private readonly optionsManager: OptionsManager<{
    siteKey?: string;
    scriptUrl: string;
    widget: Partial<Omit<TurnstileWidgetOptions, "sitekey">>;
  }>;
  private readonly widgetIds = new Set<string>();
  private loadPromise: Promise<void> | null = null;

  constructor() {
    const defaultOptions = {
      siteKey: undefined,
      scriptUrl: DEFAULT_TURNSTILE_SCRIPT_URL,
      widget: {
        theme: "auto" as TurnstileTheme,
        size: "normal" as TurnstileSize,
        execution: "render" as TurnstileExecution,
        appearance: "always" as TurnstileAppearance,
        retry: "auto" as TurnstileRetry,
        "retry-interval": 8000,
        "refresh-expired": "auto" as TurnstileRefresh,
        "refresh-timeout": "auto" as TurnstileRefresh,
        "response-field": true,
        "response-field-name": "cf-turnstile-response",
        "feedback-enabled": true,
      },
    };

    this.optionsManager = new OptionsManager("turnstile", defaultOptions);

    try {
      const globalState = globalThis as any;
      const globalKey = Symbol.for("@shared-utils/options-manager");
      const globalOptionsManager =
        globalState.__shared_utils_optionsManager || globalState[globalKey];
      if (
        globalOptionsManager &&
        typeof globalOptionsManager.registerManager === "function"
      ) {
        globalOptionsManager.registerManager("turnstile", this.optionsManager);
      }
    } catch {
      // ignore registration failures
    }
  }

  private get options() {
    return this.optionsManager.getOption();
  }

  private assertClient(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error(
        "Turnstile widget rendering requires a browser environment",
      );
    }
  }

  private getTurnstileApi() {
    this.assertClient();

    if (!window.turnstile) {
      throw new Error("Turnstile script is not loaded");
    }

    return window.turnstile;
  }

  private waitForTurnstile(timeoutMs = 15000): Promise<void> {
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

  async loadScript(): Promise<void> {
    this.assertClient();

    if (window.turnstile) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      TURNSTILE_SCRIPT_SELECTOR,
    );

    if (existingScript) {
      const loadPromise = this.waitForTurnstile().finally(() => {
        this.loadPromise = null;
      });
      this.loadPromise = loadPromise;
      return loadPromise;
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
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
    this.assertClient();

    if (!this.options.siteKey) {
      throw new Error(
        'Site key is required. Call turnstile.setOptions({ siteKey: "your-key" }) first.',
      );
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

  execute(widgetIdOrContainer?: string | HTMLElement): void {
    this.getTurnstileApi().execute(widgetIdOrContainer);
  }

  getResponse(widgetId?: string): string | undefined {
    return this.getTurnstileApi().getResponse(widgetId);
  }

  reset(widgetId?: string): void {
    this.getTurnstileApi().reset(widgetId);
  }

  remove(widgetId: string): void {
    this.getTurnstileApi().remove(widgetId);
    this.widgetIds.delete(widgetId);
  }

  isExpired(widgetId?: string): boolean {
    return this.getTurnstileApi().isExpired(widgetId);
  }

  getActiveWidgets(): string[] {
    return Array.from(this.widgetIds);
  }

  removeAll(): void {
    this.assertClient();

    for (const widgetId of Array.from(this.widgetIds)) {
      this.remove(widgetId);
    }
  }

  cleanup(): void {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.removeAll();
    }
  }
}

const turnstile = new Turnstile();

export { Turnstile };
export default turnstile;
