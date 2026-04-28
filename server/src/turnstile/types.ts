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
  metadata?: {
    ephemeral_id?: string;
  };
}

export interface Environment {
  TURNSTILE_SECRET_KEY: string;
  ALLOWED_ORIGINS?: string;
}

export interface TurnstileServerOptions {
  secretKey?: string;
  expectedAction?: string;
  expectedHostname?: string;
  timeoutMs?: number;
  apiUrl?: string;
  allowedOrigins?: string[];
  tokenFieldName?: string;
}

export interface TurnstileVerificationOptions extends TurnstileServerOptions {
  secretKey?: string;
  remoteip?: string | null;
  idempotencyKey?: string;
}

export type TurnstileOptions = TurnstileServerOptions;

/**
 * Global options interface for turnstile server configuration
 */
export interface GlobalTurnstileOptions {
  "turnstile-server"?: TurnstileServerOptions;
  [key: string]: any;
}
