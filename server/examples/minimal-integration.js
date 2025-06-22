/**
 * Minimal Turnstile integration example
 * Shows the simplest way to add Turnstile verification to any Node.js server
 * Uses the unified optionsManager for configuration
 */

import { optionsManager } from "../../utils/index.js";
import { createTurnstileMiddleware } from "../turnstile-worker.js";
import express from "express";

const app = express();
app.use(express.json());

// 1. Configure Turnstile using the unified optionsManager (recommended)
optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    devMode: process.env.NODE_ENV === "development", // Auto-pass in dev mode
    bypassLocalhost: true, // Allow localhost requests
  },
});

// 2. Create middleware (automatically uses global configuration)
const verifyTurnstile = createTurnstileMiddleware();

// 3. Use on any route that needs protection
app.post("/api/form", verifyTurnstile, (req, res) => {
  // req.turnstile contains verification data
  console.log("Verified request from:", req.turnstile.hostname);

  res.json({
    success: true,
    message: "Form processed successfully",
  });
});

// 4. Start server
app.listen(3000, () => {
  console.log("🚀 Server with Turnstile protection running on port 3000");
  console.log("💡 In development mode, verification is automatically bypassed");
  console.log("🔧 Configured using unified optionsManager");
});

export default app;
