/**
 * Node.js example using the strict Turnstile verifier APIs.
 */

import express from "express";
import { optionsManager } from "../../utils/index.js";
import {
  createTurnstileMiddleware,
  verifyTurnstileToken,
  getTurnstileServerOptions,
} from "../index.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const CONFIG = {
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || "your-secret-key",
  port: process.env.PORT || 3000,
};

optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: CONFIG.turnstileSecretKey,
    expectedHostname: "example.com",
    allowedOrigins: ["https://example.com"],
  },
});

const turnstileMiddleware = createTurnstileMiddleware({
  expectedAction: "contact-form",
});

const strictTurnstileMiddleware = createTurnstileMiddleware({
  expectedAction: "admin-sensitive",
  expectedHostname: "example.com",
});

app.post("/api/contact", turnstileMiddleware, async (req, res) => {
  const { name, email, message } = req.body;

  res.json({
    success: true,
    message: "Contact form submitted successfully",
    verifiedBy: req.turnstile.hostname,
    name,
    email,
    hasMessage: Boolean(message),
  });
});

app.post(
  "/api/admin/sensitive",
  strictTurnstileMiddleware,
  async (req, res) => {
    res.json({
      success: true,
      message: "Sensitive operation completed",
      timestamp: req.turnstile.challenge_ts,
    });
  },
);

app.post("/api/custom-verify", async (req, res) => {
  try {
    const { token, userType } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Turnstile token required" });
    }

    const result = await verifyTurnstileToken(token, {
      secretKey: CONFIG.turnstileSecretKey,
      remoteip: req.ip,
      expectedAction: "custom-verify",
      expectedHostname: "example.com",
    });

    if (!result.success) {
      return res.status(400).json({
        error: "Verification failed",
        details: result["error-codes"],
      });
    }

    res.json({
      success: true,
      userType,
      verificationData: result,
    });
  } catch (error) {
    console.error("Custom verification error:", error);
    res.status(500).json({ error: "Verification error" });
  }
});

app.get("/health", (req, res) => {
  const options = getTurnstileServerOptions();
  res.json({
    status: "healthy",
    turnstile: {
      configured: !!options.secretKey,
      expectedHostname: options.expectedHostname,
      allowedOrigins: options.allowedOrigins,
    },
    environment: process.env.NODE_ENV || "development",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
  });
});

app.listen(CONFIG.port, () => {
  console.log(`Server running on port ${CONFIG.port}`);
});

export default app;
