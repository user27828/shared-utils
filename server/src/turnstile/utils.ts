/**
 * Server utilities for Turnstile verification
 * Common functions used across server-side implementations
 */

import type { Environment } from "./types.js";

const parseAllowedOrigins = (allowedOrigins?: string): string[] => {
  if (!allowedOrigins) {
    return [];
  }

  return allowedOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

/**
 * Get allowed origin for CORS
 */
export const getAllowedOrigin = (
  request: Request,
  env: Environment,
): string | null => {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return null;
  }

  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  if (allowedOrigins.length === 0) {
    return null;
  }

  if (allowedOrigins.includes("*")) {
    return origin;
  }

  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  return null;
};
