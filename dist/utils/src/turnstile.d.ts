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
            render: (container: string | HTMLElement, options: TurnstileWidgetOptions) => string;
            execute: (widgetIdOrContainer?: string | HTMLElement) => void;
            remove: (widgetId: string) => void;
            reset: (widgetId?: string) => void;
            getResponse: (widgetId?: string) => string | undefined;
            isExpired: (widgetId?: string) => boolean;
        };
    }
}
declare class Turnstile {
    private readonly optionsManager;
    private readonly widgetIds;
    private loadPromise;
    constructor();
    private get options();
    private assertClient;
    private getTurnstileApi;
    private waitForTurnstile;
    loadScript(): Promise<void>;
    setOptions(values: TurnstileOptions): void;
    resetOptions(): void;
    getOptions(): typeof this.options;
    render(container: string | HTMLElement, customOptions?: Partial<TurnstileWidgetOptions>): Promise<string>;
    execute(widgetIdOrContainer?: string | HTMLElement): void;
    getResponse(widgetId?: string): string | undefined;
    reset(widgetId?: string): void;
    remove(widgetId: string): void;
    isExpired(widgetId?: string): boolean;
    getActiveWidgets(): string[];
    removeAll(): void;
    cleanup(): void;
}
declare const turnstile: Turnstile;
export { Turnstile };
export default turnstile;
//# sourceMappingURL=turnstile.d.ts.map