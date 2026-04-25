# Deploying Turnstile Worker from Consuming Projects

**[🏠 Back to Main README](../README.md)**

When using `shared-utils` as a dependency in another project, there are several strategies for deploying the Turnstile Cloudflare Worker. This guide covers all the approaches depending on your needs.

## 📋 Table of Contents

- [Deploying Turnstile Worker from Consuming Projects](#deploying-turnstile-worker-from-consuming-projects)
  - [📋 Table of Contents](#-table-of-contents)
  - [📋 Deployment Strategies](#-deployment-strategies)
    - [Strategy 1: Reference Worker (Recommended)](#strategy-1-reference-worker-recommended)
      - [Setup Steps](#setup-steps)
    - [Strategy 2: Vendor the Worker (Advanced Customization)](#strategy-2-vendor-the-worker-advanced-customization)
      - [Setup Steps](#setup-steps-1)
    - [Strategy 3: Server-Side Integration Only](#strategy-3-server-side-integration-only)
      - [Setup Steps](#setup-steps-2)
  - [🔧 Package.json Scripts for Consuming Projects](#-packagejson-scripts-for-consuming-projects)
  - [🔒 Environment Configuration](#-environment-configuration)
    - [Required Secrets (Set via Wrangler CLI)](#required-secrets-set-via-wrangler-cli)
    - [Environment Variables in wrangler.toml](#environment-variables-in-wranglertoml)
  - [📁 Recommended Project Structure](#-recommended-project-structure)
  - [🚀 Quick Start Commands](#-quick-start-commands)
  - [💡 Best Practices](#-best-practices)
  - [🔄 Keeping Worker Updated](#-keeping-worker-updated)

## 📋 Deployment Strategies

### Strategy 1: Reference Worker (Recommended)

Create a minimal worker that imports shared-utils functionality. This approach requires no file copying and automatically stays up-to-date.

#### Setup Steps

1. **Install the dependency**: See [main installation guide](../README.md#installation) for complete instructions.

2. **Create minimal worker file**:

```typescript
// workers/turnstile-worker.ts
import { createTurnstileWorker } from "@user27828/shared-utils/server";

export default createTurnstileWorker({
  // Optional: customize behavior
  allowedOrigins: ["https://myapp.com", "https://www.myapp.com"],
  bypassLocalhost: true,
  // DEV_MODE / NODE_ENV can also be supplied via Wrangler env vars.
});
```

3. **Create wrangler.toml**:

```toml
# workers/turnstile/wrangler.toml
name = "my-app-turnstile-verifier"  # Your custom worker name
main = "../turnstile-worker.ts"
compatibility_date = "2024-12-01"

[vars]
NODE_ENV = "production"

# Set secrets via: wrangler secret put TURNSTILE_SECRET_KEY
```

4. **Deploy**:

```bash
cd workers/turnstile && wrangler deploy
```

---

### Strategy 2: Vendor the Worker (Advanced Customization)

Use this when configuration alone is not enough and you want to own the worker logic in your app.

[🔝 Back to Top](#deploying-turnstile-worker-from-consuming-projects)

#### Setup Steps

1. **Start with Strategy 1** and commit your own `workers/turnstile-worker.ts`.

2. **Copy from the repository, not from installed `node_modules`**, if you need the full reference implementation. The published root package ships compiled `dist/` output, not the workspace `server/` sources.

Reference files:

- [server/turnstile-worker.ts](../server/turnstile-worker.ts)
- [server/wrangler.toml](../server/wrangler.toml)

3. **Customize the vendored worker** for your application.

4. **Deploy**:

```bash
cd workers/turnstile && wrangler deploy
```

---

### Strategy 3: Server-Side Integration Only

If you only need verification in your existing server without deploying a separate worker.

[🔝 Back to Top](#deploying-turnstile-worker-from-consuming-projects)

#### Setup Steps

1. **Install dependency**: See [main installation guide](../README.md#installation) for complete instructions.

2. **Use in your server code**:

```typescript
// server.js
import { verifyTurnstileTokenEnhanced } from "@user27828/shared-utils/server";
import { optionsManager } from "@user27828/shared-utils/utils";

// Configure Turnstile options
optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    allowedOrigins: ["https://myapp.com"],
    devMode: process.env.NODE_ENV === "development",
    bypassLocalhost: true,
  },
});

// Use in your API endpoints
app.post("/api/verify-turnstile", async (req, res) => {
  try {
    const result = await verifyTurnstileTokenEnhanced(
      req.body.token,
      process.env.TURNSTILE_SECRET_KEY,
      req.ip,
    );

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, errors: result["error-codes"] });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});
```

---

## 🔧 Package.json Scripts for Consuming Projects

Add these scripts to your consuming project's `package.json`:

[🔝 Back to Top](#deploying-turnstile-worker-from-consuming-projects)

```json
{
  "scripts": {
    "cf:setup-turnstile": "mkdir -p workers/turnstile",
    "cf:deploy-turnstile": "cd workers/turnstile && wrangler deploy",
    "cf:deploy-turnstile:dev": "cd workers/turnstile && wrangler deploy --env development",
    "cf:deploy-turnstile:staging": "cd workers/turnstile && wrangler deploy --env staging",
    "cf:deploy-turnstile:production": "cd workers/turnstile && wrangler deploy --env production"
  }
}
```

Usage:

```bash
# Using yarn (recommended)
yarn cf:setup-turnstile                    # Create directory structure
yarn cf:deploy-turnstile:production        # Deploy to production

# Using npm (alternative)
npm run cf:setup-turnstile                 # Create directory structure
npm run cf:deploy-turnstile:production     # Deploy to production
```

---

## 🔒 Environment Configuration

### Required Secrets (Set via Wrangler CLI)

[🔝 Back to Top](#deploying-turnstile-worker-from-consuming-projects)

```bash
# Navigate to your worker directory
cd workers/turnstile

# Set Turnstile secret key
wrangler secret put TURNSTILE_SECRET_KEY

# Optional: Set allowed origins if not using wrangler.toml
wrangler secret put ALLOWED_ORIGINS
```

### Environment Variables in wrangler.toml

```toml
[vars]
ALLOWED_ORIGINS = "https://myapp.com,https://www.myapp.com"
NODE_ENV = "production"

[env.staging.vars]
ALLOWED_ORIGINS = "https://staging.myapp.com"
NODE_ENV = "staging"

[env.development.vars]
ALLOWED_ORIGINS = "*"
NODE_ENV = "development"
```

---

## 📁 Recommended Project Structure

[🔝 Back to Top](#deploying-turnstile-worker-from-consuming-projects)

```
my-consuming-project/
├── package.json
├── workers/
│   ├── turnstile-worker.ts          # Minimal reference worker
│   └── turnstile/
│       └── wrangler.toml            # Configuration only
└── node_modules/
    └── @user27828/shared-utils/     # Contains actual implementation
```

---

## 🚀 Quick Start Commands

[🔝 Back to Top](#deploying-turnstile-worker-from-consuming-projects)

```bash
# 1. Create worker file
# workers/turnstile-worker.ts with import from shared-utils

# 2. Create wrangler.toml in workers/turnstile/

# 3. Set secrets
cd workers/turnstile && wrangler secret put TURNSTILE_SECRET_KEY

# 4. Deploy
cd workers/turnstile && wrangler deploy
```

---

## 💡 Best Practices

[🔝 Back to Top](#deploying-turnstile-worker-from-consuming-projects)

1. **Use Reference Workers**: The minimal import approach keeps your worker automatically updated
2. **Custom Worker Names**: Always customize the worker name in wrangler.toml
3. **Environment-Specific Config**: Use wrangler environment configurations for dev/staging/prod
4. **Secret Management**: Never commit secrets to version control, use `wrangler secret put`
5. **Testing**: Test with `wrangler dev` before deploying to production
6. **Version Pinning**: Pin shared-utils version in package.json for production stability

---

## 🔄 Keeping Worker Updated

When the shared-utils dependency is updated:

[🔝 Back to Top](#deploying-turnstile-worker-from-consuming-projects)

```bash
# Update shared-utils package
yarn add @user27828/shared-utils@https://github.com/user27828/shared-utils.git#master

# Reference workers automatically use latest code - just redeploy
cd workers/turnstile && wrangler deploy

# For copied workers, re-run copy setup if needed
# yarn cf:setup-turnstile  # only if using Strategy 2
```

This approach prioritizes simplicity with the reference worker pattern while maintaining the flexibility to copy and customize when advanced modifications are needed.

---

[🔝 Back to Top](#deploying-turnstile-worker-from-consuming-projects) | **[🏠 Back to Main README](../README.md)**
