/**
 * Example showing shared logging plus strict Turnstile verification.
 */

import express from "express";
import { log, optionsManager } from "../../utils/index.js";
import { createTurnstileMiddleware, verifyTurnstileToken } from "../index.js";

const app = express();
app.use(express.json());

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
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    expectedAction: "contact-form",
    expectedHostname: "example.com",
  },
});

const turnstileMiddleware = createTurnstileMiddleware();

app.post("/api/contact", turnstileMiddleware, async (req, res) => {
  const { name, email, message } = req.body;

  log.info("Contact form submission", {
    name,
    email,
    hostname: req.turnstile.hostname,
    ip: req.ip,
  });

  await processContactForm({ name, email, message });

  res.json({
    success: true,
    hostname: req.turnstile.hostname,
  });
});

app.post("/api/newsletter", async (req, res) => {
  const { email, token } = req.body;

  const verificationResult = await verifyTurnstileToken(token, {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    remoteip: req.ip,
    expectedAction: "newsletter-signup",
    expectedHostname: "example.com",
  });

  if (!verificationResult.success) {
    log.warn("Newsletter verification failed", {
      email,
      errors: verificationResult["error-codes"],
    });

    return res.status(400).json({
      error: "Security verification failed",
      details: verificationResult["error-codes"],
    });
  }

  await subscribeToNewsletter(email);
  res.json({ success: true });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    turnstileConfigured: !!process.env.TURNSTILE_SECRET_KEY,
  });
});

app.use((error, req, res, next) => {
  log.error("Unhandled server error", {
    error: error.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(500).json({ error: "Internal server error" });
});

async function processContactForm({ name, email, message }) {
  return { name, email, message };
}

async function subscribeToNewsletter(email) {
  return { email };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log.info("Server started", {
    port: PORT,
    turnstileConfigured: !!process.env.TURNSTILE_SECRET_KEY,
  });
});

export default app;
