/**
 * Cloudflare Worker for Turnstile token verification
 * This worker provides a secure endpoint for verifying Turnstile tokens
 * Deploy this to Cloudflare Workers and use the URL for server-side verification
 */

import type {
  TurnstileVerifyRequest,
  Environment,
} from "./src/turnstile/index.js";
import {
  verifyTurnstileTokenEnhanced,
  getAllowedOrigin,
} from "./src/turnstile/index.js";

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: {
          "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
        },
      });
    }

    try {
      // Parse request body
      const body: TurnstileVerifyRequest = await request.json();

      if (!body.token) {
        return new Response(
          JSON.stringify({
            success: false,
            "error-codes": ["missing-input-response"],
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
            },
          },
        );
      }

      // Get client IP if not provided
      const remoteip =
        body.remoteip ||
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For") ||
        request.headers.get("X-Real-IP");

      // Verify with enhanced verification (includes dev mode and localhost bypass)
      const verifyResult = await verifyTurnstileTokenEnhanced(
        body.token,
        env.TURNSTILE_SECRET_KEY,
        remoteip,
        body.idempotencyKey,
        {
          secretKey: env.TURNSTILE_SECRET_KEY,
          devMode: env.DEV_MODE === "true" || env.NODE_ENV === "development",
          bypassLocalhost: true,
          allowedOrigins: env.ALLOWED_ORIGINS
            ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
            : ["*"],
          apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          interceptor: undefined,
        },
        request,
      );

      return new Response(JSON.stringify(verifyResult), {
        status: verifyResult.success ? 200 : 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
        },
      });
    } catch (error) {
      console.error("Turnstile verification error:", error);

      return new Response(
        JSON.stringify({
          success: false,
          "error-codes": ["internal-error"],
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
          },
        },
      );
    }
  },
};

// Re-export main functionality for Node.js usage
export * from "./src/turnstile/index.js";
