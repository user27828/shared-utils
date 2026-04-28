/**
 * Complete server-side initialization example
 * Includes logging and Turnstile server verification configuration
 */
import { log, optionsManager } from "@shared-utils/utils";

// Configuration values would be injected by your application
const CONFIG = {
  turnstileSecretKey: "your-secret-key-here", // Injected from your app's env vars
  turnstileWorkerUrl: "https://your-worker.domain.workers.dev/", // Optional
  expectedAction: "contact-form",
  expectedHostname: "example.com",
};

optionsManager.setGlobalOptions({
  log: {
    type: "server",
    server: {
      namespace: "API",
      production: ["info", "warn", "error"],
    },
  },
  "turnstile-server": {
    secretKey: CONFIG.turnstileSecretKey, // ✅ Injected configuration
    apiUrl: CONFIG.turnstileWorkerUrl || undefined,
    expectedAction: CONFIG.expectedAction,
    expectedHostname: CONFIG.expectedHostname,
  },
});

// Make log globally available (optional but recommended for server)
global.log = log;

// Initialize server
log.info("Server application initialized");
log.info("Environment:", process.env.NODE_ENV);
log.info("Turnstile server verification configured");

export { log, optionsManager };
