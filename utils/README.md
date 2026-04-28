# Utils

**[🏠 Back to Main README](../README.md)**

Core utilities for common application needs with environment detection and centralized configuration.

## 📋 Table of Contents

- [Available Utilities](#available-utilities)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)
- [isDev - Development Environment Detection](#isdev---development-environment-detection)

## Available Utilities

### Logging Utility

Production-safe console wrapper with environment-specific behavior and automatic filtering.

### Turnstile Utility

Cloudflare Turnstile browser helper for bot protection, paired with server-side verification helpers from the server package.

### OptionsManager

Centralized configuration system providing unified options management across all utilities.

### File Format Detection

Automatic detection of text-based file formats including Markdown, HTML, JSON, XML, CSV, YAML, and LaTeX with confidence scoring and format prioritization - `utils/detectFormatFromText`

[🔝 Back to Top](#utils)

## Installation & Import

> **Note**: For installation instructions, see the [main README](../README.md#installation).

```javascript
// Import utilities from the published package
import { log, turnstile, optionsManager } from "@user27828/shared-utils/utils";
```

[🔝 Back to Top](#utils)

## Configuration

### Centralized (Recommended)

```javascript
import { optionsManager } from "@user27828/shared-utils/utils";

optionsManager.setGlobalOptions({
  log: { type: "client", client: { production: ["warn", "error"] } },
  turnstile: { siteKey: "your-key" },
});
```

### Individual

```javascript
// Configure each utility separately (legacy approach)
log.setOptions({ type: "client" });
turnstile.setOptions({ siteKey: "your-key" });
```

## Turnstile Utility

Cloudflare Turnstile browser helper for explicit-render flows. Import the widget helper from the utils package and do server-side validation from `@user27828/shared-utils/server`.

```javascript
import { turnstile } from "@user27828/shared-utils/utils";
import { verifyTurnstileToken } from "@user27828/shared-utils/server";
```

## Features

- Explicit script loading with Cloudflare's current `render=explicit` flow
- Widget lifecycle management for SPAs and dynamic forms
- Current Cloudflare widget options such as `size`, `execution`, and `appearance`
- OptionsManager integration for the browser helper

## Quick Start

### Browser Widget

```javascript
import { turnstile } from "@user27828/shared-utils/utils";

turnstile.setOptions({
  siteKey: "YOUR_SITE_KEY",
  widget: {
    theme: "auto",
    size: "flexible",
  },
});

const widgetId = await turnstile.render("#turnstile-container", {
  action: "contact-form",
  callback: (token) => {
    console.log("Turnstile token received", token);
  },
  "expired-callback": () => {
    turnstile.reset(widgetId);
  },
});
```

### Server Verification

```javascript
import { verifyTurnstileToken } from "@user27828/shared-utils/server";

app.post("/api/contact", async (req, res) => {
  const token = req.body.turnstileToken || req.body["cf-turnstile-response"];

  const result = await verifyTurnstileToken(token, {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    remoteip: req.ip,
    expectedAction: "contact-form",
    expectedHostname: "example.com",
  });

  if (!result.success) {
    return res.status(400).json({
      error: "Turnstile verification failed",
      codes: result["error-codes"],
    });
  }

  res.json({ success: true });
});
```

## Configuration Options

```javascript
turnstile.setOptions({
  siteKey: "your-site-key",
  scriptUrl:
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  widget: {
    theme: "auto",
    size: "flexible",
    execution: "render",
    appearance: "always",
    retry: "auto",
    "retry-interval": 8000,
    "refresh-expired": "auto",
    "refresh-timeout": "auto",
    "response-field": true,
    "response-field-name": "cf-turnstile-response",
  },
});
```

## API Reference

- `render(container, options)`
- `execute(widgetIdOrContainer?)`
- `getResponse(widgetId?)`
- `reset(widgetId?)`
- `remove(widgetId)`
- `isExpired(widgetId?)`
- `getActiveWidgets()`
- `removeAll()`
- `cleanup()`
- `setOptions(options)`
- `getOptions()`
- `resetOptions()`

## React Integration

```jsx
import React, { useEffect, useRef, useState } from "react";
import { turnstile } from "@user27828/shared-utils/utils";

function TurnstileWidget({ onSuccess, onError }) {
  const containerRef = useRef(null);
  const [widgetId, setWidgetId] = useState(null);

  useEffect(() => {
    let mounted = true;

    const renderWidget = async () => {
      try {
        const id = await turnstile.render(containerRef.current, {
          callback: onSuccess,
          "error-callback": onError,
        });

        if (mounted) {
          setWidgetId(id);
        }
      } catch (error) {
        onError?.(error);
      }
    };

    renderWidget();

    return () => {
      mounted = false;
      if (widgetId) {
        turnstile.remove(widgetId);
      }
    };
  }, [widgetId, onError, onSuccess]);

  return <div ref={containerRef} />;
}
```

## Best Practices

1. Always verify the token on the server. The browser helper is not enough by itself.
2. Set a widget `action` and validate the same `expectedAction` on the server.
3. Reset or remove widgets after failed or expired submissions.
4. Do not call Siteverify from browser code.
5. Use explicit `allowedOrigins` if you expose a Worker endpoint to browsers.

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
import { optionsManager } from "@user27828/shared-utils/utils";

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
    widget: {
      theme: "auto",
      size: "normal",
    },
  },
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    expectedAction: "contact-form",
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
console.log("Available utilities:", utilities);
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
  },
  "turnstile-server": {
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

import { optionsManager } from "@user27828/shared-utils/utils";
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
import { optionsManager } from "@user27828/shared-utils/utils";

// Configure utilities at server startup
optionsManager.setGlobalOptions({
  log: {
    type: "server",
    server: {
      production: ["warn", "error"],
      namespace: "ExpressAPI",
    },
  },
  "turnstile-server": {
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
import { OptionsManager, optionsManager } from "@user27828/shared-utils/utils";

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

### normalizeUrl

Normalizes URL-like strings by adding a protocol when the input already looks like a hostname.

This is useful when users paste values like `facebook.com/agentmdotcom` (no scheme) and you want to store/display a fully-qualified URL.

```js
import { normalizeUrl } from "@user27828/shared-utils/utils";

normalizeUrl("facebook.com/agentmdotcom");
// => "https://facebook.com/agentmdotcom"

normalizeUrl("https://github.com/user27828");
// => "https://github.com/user27828"
```

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

### detectFormatFromText

Automatically detects the format of text content by analyzing syntax patterns and structure. Supports multiple text-based formats including Markdown, HTML, JSON, XML, CSV, YAML, LaTeX, and plain text. Uses confidence scoring to determine the most likely format.

```js
import { detectFormatFromText } from "@user27828/shared-utils/utils";

// Detect format from content string
const result = await detectFormatFromText({
  content: '{"key": "value", "array": [1, 2, 3]}',
});
// Returns: { format: "json", mimeType: "application/json", extension: "json", confidence: 1.0 }

// Detect format from file path (Node.js only)
const fileResult = await detectFormatFromText({
  filePath: "/path/to/document.md",
});
// Returns: { format: "md", mimeType: "text/markdown", extension: "md", confidence: 0.9 }

// Limit detection to specific formats
const limitedResult = await detectFormatFromText({
  content: "name,age\nJohn,30\nJane,25",
  formats: ["json", "csv", "txt"],
});
// Returns: { format: "csv", mimeType: "text/csv", extension: "csv", confidence: 0.8 }
```

#### Parameters

- `content` (string, optional): Text content to analyze. Either `content` or `filePath` is required.
- `filePath` (string, optional): File path to read content from (Node.js environments only). Either `content` or `filePath` is required.
- `formats` (string[], optional): Array of format names to check against. Defaults to all supported formats: `["md", "html", "json", "xml", "csv", "yaml", "txt", "tex"]`.

#### Returns

Returns a Promise that resolves to an object with:

- `format` (string): Detected format identifier (`"md"`, `"html"`, `"json"`, etc.)
- `mimeType` (string): MIME type for the detected format
- `extension` (string): File extension for the detected format
- `confidence` (number): Confidence score from 0.0 to 1.0
- `reasons` (string[]): Array of strings explaining why this format was detected

#### Supported Formats

- **Markdown** (`md`): Headers (`#`), bold (`**`), links (`[]()`), lists, code blocks, tables
- **HTML** (`html`): DOCTYPE, tags with attributes, self-closing elements
- **JSON** (`json`): Valid JSON objects, arrays, and primitive values
- **XML** (`xml`): XML declaration, namespace attributes, structured elements
- **CSV** (`csv`): Comma-separated values with multiple rows
- **YAML** (`yaml`): Key-value pairs, lists, indentation-based structure
- **LaTeX** (`tex`): Commands (`\command`), environments (`\begin{env}`)
- **Plain Text** (`txt`): Default fallback when no specific format is detected

#### Error Handling

Throws an error if:

- Neither `content` nor `filePath` is provided
- `filePath` is used in non-Node.js environments
- File reading fails (file not found, permission denied, etc.)

---

## isDev - Development Environment Detection

Unified development environment detection for both client and server.

```typescript
isDev(options?: IsDevOptions): boolean
```

**Options:**

- `devMode?: boolean` - Explicit override (highest priority)
- `environment?: "client" | "server"` - Specify environment (auto-detected if omitted)
- `env?: EnvironmentObject` - Custom environment variables
- `xCriteria?: () => boolean` - Custom evaluation callback

**Behavior:**

- Auto-detects client (browser) vs server (Node.js)
- Checks `NODE_ENV`, `DEV_MODE`, `DEV` environment variables
- Client: also checks for localhost and dev hostnames
- Returns true if in development mode, false otherwise

**Example:**

```javascript
import { isDev } from "@user27828/shared-utils/utils";

if (isDev()) console.log("Development mode");
if (isDev({ environment: "server" })) console.log("Server dev");
if (isDev({ devMode: true })) console.log("Force dev mode");
```

---

## FileUploadList Component (Client)

- `selectDefaultAction`: When true, triggers the onClick/onSelect action for the default selection, even if the value is already selected.
- Uses global `log` (set up via `@user27828/shared-utils/client/init`) for debug output. Do not import log directly in consumer code; use the global.
- Follows strict code style: never use single-line conditional execution (always use curly braces for conditionals).
