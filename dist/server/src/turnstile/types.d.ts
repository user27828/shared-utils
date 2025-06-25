/**
 * Type definitions for server-side Turnstile verification
 */
export interface TurnstileVerifyRequest {
    token: string;
    remoteip?: string;
    idempotencyKey?: string;
}
export interface TurnstileVerifyResponse {
    success: boolean;
    "error-codes"?: string[];
    challenge_ts?: string;
    hostname?: string;
    action?: string;
    cdata?: string;
}
export interface Environment {
    TURNSTILE_SECRET_KEY: string;
    ALLOWED_ORIGINS?: string;
    NODE_ENV?: string;
    DEV_MODE?: string;
}
export interface TurnstileServerOptions {
    secretKey?: string;
    allowedOrigins?: string[];
    devMode?: boolean;
    bypassLocalhost?: boolean;
    apiUrl?: string;
    interceptor?: (action: string, data: any) => void;
}
//# sourceMappingURL=types.d.ts.map