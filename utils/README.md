# Utils

This module contains utility functions and services for common application needs.

## Available Utilities

### Logging Utility

A configurable logging wrapper for console methods that provides environment-specific behavior and production safety.

### Turnstile Utility

Cloudflare Turnstile integration for bot protection with client-side widget rendering and server-side token verification.

### OptionsManager

A centralized options management system that provides unified configuration capabilities across all utilities while preserving existing APIs.

## Installation & Import

```javascript
// Import utilities individually
import { log, turnstile } from '@shared-utils/utils';

// Import utility classes for custom instances
import { Log, Turnstile } from '@shared-utils/utils';

// Import OptionsManager for centralized configuration
import { OptionsManager, optionsManager } from '@shared-utils/utils';

// Legacy imports (still supported)
import log from '@shared-utils/utils/src/log';
import turnstile from '@shared-utils/utils/src/turnstile';
```

## Configuration Approaches

### Individual Utility Configuration (Traditional)
```javascript
// Configure each utility separately
log.setOptions({ type: 'client', client: { production: ['warn', 'error'] } });
turnstile.setOptions({ siteKey: 'your-key', secretKey: 'your-secret' });
```

### Centralized Configuration (New)
```javascript
// Configure multiple utilities at once
import { optionsManager } from '@shared-utils/utils';

optionsManager.setGlobalOptions({
  log: { 
    type: 'client',
    client: { production: ['warn', 'error'] }
  },
  turnstile: { 
    siteKey: 'your-site-key',
    secretKey: 'your-secret-key'
  }
});
```

## Features

- **Environment Auto-detection**: Automatically detects client vs server environment
- **Production Safety**: No client-side logging in production by default
- **localStorage Override**: Client-side debug logging in production via localStorage
- **Interceptors**: Custom handling of all log calls
- **Namespace Support**: Automatic prefixing with timestamps and namespaces
- **TypeScript Support**: Full type safety

## Quick Start

### Client-Side Initialization

```javascript
// In your main client entry point (e.g., src/main.js, src/index.js)
import { log } from '@shared-utils/utils';

// Configure for client-side (optional - auto-detected)
log.setOptions({
  type: 'client',
  client: {
    namespace: 'MyApp',
    production: ['warn', 'error'], // Only show warnings and errors in production
    localStorageOverrideKey: 'debugLogs'
  }
});

// Now use globally throughout your app
log('App starting...');
log.info('User logged in');
log.warn('Deprecated API used');
log.error('Failed to load data');
```

### Server-Side Initialization

```javascript
// In your main server entry point (e.g., server.js, app.js)
import { log } from '@shared-utils/utils';

(global as any).log = log; // Make log utility available globally
// Configure for server-side (optional - auto-detected)
log.setOptions({
  type: 'server',
  server: {
    namespace: 'API',
    production: ['warn', 'error'] // Only show warnings and errors in production
  }
});

// Use throughout your server code
log('Server starting on port 3000');
log.info('Database connected');
log.warn('Slow query detected');
log.error('Database connection failed');
```

## Advanced Usage

### Custom Interceptor

```javascript
// Send logs to analytics service
log.setOptions({
  interceptor: (level, args) => {
    if (level === 'error') {
      analytics.track('error', { message: args.join(' ') });
    }
  }
});
```

### Client-Side Debug Override

```javascript
// Enable all logging in production (useful for debugging)
log.enableDebug(); // Enables all levels

// Enable specific levels
log.enableDebug(['log', 'warn', 'error']);

// Disable debug logging
log.disableDebug();

// Or manually set localStorage
localStorage.setItem('debugLogs', 'true'); // Enable all
localStorage.setItem('debugLogs', '["log", "error"]'); // Enable specific levels
```

### Global Usage Patterns

#### ES6 Modules
```javascript
// utils/logger.js - Re-export configured logger
import log from '@shared-utils/utils/src/log';

// Configure once
log.setOptions({
  client: { namespace: 'MyApp' }
});

export default log;

// Then in any file:
import log from './utils/logger';
log('Hello world');
```

#### CommonJS
```javascript
// utils/logger.js
const log = require('@shared-utils/utils/src/log').default;

log.setOptions({
  server: { namespace: 'API' }
});

module.exports = log;
```

#### Global Assignment (Browser)
```javascript
// In your main entry point
import log from '@shared-utils/utils/src/log';

log.setOptions({
  client: { namespace: 'MyApp' }
});

// Make globally available
window.log = log;

// Now available anywhere
log('Available globally');
```

## Configuration Options

```typescript
interface LogOptions {
  type?: 'client' | 'server';              // Environment type (auto-detected)
  interceptor?: (level, args) => void;     // Custom log handler
  client?: {
    namespace?: string;                    // Log prefix (default: 'client')
    production?: LogLevel[];               // Levels to show in production (default: [])
    localStorageOverrideKey?: string;      // Key for debug override (default: 'logLevels')
  };
  server?: {
    namespace?: string;                    // Log prefix (default: 'server')
    production?: LogLevel[];               // Levels to show in production (default: ['error'])
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
    "extends": [
      "react-app"
    ],
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
    log: "readonly"
  }
};
```

For TypeScript projects, you can also add a global type declaration in a `.d.ts` file:

```typescript
// globals.d.ts
import { Log } from '@shared-utils/utils';

declare global {
  var log: Log;
}
```

## Integration Examples

### React App
```javascript
// src/index.js
import log from '@shared-utils/utils/src/log';

log.setOptions({
  client: { 
    namespace: 'ReactApp',
    production: ['error'] // Only errors in production
  }
});

// src/components/App.js
import log from '@shared-utils/utils/src/log';

function App() {
  useEffect(() => {
    log.info('App component mounted');
  }, []);
  
  // ... rest of component
}
```

### Node.js Express Server
```javascript
// server.js
import log from '@shared-utils/utils/src/log';

log.setOptions({
  server: {
    namespace: 'ExpressAPI',
    production: ['warn', 'error']
  }
});

app.listen(3000, () => {
  log.info('Server started on port 3000');
});

app.use((req, res, next) => {
  log(`${req.method} ${req.path}`);
  next();
});
```

### Next.js App
```javascript
// pages/_app.js (client-side)
import log from '@shared-utils/utils/src/log';

if (typeof window !== 'undefined') {
  log.setOptions({
    client: { namespace: 'NextApp' }
  });
}

// pages/api/users.js (server-side)
import log from '@shared-utils/utils/src/log';

log.setOptions({
  server: { namespace: 'NextAPI' }
});

export default function handler(req, res) {
  log.info('API call received', { method: req.method, path: req.url });
  // ... handle request
}
```

---

# Turnstile Utility

Cloudflare Turnstile integration for bot protection with automatic environment detection and minimal configuration.

## Installation & Import

```javascript
// Import the turnstile utility directly
import { turnstile } from '@shared-utils/utils';

// Or import the Turnstile class for custom instances
import { Turnstile } from '@shared-utils/utils';

// Legacy import (still supported)
import turnstile from '@shared-utils/utils/src/turnstile';
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
import { turnstile } from '@shared-utils/utils';

// Configure with your site key
turnstile.setOptions({
  siteKey: 'YOUR_SITE_KEY', // From Cloudflare Dashboard
});

// Render widget in a form
async function setupForm() {
  const widgetId = await turnstile.render('#turnstile-container', {
    callback: (token) => {
      console.log('Token received:', token);
      // Enable form submission
      document.getElementById('submit-btn').disabled = false;
    },
    'expired-callback': () => {
      // Disable form submission on token expiry
      document.getElementById('submit-btn').disabled = true;
    }
  });
}

// Get token for form submission
function submitForm() {
  const token = turnstile.getResponse();
  if (!token) {
    alert('Please complete the security check');
    return;
  }
  
  // Submit form with token
  fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify({ 
      ...formData, 
      turnstileToken: token 
    })
  });
}
```

### Server-Side Verification

```javascript
// In your server code
import { turnstile } from '@shared-utils/utils';

// Configure with your secret key
turnstile.setOptions({
  secretKey: process.env.TURNSTILE_SECRET_KEY,
});

// Express.js middleware
async function verifyTurnstile(req, res, next) {
  try {
    const token = req.body.turnstileToken || req.body['cf-turnstile-response'];
    const result = await turnstile.verify(token, req.ip);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Security verification failed',
        codes: result['error-codes']
      });
    }
    
    req.turnstile = result;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Verification error' });
  }
}

// Use in routes
app.post('/api/contact', verifyTurnstile, (req, res) => {
  // Process verified request
  console.log('Verified request from:', req.turnstile.hostname);
  res.json({ success: true });
});
```

## Configuration Options

### Client-Side Options

```javascript
turnstile.setOptions({
  siteKey: 'your-site-key',
  scriptUrl: 'https://challenges.cloudflare.com/turnstile/v0/api.js', // Custom script URL
  widget: {
    theme: 'auto',        // 'light', 'dark', 'auto'
    size: 'normal',       // 'normal', 'compact'
    retry: 'auto',        // 'auto', 'never'
    'retry-interval': 8000,
    'refresh-expired': 'auto', // 'auto', 'manual', 'never'
    appearance: 'always', // 'always', 'execute', 'interaction-only'
    language: 'auto',     // Language code or 'auto'
  },
  interceptor: (action, data) => {
    console.log(`Turnstile ${action}:`, data);
  }
});
```

### Server-Side Options

```javascript
turnstile.setOptions({
  secretKey: 'your-secret-key',
  apiUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify', // Or your worker URL
  interceptor: (action, data) => {
    if (action === 'verify-complete') {
      console.log('Verification result:', data.result);
    }
  }
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
import React, { useEffect, useRef, useState } from 'react';
import { turnstile } from '@shared-utils/utils';

function TurnstileWidget({ onSuccess, onError }) {
  const containerRef = useRef();
  const [widgetId, setWidgetId] = useState(null);

  useEffect(() => {
    const renderWidget = async () => {
      try {
        const id = await turnstile.render(containerRef.current, {
          callback: onSuccess,
          'error-callback': onError,
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
  const [token, setToken] = useState('');

  return (
    <form>
      {/* form fields */}
      <TurnstileWidget 
        onSuccess={setToken}
        onError={() => setToken('')}
      />
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
npm install

# Set your secret key
wrangler secret put TURNSTILE_SECRET_KEY

# Deploy worker
npm run deploy
```

Then update your configuration:

```javascript
turnstile.setOptions({
  apiUrl: 'https://your-worker.your-subdomain.workers.dev',
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
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  <div id="turnstile-container"></div>
  <button type="submit" disabled>Submit</button>
</form>
```

```javascript
import { turnstile } from '@shared-utils/utils';

turnstile.setOptions({ siteKey: 'YOUR_SITE_KEY' });

// Render widget
turnstile.render('#turnstile-container', {
  callback: (token) => {
    document.querySelector('button[type="submit"]').disabled = false;
  }
});

// Handle form submission
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const token = turnstile.getResponse();
  const formData = new FormData(e.target);
  formData.append('turnstileToken', token);

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      alert('Message sent successfully!');
      turnstile.reset();
    } else {
      alert('Failed to send message');
    }
  } catch (error) {
    console.error('Submit error:', error);
    turnstile.reset();
  }
});
```

### Login Protection

```javascript
// Client-side
turnstile.render('#login-turnstile', {
  action: 'login',
  callback: (token) => {
    // Enable login button
    document.getElementById('login-btn').disabled = false;
  }
});

// Server-side (Express.js)
app.post('/api/login', async (req, res) => {
  const { username, password, turnstileToken } = req.body;
  
  // Verify Turnstile token
  const turnstileResult = await turnstile.verify(turnstileToken, req.ip);
  if (!turnstileResult.success) {
    return res.status(400).json({ error: 'Security verification failed' });
  }
  
  // Proceed with authentication
  const user = await authenticateUser(username, password);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

## Error Handling

```javascript
turnstile.setOptions({
  interceptor: (action, data) => {
    if (action === 'render-error') {
      console.error('Widget render failed:', data.error);
      // Show fallback or retry option
    }
    
    if (action === 'verify-error') {
      console.error('Verification failed:', data.error);
      // Handle server-side verification errors
    }
  }
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

```javascript
import { optionsManager } from '@shared-utils/utils';

// Configure multiple utilities at once
optionsManager.setGlobalOptions({
  log: {
    type: 'client',
    client: {
      production: ['warn', 'error'],
      localStorageOverrideKey: 'debugLogs'
    }
  },
  turnstile: {
    siteKey: process.env.TURNSTILE_SITE_KEY,
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    widget: {
      theme: 'auto',
      size: 'normal'
    }
  }
});
```

### Configuration Inspection

```javascript
// Get all utility configurations
const allOptions = optionsManager.getAllOptions();
console.log('Log config:', allOptions.log);
console.log('Turnstile config:', allOptions.turnstile);

// List registered utilities
const utilities = optionsManager.getRegisteredUtilities();
console.log('Available utilities:', utilities); // ['log', 'turnstile']
```

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
const logManager = optionsManager.getManager('log');
const turnstileManager = optionsManager.getManager('turnstile');

// Use managers directly (advanced usage)
logManager.setOptions({ type: 'server' });
turnstileManager.setOptions({ siteKey: 'new-key' });
```

### Environment-Specific Configuration

```javascript
// Application initialization with environment detection
const isDevelopment = process.env.NODE_ENV === 'development';

optionsManager.setGlobalOptions({
  log: {
    type: 'client',
    client: {
      production: isDevelopment 
        ? ['log', 'info', 'warn', 'error']  // All levels in dev
        : ['warn', 'error']                 // Minimal in prod
    }
  },
  turnstile: {
    siteKey: isDevelopment 
      ? process.env.TURNSTILE_DEV_SITE_KEY
      : process.env.TURNSTILE_PROD_SITE_KEY,
    secretKey: isDevelopment
      ? process.env.TURNSTILE_DEV_SECRET_KEY 
      : process.env.TURNSTILE_PROD_SECRET_KEY
  }
});
```

### Migration from Individual Configuration

**Before (still works):**
```javascript
import { log, turnstile } from '@shared-utils/utils';

log.setOptions({ type: 'client' });
turnstile.setOptions({ siteKey: 'key' });
```

**After (recommended for new projects):**
```javascript
import { optionsManager } from '@shared-utils/utils';

optionsManager.setGlobalOptions({
  log: { type: 'client' },
  turnstile: { siteKey: 'key' }
});
```

### Framework Integration Examples

#### Next.js App Router

```javascript
// app/providers.tsx
'use client';

import { optionsManager } from '@shared-utils/utils';
import { useEffect } from 'react';

export function UtilsProvider({ children }) {
  useEffect(() => {
    optionsManager.setGlobalOptions({
      log: {
        type: 'client',
        client: {
          production: ['warn', 'error'],
          namespace: 'NextApp'
        }
      },
      turnstile: {
        siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        widget: {
          theme: 'auto',
          size: 'normal'
        }
      }
    });
  }, []);

  return <>{children}</>;
}
```

#### Express.js Server

```javascript
// server.js
import { optionsManager } from '@shared-utils/utils';

// Configure utilities at server startup
optionsManager.setGlobalOptions({
  log: {
    type: 'server',
    server: {
      production: ['warn', 'error'],
      namespace: 'ExpressAPI'
    }
  },
  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    apiUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
  }
});

// Now all utilities are configured
app.listen(3000, () => {
  console.log('Server started with configured utilities');
});
```

### TypeScript Support

```typescript
import { OptionsManager, optionsManager } from '@shared-utils/utils';

// Type-safe configuration
optionsManager.setGlobalOptions({
  log: {
    type: 'client', // ✅ Type-checked
    client: {
      production: ['warn', 'error'] // ✅ LogLevel[] enforced
    }
  },
  turnstile: {
    siteKey: 'key', // ✅ String type enforced
    widget: {
      theme: 'auto' // ✅ TurnstileTheme type enforced
    }
  }
});

// Create custom managers for new utilities
interface CustomUtilityOptions {
  apiKey: string;
  timeout: number;
}

const customManager = new OptionsManager<CustomUtilityOptions>('custom', {
  apiKey: '',
  timeout: 5000
});
```

---

## Contributing

When adding new utilities to this package, follow the OptionsManager integration pattern:

1. Create your utility class with OptionsManager integration
2. Register with the global options manager
3. Export both singleton and class from the utility
4. Update the utils/index.ts exports
5. Add TypeScript definitions
6. Write comprehensive tests

See `HYBRID_OPTIONS_MANAGER.md` for detailed implementation guidelines.
