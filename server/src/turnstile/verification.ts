/**
 * Core Turnstile verification functionality
 * Handles the actual API calls to Cloudflare's verification service
 */

import type { TurnstileVerifyResponse } from "./types.js";

/**
 * Verify Turnstile token with Cloudflare API
 */
export const verifyTurnstileToken = async (
  token: string,
  secretKey: string,
  remoteip?: string | null,
  idempotencyKey?: string,
): Promise<TurnstileVerifyResponse> => {
  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);

  if (remoteip) {
    formData.append("remoteip", remoteip);
  }

  if (idempotencyKey) {
    formData.append("idempotency_key", idempotencyKey);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(`Turnstile API error: ${response.status}`);
  }

  return await response.json();
};
