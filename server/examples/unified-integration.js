/**
 * Integration example showing how the Turnstile worker integrates with the existing utils package
 * This demonstrates unified configuration and compatibility between client and server utilities
 */

import { log, turnstile, optionsManager } from "../../utils/index.js";
import { createTurnstileMiddleware, verifyTurnstileSimple } from "../index.js";
import express from "express";

const app = express();
app.use(express.json());

// UNIFIED CONFIGURATION APPROACH
// Configure both utilities through the central optionsManager
optionsManager.setGlobalOptions({
  log: {
    type: "server",
    server: {
      namespace: "TurnstileAPI",
      production:
        process.env.NODE_ENV === "production"
          ? ["warn", "error"]
          : ["log", "info", "warn", "error"],
    },
  },
  // Configure server-side Turnstile verification (unified approach)
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    devMode: process.env.NODE_ENV === "development",
    bypassLocalhost: true,
    interceptor: (action, data) => {
      // Use the log utility for consistent logging
      if (action === "verify-start") {
        log.info("Turnstile verification started", {
          hasToken: !!data.token,
          remoteip: data.remoteip,
          devMode: data.devMode,
          isLocalhost: data.isLocalhost,
        });
      }

      if (action === "verify-complete") {
        log.info("Turnstile verification completed", {
          success: data.result.success,
          hostname: data.result.hostname,
          errors: data.result["error-codes"],
        });
      }

      if (action === "verify-dev-mode") {
        log.info("Turnstile dev mode bypass", { reason: data.bypassReason });
      }

      if (action === "verify-localhost-bypass") {
        log.info("Turnstile localhost bypass", { reason: data.bypassReason });
      }
    },
  },
});

// Create middleware using server-side Turnstile
const turnstileMiddleware = createTurnstileMiddleware();

// Example: Contact form with unified logging and verification
app.post("/api/contact", turnstileMiddleware, async (req, res) => {
  const { name, email, message } = req.body;

  try {
    // Log using the unified log utility
    log.info("Contact form submission", {
      name,
      email,
      verified: true,
      turnstileHostname: req.turnstile.hostname,
      ip: req.ip,
    });

    // Your business logic here
    await processContactForm({ name, email, message });

    log.info("Contact form processed successfully", { name, email });

    res.json({
      success: true,
      message: "Contact form submitted successfully",
    });
  } catch (error) {
    log.error("Contact form processing error", {
      error: error.message,
      name,
      email,
    });

    res.status(500).json({
      error: "Failed to process contact form",
    });
  }
});

// Example: API with manual verification (for custom logic)
app.post("/api/newsletter", async (req, res) => {
  const { email, token } = req.body;

  try {
    log.info("Newsletter subscription attempt", { email });

    // Manual verification using simple function
    const verificationResult = await verifyTurnstileSimple(
      token,
      process.env.TURNSTILE_SECRET_KEY,
      req.ip,
    );

    if (!verificationResult.success) {
      log.warn("Newsletter subscription failed verification", {
        email,
        errors: verificationResult["error-codes"],
      });

      return res.status(400).json({
        error: "Security verification failed",
        details: verificationResult["error-codes"],
      });
    }

    // Process subscription
    await subscribeToNewsletter(email);

    log.info("Newsletter subscription successful", {
      email,
      verified: true,
      hostname: verificationResult.hostname,
    });

    res.json({
      success: true,
      message: "Successfully subscribed to newsletter",
    });
  } catch (error) {
    log.error("Newsletter subscription error", {
      error: error.message,
      email,
    });

    res.status(500).json({
      error: "Failed to process newsletter subscription",
    });
  }
});

// Health check showing both utilities
app.get("/health", (req, res) => {
  const logOptions = log.getOptions();

  res.json({
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    utilities: {
      log: {
        type: logOptions.type,
        namespace: logOptions.server?.namespace,
        productionLevels: logOptions.server?.production,
      },
      turnstile: {
        configured: !!process.env.TURNSTILE_SECRET_KEY,
        serverSide: true,
        devMode: process.env.NODE_ENV === "development",
      },
    },
  });
});

// Error handling with unified logging
app.use((error, req, res, next) => {
  log.error("Unhandled server error", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(500).json({
    error: "Internal server error",
  });
});

// Dummy business logic functions
async function processContactForm({ name, email, message }) {
  // Simulate async processing
  return new Promise((resolve) => setTimeout(resolve, 100));
}

async function subscribeToNewsletter(email) {
  // Simulate async newsletter subscription
  return new Promise((resolve) => setTimeout(resolve, 100));
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log.info("Server started", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    turnstileConfigured: !!process.env.TURNSTILE_SECRET_KEY,
  });

  console.log(`🚀 Unified server running on port ${PORT}`);
  console.log(`📝 Endpoints:`);
  console.log(
    `   POST /api/contact - Contact form with middleware verification`,
  );
  console.log(`   POST /api/newsletter - Newsletter with manual verification`);
  console.log(`   GET  /health - Health check`);
});

export default app;
