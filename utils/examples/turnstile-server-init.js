/**
 * Server-side Turnstile verification example.
 */

import { verifyTurnstileToken } from "../../server/index.js";

export const verifyTurnstile = async (req, res, next) => {
  try {
    const token = req.body["cf-turnstile-response"] || req.body.turnstileToken;

    if (!token) {
      return res.status(400).json({
        error: "Turnstile token is required",
        code: "MISSING_TURNSTILE_TOKEN",
      });
    }

    const result = await verifyTurnstileToken(token, {
      secretKey: process.env.TURNSTILE_SECRET_KEY,
      remoteip: req.ip,
      expectedAction: "contact-form",
    });

    if (!result.success) {
      return res.status(400).json({
        error: "Turnstile verification failed",
        code: "TURNSTILE_VERIFICATION_FAILED",
        details: result["error-codes"],
      });
    }

    req.turnstile = result;
    next();
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return res.status(500).json({
      error: "Internal server error during Turnstile verification",
      code: "TURNSTILE_INTERNAL_ERROR",
    });
  }
};
