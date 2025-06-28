# Example: Deploying Turnstile Worker in Your Project

**[🏠 Back to Main README](../README.md)**

This is a practical example of how to use the shared-utils Turnstile worker in your own project.

## 📋 Table of Contents

- [Example: Deploying Turnstile Worker in Your Project](#example-deploying-turnstile-worker-in-your-project)
  - [📋 Table of Contents](#-table-of-contents)
  - [Project Structure](#project-structure)
  - [Step-by-Step Setup](#step-by-step-setup)
    - [1. Install Dependencies](#1-install-dependencies)
    - [2. Set Up the Worker](#2-set-up-the-worker)
    - [3. Configure Worker](#3-configure-worker)
    - [4. Set Secrets](#4-set-secrets)
    - [5. Deploy](#5-deploy)
  - [Package.json Scripts](#packagejson-scripts)
  - [Using Verification in Your Server](#using-verification-in-your-server)
    - [Option 1: Use Your Deployed Worker](#option-1-use-your-deployed-worker)
    - [Option 2: Use Verification Functions Directly](#option-2-use-verification-functions-directly)
  - [Environment Variables](#environment-variables)
  - [Frontend Integration](#frontend-integration)
  - [Complete Workflow](#complete-workflow)

## Project Structure

```
my-app/
├── package.json
├── scripts/
├── workers/
│   └── turnstile/          # Created by setup script
└── src/
    └── server.js
```

## Step-by-Step Setup

### 1. Install Dependencies

See [main installation guide](../README.md#installation) for complete instructions.

### 2. Set Up the Worker

Create a minimal worker file that references shared-utils:

```typescript
// workers/turnstile-worker.ts
import { createTurnstileWorker } from "@user27828/shared-utils/server";

export default createTurnstileWorker({
  allowedOrigins: ["https://myapp.com", "https://www.myapp.com"],
  devMode: process.env.NODE_ENV === "development",
  bypassLocalhost: true,
});
```

### 3. Configure Worker

Create `workers/turnstile/wrangler.toml`:

```toml
name = "myapp-turnstile"
main = "../turnstile-worker.ts"
compatibility_date = "2024-12-01"

[vars]
NODE_ENV = "production"

[env.staging.vars]
NODE_ENV = "staging"

[env.development.vars]
NODE_ENV = "development"
```

### 4. Set Secrets

```bash
cd workers/turnstile
wrangler secret put TURNSTILE_SECRET_KEY
# Enter your secret key when prompted
```

### 5. Deploy

```bash
# Deploy to production
cd workers/turnstile && wrangler deploy

# Or deploy to specific environment
cd workers/turnstile && wrangler deploy --env production
```

## Package.json Scripts

Add these to your `package.json`:

[🔝 Back to Top](#example-deploying-turnstile-worker-in-your-project)

```json
{
  "name": "my-app",
  "scripts": {
    "dev": "node src/server.js",
    "build": "echo 'Build steps here'",

    "cf:setup-turnstile": "mkdir -p workers/turnstile",
    "cf:deploy-turnstile": "cd workers/turnstile && wrangler deploy",
    "cf:deploy-turnstile:dev": "cd workers/turnstile && wrangler deploy --env development",
    "cf:deploy-turnstile:staging": "cd workers/turnstile && wrangler deploy --env staging",
    "cf:deploy-turnstile:production": "cd workers/turnstile && wrangler deploy --env production"
  },
  "dependencies": {
    "@user27828/shared-utils": "https://github.com/user27828/shared-utils.git#master"
  }
}
```

## Using Verification in Your Server

### Option 1: Use Your Deployed Worker

[🔝 Back to Top](#example-deploying-turnstile-worker-in-your-project)

```javascript
// src/server.js
import express from "express";

const app = express();
app.use(express.json());

// Your deployed worker URL
const TURNSTILE_WORKER_URL =
  "https://myapp-turnstile.your-subdomain.workers.dev";

app.post("/api/contact", async (req, res) => {
  const { turnstileToken, ...formData } = req.body;

  try {
    // Verify with your deployed worker
    const verifyResponse = await fetch(TURNSTILE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: turnstileToken,
        remoteip: req.ip,
      }),
    });

    const verification = await verifyResponse.json();

    if (!verification.success) {
      return res.status(400).json({
        error: "Turnstile verification failed",
        codes: verification["error-codes"],
      });
    }

    // Process your form data
    console.log("Form submitted:", formData);
    res.json({ success: true, message: "Form submitted successfully" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

### Option 2: Use Verification Functions Directly

[🔝 Back to Top](#example-deploying-turnstile-worker-in-your-project)

```javascript
// src/server.js
import express from "express";
import { verifyTurnstileTokenEnhanced } from "@user27828/shared-utils/server";
import { optionsManager } from "@user27828/shared-utils/utils";

const app = express();
app.use(express.json());

// Configure Turnstile options
optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    allowedOrigins: ["https://myapp.com", "https://www.myapp.com"],
    devMode: process.env.NODE_ENV === "development",
    bypassLocalhost: true,
  },
});

app.post("/api/contact", async (req, res) => {
  const { turnstileToken, ...formData } = req.body;

  try {
    // Verify directly using shared-utils
    const verification = await verifyTurnstileTokenEnhanced(
      turnstileToken,
      process.env.TURNSTILE_SECRET_KEY,
      req.ip,
    );

    if (!verification.success) {
      return res.status(400).json({
        error: "Turnstile verification failed",
        codes: verification["error-codes"],
      });
    }

    // Process your form data
    console.log("Form submitted:", formData);
    res.json({ success: true, message: "Form submitted successfully" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});
```

## Environment Variables

Create a `.env` file:

[🔝 Back to Top](#example-deploying-turnstile-worker-in-your-project)

```bash
# .env
TURNSTILE_SECRET_KEY=your_secret_key_here
NODE_ENV=development

# If using direct verification (Option 2)
TURNSTILE_WORKER_URL=https://myapp-turnstile.your-subdomain.workers.dev
```

## Frontend Integration

[🔝 Back to Top](#example-deploying-turnstile-worker-in-your-project)

```html
<!-- Your HTML page -->
<!DOCTYPE html>
<html>
  <head>
    <script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js"
      async
      defer
    ></script>
  </head>
  <body>
    <form id="contact-form">
      <input type="text" name="name" required />
      <input type="email" name="email" required />
      <textarea name="message" required></textarea>

      <!-- Turnstile widget -->
      <div
        class="cf-turnstile"
        data-sitekey="your_site_key"
        data-callback="onTurnstileSuccess"
      ></div>

      <button type="submit">Submit</button>
    </form>

    <script>
      let turnstileToken = null;

      function onTurnstileSuccess(token) {
        turnstileToken = token;
      }

      document
        .getElementById("contact-form")
        .addEventListener("submit", async (e) => {
          e.preventDefault();

          if (!turnstileToken) {
            alert("Please complete the verification");
            return;
          }

          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData);
          data.turnstileToken = turnstileToken;

          try {
            const response = await fetch("/api/contact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
              alert("Form submitted successfully!");
              e.target.reset();
              turnstile.reset(); // Reset the widget
              turnstileToken = null;
            } else {
              alert("Error: " + result.error);
            }
          } catch (error) {
            alert("Submission failed");
          }
        });
    </script>
  </body>
</html>
```

## Complete Workflow

[🔝 Back to Top](#example-deploying-turnstile-worker-in-your-project)

```bash
# 1. Create minimal worker file (workers/turnstile-worker.ts)

# 2. Create wrangler.toml in workers/turnstile/

# 3. Set secrets
cd workers/turnstile && wrangler secret put TURNSTILE_SECRET_KEY

# 4. Deploy
cd workers/turnstile && wrangler deploy

# 5. Test integration
yarn dev  # or npm dev
```

This example demonstrates the simplified reference-based approach for Turnstile worker deployment.

---

[🔝 Back to Top](#example-deploying-turnstile-worker-in-your-project) | **[🏠 Back to Main README](../README.md)**
