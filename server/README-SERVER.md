# Server-Side Turnstile Integration

**[🏠 Back to Main README](../README.md)**

This enhanced Turnstile worker provides a modular and flexible way to integrate Cloudflare Turnstile verification into any Node.js server application, with full development mode support and localhost bypass capabilities.

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Usage Patterns](#usage-patterns)
- [Development Mode](#development-mode)
- [Framework Integration Examples](#framework-integration-examples)
- [Integration with Existing Utils](#integration-with-existing-utils)
- [Cloudflare Worker Deployment](#cloudflare-worker-deployment)

## Features

- ✅ **Universal Compatibility**: Works with Express.js, Fastify, Koa, and any Node.js HTTP framework
- ✅ **Development Mode**: Automatic bypass for development environments
- ✅ **Localhost Detection**: Smart localhost bypass for local development
- ✅ **Options Manager Integration**: Unified configuration with existing shared-utils
- ✅ **Flexible Verification**: Multiple verification approaches for different use cases
- ✅ **Cloudflare Worker Ready**: Can be deployed as a Cloudflare Worker
- ✅ **TypeScript Support**: Full type safety and IntelliSense
- ✅ **Error Handling**: Comprehensive error handling with detailed error codes
- ✅ **Interceptors**: Custom event handling for logging and analytics

## Quick Start

### 1. Install and Import

```javascript
import { optionsManager } from "@shared-utils/utils";
import { createTurnstileMiddleware } from "@shared-utils/server/turnstile-worker";
```

### 2. Basic Setup (Express.js)

```javascript
import express from "express";
import { optionsManager } from "@shared-utils/utils";
import { createTurnstileMiddleware } from "@shared-utils/server/turnstile-worker";

const app = express();
app.use(express.json());

// Configure Turnstile using unified optionsManager (recommended)
optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    devMode: process.env.NODE_ENV === "development", // Auto-bypass in dev
    bypassLocalhost: true, // Allow localhost requests
  },
});

// Create middleware (automatically uses global configuration)
const verifyTurnstile = createTurnstileMiddleware();

// Use on protected routes
app.post("/api/contact", verifyTurnstile, (req, res) => {
  // req.turnstile contains verification data
  console.log("Verified request from:", req.turnstile.hostname);
  res.json({ success: true });
});

app.listen(3000);
```

## Configuration Options

### Unified Configuration (Recommended)

Configure server-side Turnstile using the global optionsManager for consistency with other shared-utils:

[🔝 Back to Top](#server-side-turnstile-integration)

```javascript
import { optionsManager } from "@shared-utils/utils";

optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: "your-secret-key", // Required: Your Turnstile secret key
    devMode: false, // Optional: Enable dev mode bypass
    bypassLocalhost: true, // Optional: Bypass verification for localhost
    allowedOrigins: ["https://yourapp.com"], // Optional: CORS origins for worker
    apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify", // Optional: Custom API URL
    interceptor: (action, data) => {
      // Optional: Event interceptor
      console.log(`Turnstile ${action}:`, data);
    },
  },
});
```

### Environment Variables

```bash
TURNSTILE_SECRET_KEY=your-secret-key-here
NODE_ENV=development                    # Enables dev mode automatically
DEV_MODE=true                          # Force dev mode regardless of NODE_ENV
```

## Usage Patterns

### 1. Middleware Pattern (Recommended)

[🔝 Back to Top](#server-side-turnstile-integration)

```javascript
const turnstileMiddleware = createTurnstileMiddleware();

app.post("/api/form", turnstileMiddleware, (req, res) => {
  // Verification automatically handled
  // req.turnstile contains verification result
  res.json({ success: true, verified: req.turnstile.hostname });
});
```

### 2. Simple Verification Pattern

```javascript
app.post("/api/custom", async (req, res) => {
  try {
    const result = await verifyTurnstileSimple(
      req.body.token,
      process.env.TURNSTILE_SECRET_KEY,
      req.ip,
    );

    if (!result.success) {
      return res.status(400).json({ error: "Verification failed" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Verification error" });
  }
});
```

### 3. Advanced Verification Pattern

```javascript
import { verifyTurnstileTokenEnhanced } from "@shared-utils/server/turnstile-worker";

app.post("/api/advanced", async (req, res) => {
  const mockRequest = {
    headers: { get: (name) => req.headers[name.toLowerCase()] },
  };

  const result = await verifyTurnstileTokenEnhanced(
    req.body.token,
    process.env.TURNSTILE_SECRET_KEY,
    req.ip,
    undefined, // idempotencyKey
    {
      devMode: false, // Force production verification
      bypassLocalhost: false,
      interceptor: (action, data) => console.log(action, data),
    },
    mockRequest,
  );

  res.json({ success: result.success });
});
```

## Development Mode

The enhanced Turnstile worker includes smart development mode features:

[🔝 Back to Top](#server-side-turnstile-integration)

### Automatic Dev Mode Detection

Dev mode is automatically enabled when:

- `NODE_ENV=development`
- `DEV_MODE=true` environment variable
- `devMode: true` in configuration

### Dev Mode Behavior

```javascript
// In development mode - configure using optionsManager:
optionsManager.setGlobalOptions({
  'turnstile-server': {
    devMode: true, // Automatically returns successful verification
    bypassLocalhost: true // Additional localhost bypass
  }
});

// All verifications will return:
{
  success: true,
  challenge_ts: "2024-01-01T00:00:00.000Z",
  hostname: "localhost",
  action: "dev-mode",
  cdata: "dev-bypass"
}
```

### Localhost Detection

The system automatically detects localhost requests by checking:

- Origin header (`localhost`, `127.0.0.1`, `*.local`)
- Referer header (same patterns)
- Remote IP (local network ranges)

## Framework Integration Examples

### Express.js

[🔝 Back to Top](#server-side-turnstile-integration)

```javascript
import express from "express";
import { createTurnstileMiddleware } from "@shared-utils/server/turnstile-worker";

const app = express();
const verifyTurnstile = createTurnstileMiddleware({
  secretKey: process.env.TURNSTILE_SECRET_KEY,
});

app.post("/protected", verifyTurnstile, (req, res) => {
  res.json({ verified: true, data: req.turnstile });
});
```

### Fastify

```javascript
import Fastify from "fastify";
import { verifyTurnstileSimple } from "@shared-utils/server/turnstile-worker";

const fastify = Fastify();

fastify.addHook("preHandler", async (request, reply) => {
  if (request.body?.token) {
    try {
      const result = await verifyTurnstileSimple(request.body.token);
      if (!result.success) {
        reply.code(400).send({ error: "Verification failed" });
        return;
      }
      request.turnstile = result;
    } catch (error) {
      reply.code(500).send({ error: "Verification error" });
      return;
    }
  }
});
```

### Koa.js

```javascript
import Koa from "koa";
import { verifyTurnstileSimple } from "@shared-utils/server/turnstile-worker";

const app = new Koa();

app.use(async (ctx, next) => {
  if (ctx.request.body?.token) {
    try {
      const result = await verifyTurnstileSimple(ctx.request.body.token);
      if (!result.success) {
        ctx.status = 400;
        ctx.body = { error: "Verification failed" };
        return;
      }
      ctx.turnstile = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: "Verification error" };
      return;
    }
  }
  await next();
});
```

## Integration with Existing Utils

[🔝 Back to Top](#server-side-turnstile-integration)

The server-side Turnstile worker integrates seamlessly with the existing shared-utils package:

```javascript
import { log, optionsManager } from "@shared-utils/utils";
import { createTurnstileMiddleware } from "@shared-utils/server";

// Unified configuration approach
optionsManager.setGlobalOptions({
  log: {
    type: "server",
    server: { namespace: "API" },
  },
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    interceptor: (action, data) => {
      // Use unified logging
      log.info(`Turnstile ${action}`, data);
    },
  },
});

const verifyTurnstile = createTurnstileMiddleware();

app.post("/api/form", verifyTurnstile, (req, res) => {
  log.info("Form submitted", {
    verified: true,
    hostname: req.turnstile.hostname,
  });
  res.json({ success: true });
});
```

## Cloudflare Worker Deployment

[🔝 Back to Top](#server-side-turnstile-integration)

The same code can be deployed as a Cloudflare Worker:

```javascript
// wrangler.toml
name = "turnstile-worker";
main = "turnstile-worker.ts";
compatibility_date = "2024-01-01"[vars];
DEV_MODE = "false";
ALLOWED_ORIGINS = "https://yourapp.com,https://staging.yourapp.com"[secrets];
TURNSTILE_SECRET_KEY = "your-secret-key";
```

Deploy with:

```bash
wrangler deploy
```

## Error Handling

### Middleware Error Responses

```javascript
{
  "error": "Turnstile token is required",
  "code": "MISSING_TURNSTILE_TOKEN"
}

{
  "error": "Turnstile verification failed",
  "code": "TURNSTILE_VERIFICATION_FAILED",
  "details": ["invalid-input-response"]
}

{
  "error": "Internal server error during Turnstile verification",
  "code": "TURNSTILE_INTERNAL_ERROR"
}
```

### Custom Error Handling

```javascript
const verifyTurnstile = createTurnstileMiddleware();

app.post("/api/form", verifyTurnstile, (req, res) => {
  // Success - verification passed
  res.json({ success: true });
});

app.use((error, req, res, next) => {
  if (error.code === "TURNSTILE_VERIFICATION_FAILED") {
    // Handle Turnstile-specific errors
    log.warn("Turnstile verification failed", { ip: req.ip });
  }
  res.status(500).json({ error: "Server error" });
});
```

## API Reference

### Functions

- `getTurnstileServerOptions()` - Get current Turnstile options (configured via optionsManager)
- `createTurnstileMiddleware(options?)` - Create Express-compatible middleware
- `verifyTurnstileSimple(token, secretKey?, remoteip?, options?)` - Simple verification
- `verifyTurnstileTokenEnhanced(token, secretKey, remoteip?, idempotencyKey?, options?, request?)` - Advanced verification

### Configuration

Use the unified optionsManager for configuration:

```javascript
import { optionsManager } from "@shared-utils/utils";

optionsManager.setGlobalOptions({
  "turnstile-server": {
    secretKey: "your-secret-key",
    devMode: false,
    bypassLocalhost: true,
    // ... other options
  },
});
```

### Types

```typescript
interface TurnstileServerOptions {
  secretKey?: string;
  allowedOrigins?: string[];
  devMode?: boolean;
  bypassLocalhost?: boolean;
  apiUrl?: string;
  interceptor?: (action: string, data: any) => void;
}

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}
```

## Best Practices

1. **Always use HTTPS in production** - Turnstile requires secure connections
2. **Set appropriate CORS origins** - Limit who can use your verification endpoint
3. **Use environment variables** - Never hardcode secret keys
4. **Enable dev mode for development** - Automatic bypass saves development time
5. **Implement proper error handling** - Handle network failures gracefully
6. **Use interceptors for monitoring** - Track verification success rates
7. **Configure localhost bypass** - Allow local development without tokens

## Examples

See the `/examples` directory for complete working examples:

- `minimal-integration.js` - Simplest possible setup
- `node-server-integration.js` - Complete Express.js example
- `unified-integration.js` - Integration with existing shared-utils

## Migration from Direct API

### Before (Direct Cloudflare API)

```javascript
const response = await fetch(
  "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  {
    method: "POST",
    body: formData,
  },
);
```

### After (Enhanced Worker)

```javascript
const result = await verifyTurnstileSimple(token, secretKey, remoteip);
```

The enhanced system provides the same functionality with additional benefits like dev mode, localhost bypass, and unified configuration.

---

[🔝 Back to Top](#server-side-turnstile-integration) | **[🏠 Back to Main README](../README.md)**
