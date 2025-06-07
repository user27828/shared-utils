# Logging Utility

A configurable logging wrapper for console methods that provides environment-specific behavior and production safety.

## Installation & Import

```javascript
// Import the log utility directly
import { log } from '@user27828/shared-utils/utils';

// Or import the Log class for custom instances
import { Log } from '@user27828/shared-utils/utils';

// Legacy import (still supported)
import log from '@user27828/shared-utils/utils/src/log';
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
import { log } from '@user27828/shared-utils/utils';

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
import { log } from '@user27828/shared-utils/utils';

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
import log from '@user27828/shared-utils/utils/src/log';

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
const log = require('@user27828/shared-utils/utils/src/log').default;

log.setOptions({
  server: { namespace: 'API' }
});

module.exports = log;
```

#### Global Assignment (Browser)
```javascript
// In your main entry point
import log from '@user27828/shared-utils/utils/src/log';

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

## Integration Examples

### React App
```javascript
// src/index.js
import log from '@user27828/shared-utils/utils/src/log';

log.setOptions({
  client: { 
    namespace: 'ReactApp',
    production: ['error'] // Only errors in production
  }
});

// src/components/App.js
import log from '@user27828/shared-utils/utils/src/log';

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
import log from '@user27828/shared-utils/utils/src/log';

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
import log from '@user27828/shared-utils/utils/src/log';

if (typeof window !== 'undefined') {
  log.setOptions({
    client: { namespace: 'NextApp' }
  });
}

// pages/api/users.js (server-side)
import log from '@user27828/shared-utils/utils/src/log';

log.setOptions({
  server: { namespace: 'NextAPI' }
});

export default function handler(req, res) {
  log.info('API call received', { method: req.method, path: req.url });
  // ... handle request
}
```
