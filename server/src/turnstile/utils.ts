/**
 * Server utilities for Turnstile verification
 * Common functions used across server-side implementations
 */

import type {
  TurnstileServerOptions,
  Environment,
  TurnstileVerifyResponse,
} from "./types.js";

/**
 * Detect if we're running in a development environment
 */
export function isDevMode(
  options?: TurnstileServerOptions,
  env?: Environment,
): boolean {
  if (options?.devMode !== undefined) return options.devMode;
  if (env?.DEV_MODE === "true") return true;
  if (env?.NODE_ENV === "development") return true;
  return false;
}

/**
 * Check if the request is coming from localhost
 */
export function isLocalhostRequest(
  request: Request,
  remoteip?: string,
): boolean {
  const origin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");

  // Check origin header
  if (origin) {
    try {
      const url = new URL(origin);
      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname.endsWith(".local")
      ) {
        return true;
      }
    } catch {}
  }

  // Check referer header
  if (referer) {
    try {
      const url = new URL(referer);
      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname.endsWith(".local")
      ) {
        return true;
      }
    } catch {}
  }

  // Check remote IP
  if (remoteip) {
    if (
      remoteip === "127.0.0.1" ||
      remoteip === "::1" ||
      remoteip.startsWith("192.168.") ||
      remoteip.startsWith("10.") ||
      remoteip.startsWith("172.")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Create a mock successful verification response for dev mode
 */
export function createMockVerifyResponse(): TurnstileVerifyResponse {
  return {
    success: true,
    challenge_ts: new Date().toISOString(),
    hostname: "localhost",
    action: "dev-mode",
    cdata: "dev-bypass",
  };
}

/**
 * Get allowed origin for CORS
 */
export function getAllowedOrigin(request: Request, env: Environment): string {
  const origin = request.headers.get("Origin");

  if (!env.ALLOWED_ORIGINS) {
    return "*"; // Allow all origins if not configured
  }

  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  return allowedOrigins[0] || "*";
}
