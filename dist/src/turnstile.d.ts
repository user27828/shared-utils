/**
 * Cloudflare Turnstile Widget and Verification Utility
 */
import { OptionsManager, optionsManager } from "./options-manager.js";
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
            render: (container: string | HTMLElement, options: TurnstileWidgetOptions) => string;
            remove: (widgetId: string) => void;
            reset: (widgetId?: string) => void;
            getResponse: (widgetId?: string) => string | undefined;
            isExpired: (widgetId?: string) => boolean;
        };
    }
}
declare class Turnstile {
    private readonly optionsManager;
    private widgetIds;
    private scriptLoaded;
    private scriptLoading;
    constructor();
    private get options();
    private detectEnvironment;
    private loadScript;
    private callInterceptor;
    setOptions(values: TurnstileOptions): void;
    resetOptions(): void;
    getOptions(): typeof this.options;
    render(container: string | HTMLElement, customOptions?: Partial<TurnstileWidgetOptions>): Promise<string>;
    getResponse(widgetId?: string): string | undefined;
    reset(widgetId?: string): void;
    remove(widgetId: string): void;
    isExpired(widgetId?: string): boolean;
    verify(token: string, remoteip?: string): Promise<TurnstileVerifyResponse>;
    getActiveWidgets(): string[];
    removeAll(): void;
    cleanup(): void;
}
declare const turnstile: Turnstile;
export { Turnstile, OptionsManager, optionsManager };
export default turnstile;
