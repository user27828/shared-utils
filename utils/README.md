# Utils

**[🏠 Back to Main README](../README.md)**

Core utilities for common application needs with environment detection and centralized configuration.

## 📋 Table of Contents

- [Available Utilities](#available-utilities)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)

## Available Utilities

### Logging Utility

Production-safe console wrapper with environment-specific behavior and automatic filtering.

### Turnstile Utility

Cloudflare Turnstile integration for bot protection with client-side widgets and server-side verification.

### OptionsManager

Centralized configuration system providing unified options management across all utilities.

[🔝 Back to Top](#utils)

## Installation & Import

> **Note**: For installation instructions, see the [main README](../README.md#installation).

```javascript
// Import utilities individually
import { log, turnstile, optionsManager } from "@user27828/shared-utils/utils";

// Import utility classes for custom instances
import { Log, Turnstile, OptionsManager } from "@user27828/shared-utils/utils";
```

[🔝 Back to Top](#utils)

## Configuration

### Centralized (Recommended)

```javascript
import { optionsManager } from "@user27828/shared-utils/utils";

optionsManager.setGlobalOptions({
  log: { type: "client", client: { production: ["warn", "error"] } },
  turnstile: { siteKey: "your-key", secretKey: "your-secret" },
});
```

### Individual

```javascript
// Configure each utility separately (legacy approach)
log.setOptions({ type: "client" });
turnstile.setOptions({ siteKey: "your-key" });
```

[🔝 Back to Top](#utils)

## Quick Start

### Client-Side Setup

```javascript
import { log, optionsManager } from "@user27828/shared-utils/utils";

optionsManager.setGlobalOptions({
  log: { type: "client", client: { namespace: "MyApp" } },
});

// Use throughout your app
log("App starting...");
log.info("User logged in");
```

### Server-Side Setup

```javascript
import { log, optionsManager } from "@user27828/shared-utils/utils";

optionsManager.setGlobalOptions({
  log: { type: "server", server: { namespace: "API" } },
});

log.info("Server started");
```

[🔝 Back to Top](#utils)

## API Reference

### Log Levels

- `log()` - General logging
- `info()` - Informational messages
- `warn()` - Warning messages
- `error()` - Error messages
- `debug()` - Debug messages (filtered in production)

### Methods

- `setOptions(options)` - Configure logging behavior
- `enableDebug()` - Enable debug logging in production (client-side)
- `disableDebug()` - Disable debug override

[🔝 Back to Top](#utils)

```javascript
// Enable all logging in production (useful for debugging)
log.enableDebug(); // Enables all levels

// Enable specific levels
log.enableDebug(["log", "warn", "error"]);

// Disable debug logging
log.disableDebug();

// Or manually set localStorage
localStorage.setItem("debugLogs", "true"); // Enable all
localStorage.setItem("debugLogs", '["log", "error"]'); // Enable specific levels
```

### Global Usage Patterns

#### ES6 Modules

```javascript
// utils/logger.js - Re-export configured logger
import log from "@shared-utils/utils/src/log";

// Configure once
log.setOptions({
  client: { namespace: "MyApp" },
});

export default log;

// Then in any file:
import log from "./utils/logger";
log("Hello world");
```

#### CommonJS

```javascript
// utils/logger.js
const log = require("@shared-utils/utils/src/log").default;

log.setOptions({
  server: { namespace: "API" },
});

module.exports = log;
```

#### Global Assignment (Browser)

```javascript
// In your main entry point
import log from "@shared-utils/utils/src/log";

log.setOptions({
  client: { namespace: "MyApp" },
});

// Make globally available
window.log = log;

// Now available anywhere
log("Available globally");
```

## Configuration Options

```typescript
interface LogOptions {
  type?: "client" | "server"; // Environment type (auto-detected)
  interceptor?: (level, args) => void; // Custom log handler
  client?: {
    namespace?: string; // Log prefix (default: 'client')
    production?: LogLevel[]; // Levels to show in production (default: [])
    localStorageOverrideKey?: string; // Key for debug override (default: 'logLevels')
  };
  server?: {
    namespace?: string; // Log prefix (default: 'server')
    production?: LogLevel[]; // Levels to show in production (default: ['error'])
  };
}
```

## Log Levels

- `log()` - General logging
- `info()` - Informational messages
- `warn()` - Warning messages
- `error()` - Error messages
- `debug()` - Debug messages (never shown in production unless overridden)

## Environment Detection

The utility automatically detects the environment:

- **Client**: Presence of `window` and `document` objects
- **Server**: Presence of `process.versions.node`
- **Production**:
  - Client: `process.env.NODE_ENV === 'production'` or hostname !== 'localhost'
  - Server: `process.env.NODE_ENV === 'production'`

## Output Format

```
[2025-05-25T10:30:45.123Z] [MyApp] [INFO] User logged in successfully
[2025-05-25T10:30:46.456Z] [API] [ERROR] Database connection failed
```

## Best Practices

1. **Initialize Once**: Configure the logger once at application startup
2. **Use Appropriate Levels**: Use `error` for errors, `warn` for warnings, `info` for important events, `log` for general logging
3. **Production Safety**: Never rely on `log` or `debug` messages being visible in production client-side
4. **Structured Logging**: Pass objects for structured data: `log.info('User action', { userId, action })`
5. **Error Handling**: Always log errors: `log.error('Operation failed', error)`

## ESLint Configuration

If you're using the log utility as a global variable (e.g., `window.log = log` or `global.log = log`), you may need to configure ESLint to recognize it as a global to avoid "no-undef" errors.

Add this to your `package.json`:

```json
{
  "eslintConfig": {
    "extends": ["react-app"],
    "globals": {
      "log": "readonly"
    }
  }
}
```

Or in your `.eslintrc.js` file:

```javascript
module.exports = {
  globals: {
    log: "readonly",
  },
};
```

For TypeScript projects, you can also add a global type declaration in a `.d.ts` file:

```typescript
// globals.d.ts
import { Log } from "@shared-utils/utils";

declare global {
  var log: Log;
}
```

## Integration Examples

### React App

```javascript
// src/index.js
import log from "@shared-utils/utils/src/log";

log.setOptions({
  client: {
    namespace: "ReactApp",
    production: ["error"], // Only errors in production
  },
});

// src/components/App.js
import log from "@shared-utils/utils/src/log";

function App() {
  useEffect(() => {
    log.info("App component mounted");
  }, []);

  // ... rest of component
}
```

### Node.js Express Server

```javascript
// server.js
import log from "@shared-utils/utils/src/log";

log.setOptions({
  server: {
    namespace: "ExpressAPI",
    production: ["warn", "error"],
  },
});

app.listen(3000, () => {
  log.info("Server started on port 3000");
});

app.use((req, res, next) => {
  log(`${req.method} ${req.path}`);
  next();
});
```

### Next.js App

```javascript
// pages/_app.js (client-side)
import log from "@shared-utils/utils/src/log";

if (typeof window !== "undefined") {
  log.setOptions({
    client: { namespace: "NextApp" },
  });
}

// pages/api/users.js (server-side)
import log from "@shared-utils/utils/src/log";

log.setOptions({
  server: { namespace: "NextAPI" },
});

export default function handler(req, res) {
  log.info("API call received", { method: req.method, path: req.url });
  // ... handle request
}
```

---

# Turnstile Utility

Cloudflare Turnstile integration for bot protection with automatic environment detection and minimal configuration.

## Installation & Import

```javascript
// Import the turnstile utility directly
import { turnstile } from "@shared-utils/utils";

// Or import the Turnstile class for custom instances
import { Turnstile } from "@shared-utils/utils";

// Legacy import (still supported)
import turnstile from "@shared-utils/utils/src/turnstile";
```

## Features

- **Environment Auto-detection**: Automatically detects client vs server environment
- **Minimal Configuration**: Works with just site/secret keys
- **Widget Management**: Automatic script loading and widget lifecycle management
- **Server Verification**: Built-in token verification with Cloudflare API
- **Interceptors**: Custom handling of all Turnstile events
- **TypeScript Support**: Full type safety
- **Cloudflare Worker**: Included worker for secure server-side verification

## Quick Start

### Client-Side Widget

```javascript
// In your main client entry point
import { turnstile } from "@shared-utils/utils";

// Configure with your site key
turnstile.setOptions({
  siteKey: "YOUR_SITE_KEY", // From Cloudflare Dashboard
});

// Render widget in a form
async function setupForm() {
  const widgetId = await turnstile.render("#turnstile-container", {
    callback: (token) => {
      console.log("Token received:", token);
      // Enable form submission
      document.getElementById("submit-btn").disabled = false;
    },
    "expired-callback": () => {
      // Disable form submission on token expiry
      document.getElementById("submit-btn").disabled = true;
    },
  });
}

// Get token for form submission
function submitForm() {
  const token = turnstile.getResponse();
  if (!token) {
    alert("Please complete the security check");
    return;
  }

  // Submit form with token
  fetch("/api/submit", {
    method: "POST",
    body: JSON.stringify({
      ...formData,
      turnstileToken: token,
    }),
  });
}
```

### Server-Side Verification

```javascript
// In your server code
import { turnstile } from "@shared-utils/utils";

// Configure with your secret key
turnstile.setOptions({
  secretKey: process.env.TURNSTILE_SECRET_KEY,
});

// Express.js middleware
async function verifyTurnstile(req, res, next) {
  try {
    const token = req.body.turnstileToken || req.body["cf-turnstile-response"];
    const result = await turnstile.verify(token, req.ip);

    if (!result.success) {
      return res.status(400).json({
        error: "Security verification failed",
        codes: result["error-codes"],
      });
    }

    req.turnstile = result;
    next();
  } catch (error) {
    res.status(500).json({ error: "Verification error" });
  }
}

// Use in routes
app.post("/api/contact", verifyTurnstile, (req, res) => {
  // Process verified request
  console.log("Verified request from:", req.turnstile.hostname);
  res.json({ success: true });
});
```

## Configuration Options

### Client-Side Options

```javascript
turnstile.setOptions({
  siteKey: "your-site-key",
  scriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js", // Custom script URL
  widget: {
    theme: "auto", // 'light', 'dark', 'auto'
    size: "normal", // 'normal', 'compact'
    retry: "auto", // 'auto', 'never'
    "retry-interval": 8000,
    "refresh-expired": "auto", // 'auto', 'manual', 'never'
    appearance: "always", // 'always', 'execute', 'interaction-only'
    language: "auto", // Language code or 'auto'
  },
  interceptor: (action, data) => {
    console.log(`Turnstile ${action}:`, data);
  },
});
```

### Server-Side Options

```javascript
turnstile.setOptions({
  secretKey: "your-secret-key",
  apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify", // Or your worker URL
  interceptor: (action, data) => {
    if (action === "verify-complete") {
      console.log("Verification result:", data.result);
    }
  },
});
```

## API Reference

### Client Methods

- `render(container, options)` - Render widget in container
- `getResponse(widgetId?)` - Get current token
- `reset(widgetId?)` - Reset widget
- `remove(widgetId)` - Remove widget
- `isExpired(widgetId?)` - Check if token expired
- `removeAll()` - Remove all active widgets
- `cleanup()` - Alias for removeAll()
- `getActiveWidgets()` - Get list of active widget IDs

### Server Methods

- `verify(token, remoteip?)` - Verify token

### Common Methods

- `setOptions(options)` - Configure utility
- `getOptions()` - Get current configuration

## React Integration

```jsx
import React, { useEffect, useRef, useState } from "react";
import { turnstile } from "@shared-utils/utils";

function TurnstileWidget({ onSuccess, onError }) {
  const containerRef = useRef();
  const [widgetId, setWidgetId] = useState(null);

  useEffect(() => {
    const renderWidget = async () => {
      try {
        const id = await turnstile.render(containerRef.current, {
          callback: onSuccess,
          "error-callback": onError,
        });
        setWidgetId(id);
      } catch (error) {
        onError?.(error);
      }
    };

    renderWidget();

    return () => {
      if (widgetId) {
        turnstile.remove(widgetId);
      }
    };
  }, []);

  return <div ref={containerRef} />;
}

// Usage
function ContactForm() {
  const [token, setToken] = useState("");

  return (
    <form>
      {/* form fields */}
      <TurnstileWidget onSuccess={setToken} onError={() => setToken("")} />
      <button disabled={!token}>Submit</button>
    </form>
  );
}
```

## Cloudflare Worker Deployment

For enhanced security, deploy the included Cloudflare Worker:

```bash
# Navigate to server directory
cd server/

# Install dependencies
yarn install

# Set your secret key
wrangler secret put TURNSTILE_SECRET_KEY

# Deploy worker
yarn deploy
```

Then update your configuration:

```javascript
turnstile.setOptions({
  apiUrl: "https://your-worker.your-subdomain.workers.dev",
});
```

## Setup Guide

For complete setup instructions including Cloudflare configuration, see:
`/server/TURNSTILE_SETUP.md`

## Test Keys

For development and testing:

- **Site Key**: `1x00000000000000000000AA`
- **Secret Key**: `1x0000000000000000000000000000000AA`

These keys always return successful verification.

## Integration Examples

### Contact Form

```html
<form id="contact-form">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <div id="turnstile-container"></div>
  <button type="submit" disabled>Submit</button>
</form>
```

```javascript
import { turnstile } from "@shared-utils/utils";

turnstile.setOptions({ siteKey: "YOUR_SITE_KEY" });

// Render widget
turnstile.render("#turnstile-container", {
  callback: (token) => {
    document.querySelector('button[type="submit"]').disabled = false;
  },
});

// Handle form submission
document
  .getElementById("contact-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = turnstile.getResponse();
    const formData = new FormData(e.target);
    formData.append("turnstileToken", token);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Message sent successfully!");
        turnstile.reset();
      } else {
        alert("Failed to send message");
      }
    } catch (error) {
      console.error("Submit error:", error);
      turnstile.reset();
    }
  });
```

### Login Protection

```javascript
// Client-side
turnstile.render("#login-turnstile", {
  action: "login",
  callback: (token) => {
    // Enable login button
    document.getElementById("login-btn").disabled = false;
  },
});

// Server-side (Express.js)
app.post("/api/login", async (req, res) => {
  const { username, password, turnstileToken } = req.body;

  // Verify Turnstile token
  const turnstileResult = await turnstile.verify(turnstileToken, req.ip);
  if (!turnstileResult.success) {
    return res.status(400).json({ error: "Security verification failed" });
  }

  // Proceed with authentication
  const user = await authenticateUser(username, password);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});
```

## Error Handling

```javascript
turnstile.setOptions({
  interceptor: (action, data) => {
    if (action === "render-error") {
      console.error("Widget render failed:", data.error);
      // Show fallback or retry option
    }

    if (action === "verify-error") {
      console.error("Verification failed:", data.error);
      // Handle server-side verification errors
    }
  },
});
```

## Best Practices

1. **Always verify server-side** - Never trust client-side verification
2. **Handle failures gracefully** - Provide fallbacks for widget loading failures
3. **Reset on errors** - Reset widget after failed form submissions
4. **Use HTTPS** - Turnstile requires secure connections
5. **Monitor verification rates** - Track success/failure rates for anomalies
6. **Configure appropriate retry** - Balance UX with security needs

---

## OptionsManager (Centralized Configuration)

The OptionsManager provides a unified configuration system for all utilities while maintaining backward compatibility with existing APIs.

### Features

- **Cross-Utility Configuration**: Configure multiple utilities simultaneously
- **Backward Compatibility**: All existing APIs continue to work unchanged
- **Type Safety**: Full TypeScript support for all operations
- **Centralized Management**: Single point for configuration inspection and bulk operations

### Basic Usage

````javascript
import { optionsManager } from "@shared-utils/utils";

// Configure multiple utilities at once
optionsManager.setGlobalOptions({
  log: {
    type: "client",
    client: {
      production: ["warn", "error"],
      localStorageOverrideKey: "debugLogs",
    },
  },
  turnstile: {
    siteKey: process.env.TURNSTILE_SITE_KEY,
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    widget: {
      theme: "auto",
      size: "normal",
    },
  },
});

## Global get/set option patterns

The `optionsManager` singleton exposes convenience helpers so consumers can both read and write options for registered utilities in a single call. This works from ESM and CommonJS consumers (for CommonJS, ensure you import the compiled package from `dist` via your bundler or runtime).

Examples:

```javascript
import { optionsManager } from "@user27828/shared-utils/utils";

// Read all options for a utility
const siteOptions = optionsManager.getOption('site');

// Read a nested value using dotted path
const uploadDir = optionsManager.getOption('site', 'files.uploadDirectory');
// or
const uploadDir2 = optionsManager.getOption('site.files.uploadDirectory');

// Set options by merging an object
optionsManager.setOption('site', { files: { uploadDirectory: '/tmp/uploads' } });

// Set a single nested value using dotted path
optionsManager.setOption('site', 'files.uploadDirectory', '/tmp/uploads');
````

Note: If a consuming project still sees the previous behavior (for example, `optionsManager.getOption is not a function`), make sure the consumer is resolving the updated package version (reinstall/relink). For local development using a linked package, run:

```bash
# In the shared-utils package
yarn build
yarn link

# In the consuming project
yarn link "@user27828/shared-utils"
```

````

### Configuration Inspection

```javascript
// Get all utility configurations
const allOptions = optionsManager.getAllOptions();
console.log("Log config:", allOptions.log);
console.log("Turnstile config:", allOptions.turnstile);

// List registered utilities
const utilities = optionsManager.getRegisteredUtilities();
console.log("Available utilities:", utilities); // ['log', 'turnstile']
````

### Bulk Operations

```javascript
// Reset all utilities to defaults
optionsManager.resetAllOptions();

// Check current configuration state
const config = optionsManager.getAllOptions();
```

### Individual Manager Access

```javascript
// Get specific utility managers
const logManager = optionsManager.getManager("log");
const turnstileManager = optionsManager.getManager("turnstile");

// Use managers directly (advanced usage)
logManager.setOptions({ type: "server" });
turnstileManager.setOptions({ siteKey: "new-key" });
```

### Environment-Specific Configuration

```javascript
// Application initialization with environment detection
const isDevelopment = process.env.NODE_ENV === "development";

optionsManager.setGlobalOptions({
  log: {
    type: "client",
    client: {
      production: isDevelopment
        ? ["log", "info", "warn", "error"] // All levels in dev
        : ["warn", "error"], // Minimal in prod
    },
  },
  turnstile: {
    siteKey: isDevelopment
      ? process.env.TURNSTILE_DEV_SITE_KEY
      : process.env.TURNSTILE_PROD_SITE_KEY,
    secretKey: isDevelopment
      ? process.env.TURNSTILE_DEV_SECRET_KEY
      : process.env.TURNSTILE_PROD_SECRET_KEY,
  },
});
```

### Migration from Individual Configuration

**Before (still works):**

```javascript
import { log, turnstile } from "@user27828/shared-utils/utils";

log.setOptions({ type: "client" });
turnstile.setOptions({ siteKey: "key" });
```

**After (recommended for new projects):**

```javascript
import { optionsManager } from "@user27828/shared-utils/utils";

optionsManager.setGlobalOptions({
  log: { type: "client" },
  turnstile: { siteKey: "key" },
});
```

### Framework Integration Examples

#### Next.js App Router

```javascript
// app/providers.tsx
"use client";

import { optionsManager } from "@shared-utils/utils";
import { useEffect } from "react";

export function UtilsProvider({ children }) {
  useEffect(() => {
    optionsManager.setGlobalOptions({
      log: {
        type: "client",
        client: {
          production: ["warn", "error"],
          namespace: "NextApp",
        },
      },
      turnstile: {
        siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        widget: {
          theme: "auto",
          size: "normal",
        },
      },
    });
  }, []);

  return <>{children}</>;
}
```

#### Express.js Server

```javascript
// server.js
import { optionsManager } from "@shared-utils/utils";

// Configure utilities at server startup
optionsManager.setGlobalOptions({
  log: {
    type: "server",
    server: {
      production: ["warn", "error"],
      namespace: "ExpressAPI",
    },
  },
  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  },
});

// Now all utilities are configured
app.listen(3000, () => {
  console.log("Server started with configured utilities");
});
```

### TypeScript Support

```typescript
import { OptionsManager, optionsManager } from "@shared-utils/utils";

// Type-safe configuration
optionsManager.setGlobalOptions({
  log: {
    type: "client", // ✅ Type-checked
    client: {
      production: ["warn", "error"], // ✅ LogLevel[] enforced
    },
  },
  turnstile: {
    siteKey: "key", // ✅ String type enforced
    widget: {
      theme: "auto", // ✅ TurnstileTheme type enforced
    },
  },
});

// Create custom managers for new utilities
interface CustomUtilityOptions {
  apiKey: string;
  timeout: number;
}

const customManager = new OptionsManager<CustomUtilityOptions>("custom", {
  apiKey: "",
  timeout: 5000,
});
```

---

## File Utilities

### formatFileSize

Formats a file size in bytes into a human-readable string, with support for binary/decimal units, precision, and style. Reads global options from optionsManager (category: `files.size`).

```js
import { formatFileSize } from "@user27828/shared-utils/utils";

formatFileSize(1024); // "1 KB"
formatFileSize(1536, { useBinary: true, precision: 1 }); // "1.5 KiB"
formatFileSize(1048576, { unitStyle: "long" }); // "1 megabyte"

// With global options
optionsManager.setGlobalOptions({
  files: { size: { useBinary: true, precision: 0 } },
});
formatFileSize(2048); // "2 KiB"
```

#### Options

- `useBinary` (boolean): Use 1024 (true) or 1000 (false) as the base. Default: false.
- `precision` (number): Number of decimal places. Default: 2.
- `unitStyle` ('short'|'long'|'narrow'): Unit display style. Default: 'short'.

### formatDate

Formats a date string or Date object into a human-readable string, with support for locale and formatting options. Reads global options from optionsManager (category: `dates`).

```js
import { formatDate } from "@user27828/shared-utils/utils";

formatDate("2025-08-03T12:34:56Z"); // "Aug 3, 2025, 12:34 PM"
formatDate(new Date(), {
  locale: "en-GB",
  formatOptions: { dateStyle: "medium", timeStyle: "short" },
});

// With global options
optionsManager.setGlobalOptions({
  dates: { locale: "en-GB", formatOptions: { dateStyle: "long" } },
});
formatDate("2025-08-03T12:34:56Z"); // "3 August 2025"
```

#### Options

- `locale` (string): Locale string (e.g., 'en-US'). Default: 'en-US'.
- `formatOptions` (object): Intl.DateTimeFormat options (dateStyle, timeStyle, etc.). Default: `{ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }`.

---

## FileUploadList Component (Client)

- `selectDefaultAction`: When true, triggers the onClick/onSelect action for the default selection, even if the value is already selected.
- Uses global `log` (set up in client/index.ts) for debug output. Do not import log directly in consumer code; use the global.
- Follows strict code style: never use single-line conditional execution (always use curly braces for conditionals).

---
