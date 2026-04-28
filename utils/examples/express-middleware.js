/**
 * Express.js middleware example using shared-utils logging and Turnstile server middleware.
 */

import { log, optionsManager } from "../index.js";
import { createTurnstileMiddleware } from "../../server/index.js";

const config = {
  turnstileSecretKey: "your-secret-key-here",
  logLevel: ["info", "warn", "error"],
};

log.setOptions({
  type: "server",
  server: {
    namespace: "ExpressAPI",
    production: config.logLevel,
  },
});

optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: config.turnstileSecretKey,
    expectedAction: "contact-form",
  },
});

export const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  log.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    query: req.query,
  });

  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    const level = res.statusCode >= 400 ? "warn" : "info";

    log[level](`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });

  next();
};

export const verifyTurnstile = createTurnstileMiddleware();

export const setupExpressApp = (app) => {
  app.use(requestLogger);

  app.post("/api/contact", verifyTurnstile, (req, res) => {
    log.info("Contact form submitted", {
      hostname: req.turnstile.hostname,
      ip: req.ip,
    });

    res.json({ success: true, message: "Message received" });
  });

  return app;
};

export default {
  requestLogger,
  verifyTurnstile,
  setupExpressApp,
};
