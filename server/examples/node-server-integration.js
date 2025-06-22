/**
 * Complete Node.js server integration example using the enhanced Turnstile worker
 * This example shows how to use the modular Turnstile system in various server implementations
 */

import express from "express";
import { optionsManager } from "../../utils/index.js";
import {
  createTurnstileMiddleware,
  verifyTurnstileSimple,
  verifyTurnstileTokenEnhanced,
  getTurnstileServerOptions,
} from "../index.js";

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration (in real app, use environment variables)
const CONFIG = {
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || "your-secret-key",
  port: process.env.PORT || 3000,
  isDevelopment: process.env.NODE_ENV === "development",
};

// OPTION 1: Configure Turnstile options globally using optionsManager (recommended)
optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: CONFIG.turnstileSecretKey,
    devMode: CONFIG.isDevelopment,
    bypassLocalhost: true, // Allow localhost requests in development
    allowedOrigins: CONFIG.isDevelopment ? ["*"] : ["https://yourapp.com"],
    interceptor: (action, data) => {
      console.log(`[Turnstile] ${action}:`, data);

      // Log successful verifications
      if (action === "verify-complete") {
        console.log(`✅ Verification successful for ${data.result.hostname}`);
      }

      // Log dev mode bypasses
      if (action === "verify-dev-mode") {
        console.log(`🔧 Dev mode bypass activated`);
      }

      // Log localhost bypasses
      if (action === "verify-localhost-bypass") {
        console.log(`🏠 Localhost bypass activated`);
      }
    },
  },
});

// OPTION 2: Use the middleware factory (recommended for most cases)
const turnstileMiddleware = createTurnstileMiddleware();

// OPTION 3: Create custom middleware with specific options
const strictTurnstileMiddleware = createTurnstileMiddleware({
  devMode: false, // Force production verification even in dev
  bypassLocalhost: false, // Never bypass localhost
});

// Routes using different verification approaches

// Basic protected route using middleware
app.post("/api/contact", turnstileMiddleware, async (req, res) => {
  const { name, email, message } = req.body;

  console.log("Processing contact form from verified user:", {
    name,
    email,
    turnstileData: req.turnstile,
    ip: req.ip,
  });

  // Your business logic here
  res.json({
    success: true,
    message: "Contact form submitted successfully",
    verifiedBy: req.turnstile.hostname,
  });
});

// Strict verification for sensitive operations
app.post(
  "/api/admin/sensitive",
  strictTurnstileMiddleware,
  async (req, res) => {
    const { action } = req.body;

    console.log("Sensitive operation requested:", {
      action,
      turnstileData: req.turnstile,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Sensitive operation completed",
      timestamp: req.turnstile.challenge_ts,
    });
  },
);

// Custom verification with business logic
app.post("/api/custom-verify", async (req, res) => {
  try {
    const { token, userType } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Turnstile token required" });
    }

    // Option A: Simple verification
    const result = await verifyTurnstileSimple(
      token,
      CONFIG.turnstileSecretKey,
      req.ip,
    );

    if (!result.success) {
      return res.status(400).json({
        error: "Verification failed",
        details: result["error-codes"],
      });
    }

    // Custom business logic based on user type
    if (userType === "premium") {
      console.log("Premium user verified:", result.hostname);
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

// Advanced verification with full control
app.post("/api/advanced-verify", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Turnstile token required" });
    }

    // Mock request object for localhost detection
    const mockRequest = {
      headers: {
        get: (name) => req.headers[name.toLowerCase()],
      },
    };

    // Option B: Enhanced verification with full options
    const result = await verifyTurnstileTokenEnhanced(
      token,
      CONFIG.turnstileSecretKey,
      req.ip,
      undefined, // idempotencyKey
      {
        secretKey: CONFIG.turnstileSecretKey,
        devMode: CONFIG.isDevelopment,
        bypassLocalhost: true,
        interceptor: (action, data) => {
          console.log(`[Advanced] ${action}:`, data);
        },
      },
      mockRequest,
    );

    if (!result.success) {
      return res.status(400).json({
        error: "Advanced verification failed",
        details: result["error-codes"],
      });
    }

    res.json({
      success: true,
      advanced: true,
      verificationData: result,
    });
  } catch (error) {
    console.error("Advanced verification error:", error);
    res.status(500).json({ error: "Advanced verification error" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  const options = getTurnstileServerOptions();
  res.json({
    status: "healthy",
    turnstile: {
      configured: !!options.secretKey,
      devMode: options.devMode,
      bypassLocalhost: options.bypassLocalhost,
      allowedOrigins: options.allowedOrigins,
    },
    environment: process.env.NODE_ENV || "development",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    ...(CONFIG.isDevelopment && { details: error.message }),
  });
});

// Start server
app.listen(CONFIG.port, () => {
  console.log(`🚀 Server running on port ${CONFIG.port}`);
  console.log(
    `🛡️  Turnstile verification ${CONFIG.isDevelopment ? "DEV" : "PROD"} mode`,
  );
  console.log(`📝 Test endpoints:`);
  console.log(`   POST /api/contact - Basic verification`);
  console.log(`   POST /api/admin/sensitive - Strict verification`);
  console.log(`   POST /api/custom-verify - Custom verification`);
  console.log(`   POST /api/advanced-verify - Advanced verification`);
  console.log(`   GET  /health - Health check`);
});

export default app;
