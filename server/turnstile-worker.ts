/**
 * Cloudflare Worker for Turnstile token verification
 * This worker provides a secure endpoint for verifying Turnstile tokens
 * Deploy this to Cloudflare Workers and use the URL for server-side verification
 */

interface TurnstileVerifyRequest {
  token: string;
  remoteip?: string;
  idempotencyKey?: string;
}

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

interface Environment {
  TURNSTILE_SECRET_KEY: string;
  ALLOWED_ORIGINS?: string; // Comma-separated list of allowed origins
}

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

      // Verify with Cloudflare Turnstile API
      const verifyResult = await verifyTurnstileToken(
        body.token,
        env.TURNSTILE_SECRET_KEY,
        remoteip,
        body.idempotencyKey,
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

/**
 * Verify Turnstile token with Cloudflare API
 */
async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  remoteip?: string | null,
  idempotencyKey?: string,
): Promise<TurnstileVerifyResponse> {
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
}

/**
 * Get allowed origin for CORS
 */
function getAllowedOrigin(request: Request, env: Environment): string {
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
