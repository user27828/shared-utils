/**
 * Core Turnstile verification functionality
 * Handles the actual API calls to Cloudflare's verification service
 */

import type {
  TurnstileVerificationOptions,
  TurnstileVerifyResponse,
} from "./types.js";

const DEFAULT_TURNSTILE_API_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEFAULT_TURNSTILE_TIMEOUT_MS = 10000;

/**
 * Verify Turnstile token with Cloudflare API
 */
export const verifyTurnstileToken = async (
  token: string,
  options: TurnstileVerificationOptions,
): Promise<TurnstileVerifyResponse> => {
  if (!options.secretKey) {
    throw new Error("Turnstile secret key is required");
  }

  if (typeof token !== "string" || token.trim() === "") {
    return {
      success: false,
      "error-codes": ["missing-input-response"],
    };
  }

  if (token.length > 2048) {
    return {
      success: false,
      "error-codes": ["invalid-input-response"],
    };
  }

  const formData = new URLSearchParams();
  formData.append("secret", options.secretKey);
  formData.append("response", token);

  if (options.remoteip) {
    formData.append("remoteip", options.remoteip);
  }

  if (options.idempotencyKey) {
    formData.append("idempotency_key", options.idempotencyKey);
  }

  const timeoutMs =
    typeof options.timeoutMs === "number" && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_TURNSTILE_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(options.apiUrl || DEFAULT_TURNSTILE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      signal: controller.signal,
    });

    const result: TurnstileVerifyResponse = await response.json();
    if (!response.ok && typeof result.success !== "boolean") {
      throw new Error(`Turnstile API error: ${response.status}`);
    }

    if (
      result.success &&
      options.expectedAction &&
      result.action !== options.expectedAction
    ) {
      return {
        ...result,
        success: false,
        "error-codes": ["action-mismatch"],
      };
    }

    if (
      result.success &&
      options.expectedHostname &&
      result.hostname !== options.expectedHostname
    ) {
      return {
        ...result,
        success: false,
        "error-codes": ["hostname-mismatch"],
      };
    }

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Turnstile verification timed out");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
