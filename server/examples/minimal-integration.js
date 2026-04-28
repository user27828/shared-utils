/**
 * Minimal Turnstile integration example.
 */

import express from "express";
import { optionsManager } from "../../utils/index.js";
import { createTurnstileMiddleware } from "../index.js";

const app = express();
app.use(express.json());

optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    expectedAction: "contact-form",
  },
});

const verifyTurnstile = createTurnstileMiddleware();

app.post("/api/form", verifyTurnstile, (req, res) => {
  res.json({
    success: true,
    hostname: req.turnstile.hostname,
  });
});

app.listen(3000, () => {
  console.log("Server with Turnstile protection running on port 3000");
});

export default app;
