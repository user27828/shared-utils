# shared-utils

Collection of common utilities I use for various projects. Most utilities that require environment variables get their settings populated through the **OptionsManager** - a centralized configuration system that provides unified configuration capabilities across all utilities while preserving existing APIs.

## Import Paths

**Important**: Use specific import paths for clarity and to avoid issues with JSX components in Node.js environments when not intended.

```typescript
// ✅ Recommended for Utils
import { log, turnstile, optionsManager } from '@shared-utils/utils';

// ✅ Import utility classes for custom instances
import { Log, Turnstile, OptionsManager } from '@shared-utils/utils';

// 🚫 Importing from the root is NOT supported for specific utils or components.
// import { log } from '@shared-utils'; // This will not work.

// ✅ Recommended for Client components (React/Next.js apps)
import { CountrySelect, LanguageSelect } from '@shared-utils/client';

// 🚫 Importing client components from the root is NOT supported.
// import { CountrySelect } from '@shared-utils'; // This will not work.
```

## Key Features

### 🎯 **Smart Environment Detection**
- Automatically detects client vs server environments
- Adapts logging and configuration accordingly
- No manual environment setup required

### 🔧 **Centralized Configuration**
- Configure multiple utilities through OptionsManager
- Type-safe configuration with TypeScript
- Backward compatible with existing utility APIs

### 🛡️ **Production Safety**
- Filtered logging in production environments
- Secure Turnstile token verification
- localStorage debug overrides for development

### 🔌 **Framework Agnostic**
- Works with React, Next.js, Express, vanilla JS
- ES modules and CommonJS support
- No framework lock-in

### 🧪 **Comprehensive Testing**
- 15 test suites with 135+ tests
- Integration tests for real-world scenarios
- Manual testing tools included

## Available Modules

### Utils (`/utils`)
- **Logging utility**: Production-safe console wrapper with environment detection
- **Turnstile utility**: Cloudflare Turnstile integration for bot protection
- **OptionsManager**: Centralized configuration system for all utilities
- Auto-detects client/server environment
- Supports custom interceptors for analytics
- TypeScript support with full type safety
- See `/utils/README.md` for detailed documentation

### Client Components (`/client`)
- **Form Components**: `CountrySelect`, `LanguageSelect` with built-in data
- **WYSIWYG Editors**: `TinyMceEditor`, `TinyMceBundle` with configuration presets
- **Helper Functions**: Country/language utilities, CSV helpers, and more
- Requires React environment (JSX support)

### Server (`/server`)
- **Cloudflare Worker**: Turnstile token verification service
- **Deployment Scripts**: Automated deployment helpers for Cloudflare Workers
- **Configuration Templates**: Ready-to-use `wrangler.toml` examples
- See `/server/TURNSTILE_SETUP.md` for setup instructions

## Configuration

### Quick Start Examples

```typescript
// Import utilities and OptionsManager
import { log, turnstile, optionsManager } from '@shared-utils/utils';

// Option 1: Individual utility configuration (traditional)
log.setOptions({ 
  type: 'client',
  client: { production: ['warn', 'error'] }
});
turnstile.setOptions({ 
  siteKey: 'your-site-key-here'  // Must be injected by calling application
});

// Option 2: Centralized configuration (recommended)
optionsManager.setGlobalOptions({
  log: {
    type: 'client',
    client: { production: ['warn', 'error'] }
  },
  turnstile: {
    siteKey: 'your-site-key-here',         // Must be injected by calling application  
    secretKey: 'your-secret-key-here',     // For server-side verification
    widget: { theme: 'auto', size: 'normal' }
  }
});
```

### OptionsManager Benefits

- **Centralized Configuration**: Configure multiple utilities in one place
- **Environment Detection**: Automatically adapts to client/server environments
- **Type Safety**: Full TypeScript support with autocomplete
- **Backward Compatibility**: All existing utility APIs continue to work
- **Options Injection**: Calling application injects configuration (no env vars needed)
- **Inspection Tools**: View and manage all utility configurations

```typescript
// Get all current configurations
const allOptions = optionsManager.getAllOptions();

// List registered utilities
const utilities = optionsManager.getRegisteredUtilities(); // ['log', 'turnstile']

// Reset all utilities to defaults
optionsManager.resetAllOptions();

// Example: Application initialization with injected configuration
function initializeUtils(config) {
  optionsManager.setGlobalOptions({
    log: {
      type: 'client',
      client: { production: ['warn', 'error'] }
    },
    turnstile: {
      siteKey: config.turnstileSiteKey,      // Injected from calling app
      secretKey: config.turnstileSecretKey   // Injected from calling app
    }
  });
}
```

## Command Line Tools

 - `killnode` - Kills instances of node server processes that are likely to be running from an Express server.  It *should* ignore node processes from VS Code, Electron, Android Studio, etc.
 - `yarn-upgrade` - Wraps `yarn upgrade-interactive` to install the interactive-tools package on demand and remove it when complete.  This was a quick fix to make repos compatible with Cloudflare Pages, which barfs🤢 when yarn-based repos have plugins (as of 2025-03).  This will prompt you to upgrade the server directory seperately if you have yarn workspaces enabled for that directory, and a root-level alias for `yarn server upgrade`.
 This utility will automatically leave interactive-tools alone if it's already installed (it won't uninstall it at the end.)
 - Other scripts are undocumented because they're less refined or a ~two-off.
 - `client/*` - Client-related libraries.  Be aware that additional Babel or Vite configuration may be required for certain dev situations.
 - `client/components/*Editor.jsx` - WYSIWYG editor instances
  
## Installation & Setup

### In Your Project

Add to your `package.json`:

```json
{
  "dependencies": {
    "@shared-utils": "github:user27828/shared-utils#master"
  }
}
```

Or install via command line:
```bash
yarn add @shared-utils@github:user27828/shared-utils#master
# OR
npm install @shared-utils@github:user27828/shared-utils#master
```

### Package Scripts Integration

Add useful scripts to your `package.json`:

```json
{
  "scripts": {
    "kill": "npx killnode -9",
    "upgrade": "npx yarn-upgrade-interactive --skip-server",
    "dev": "npx killnode && your-dev-command"
  }
}
```

### Turnstile Configuration

Turnstile requires configuration through the OptionsManager (not environment variables):

```typescript
// ✅ Correct: Configure through OptionsManager
import { turnstile, optionsManager } from '@shared-utils/utils';

// Option 1: Individual configuration
turnstile.setOptions({
  siteKey: 'your_site_key_here',          // Required for client-side
  secretKey: 'your_secret_key_here',      // Required for server-side verification
  apiUrl: 'https://your-worker.domain.workers.dev/'  // Optional: custom verification endpoint
});

// Option 2: Centralized configuration (recommended)
optionsManager.setGlobalOptions({
  turnstile: {
    siteKey: 'your_site_key_here',
    secretKey: 'your_secret_key_here',
    apiUrl: 'https://your-worker.domain.workers.dev/'  // Optional
  }
});

// 🚫 Incorrect: Environment variables won't work
// process.env.TURNSTILE_SITE_KEY - Not available to shared-utils package
```

### Where to Get Configuration Values

The calling project should inject the keys from its own environment:

```typescript
// In your application code
import { optionsManager } from '@shared-utils/utils';

optionsManager.setGlobalOptions({
  turnstile: {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,    // Your app's env var
    secretKey: process.env.TURNSTILE_SECRET_KEY,            // Your app's env var
    apiUrl: process.env.TURNSTILE_API_URL                   // Your app's env var (optional)
  }
});
```

### Framework-Specific Examples

#### Next.js App
```typescript
// app/lib/utils-config.ts
import { optionsManager } from '@shared-utils/utils';

export function initializeUtils() {
  optionsManager.setGlobalOptions({
    log: {
      type: 'client',
      client: { production: ['warn', 'error'] }
    },
    turnstile: {
      siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
      secretKey: process.env.TURNSTILE_SECRET_KEY!
    }
  });
}
```

#### Express.js Server
```typescript
// server.js
import { optionsManager } from '@shared-utils/utils';

function initializeUtils() {
  optionsManager.setGlobalOptions({
    log: {
      type: 'server',
      server: { production: ['info', 'warn', 'error'] }
    },
    turnstile: {
      secretKey: process.env.TURNSTILE_SECRET_KEY!
    }
  });
}

initializeUtils();
// ... rest of server setup
```

### Production Considerations

- **Logging**: Production mode filters console output by default
- **Turnstile**: Requires HTTPS in production
- **Environment Detection**: Automatically adapts client vs server behavior
- **localStorage Override**: Enables debug logging in production via browser localStorage
- **Type Safety**: Full TypeScript support prevents configuration errors

### Development in THIS Repository

When working on this shared-utils repository itself:
- Use `npx` instead of `yarn` for commands
- Run `yarn test` to execute all test suites
- Use `node test-core-functionality.mjs` for manual integration testing

## Examples & Documentation

### Code Examples
All utilities include comprehensive examples in `/utils/examples/`:
- `client-init.js` - Complete client-side setup
- `server-init.js` - Server-side configuration 
- `express-middleware.js` - Express.js integration
- `debug-helpers.js` - Development and debugging utilities
- `turnstile-react-component.tsx` - React component integration

### Documentation Links
- **Utils**: `/utils/README.md` - Complete API reference
- **Server Setup**: `/server/TURNSTILE_SETUP.md` - Cloudflare Worker deployment
- **TypeScript**: Full type definitions included

## Testing

- **Automated Tests**: 15 test suites with 135+ individual tests
- **Manual Integration**: `test-core-functionality.mjs` for end-to-end verification
- **Cross-Environment**: Tests cover both client and server scenarios
- **TypeScript**: Full type checking in build process

## Package Structure

```
├── utils/           # Core utilities (log, turnstile, OptionsManager)
├── client/          # React components and helpers
├── server/          # Cloudflare Workers and deployment scripts
├── bin/             # Command-line tools
└── __tests__/       # Cross-package integration tests
```

## Contributing

When adding new utilities to this package:

1. **Follow OptionsManager Integration Pattern**:
   ```typescript
   // Create utility with OptionsManager integration
   class NewUtility {
     private optionsManager = new OptionsManager('newUtility', defaultOptions);
     // ... implementation
   }
   
   // Register with global options manager
   optionsManager.registerManager('newUtility', instance.optionsManager);
   ```

2. **Export Pattern**: Export both singleton instance and class
3. **TypeScript**: Add full type definitions
4. **Tests**: Write comprehensive test coverage
5. **Examples**: Add usage examples to `/utils/examples/`
6. **Documentation**: Update relevant README files

### Best Practices

- **Environment Safety**: Always consider client vs server differences
- **Backward Compatibility**: Maintain existing APIs when adding features
- **Type Safety**: Use TypeScript for all new code
- **Testing**: Test both individual utilities and cross-utility integration
- **Documentation**: Keep examples up-to-date with API changes

<hr />
Love,<br />
User27828