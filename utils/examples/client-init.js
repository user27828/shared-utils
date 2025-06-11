/**
 * Complete client-side initialization example
 * Includes both log and turnstile utilities for a complete client setup
 */
import { log, turnstile, optionsManager } from '@shared-utils/utils';

// Configuration values would be injected by your application
const CONFIG = {
  turnstileSiteKey: 'your-site-key-here',  // Injected from your app's env vars
  environment: 'production'  // or 'development'
};

// Option 1: Configure utilities individually
log.setOptions({
  type: 'client',
  client: {
    namespace: 'MyApp',
    production: ['warn', 'error'],
    localStorageOverrideKey: 'debugLogs'
  }
});

turnstile.setOptions({
  siteKey: CONFIG.turnstileSiteKey,  // ✅ Injected configuration
  widget: {
    theme: 'auto',
    size: 'normal',
    appearance: 'always'
  }
});

// Option 2: Configure utilities centrally (recommended)
/*
optionsManager.setGlobalOptions({
  log: {
    type: 'client',
    client: {
      namespace: 'MyApp',
      production: ['warn', 'error']
    }
  },
  turnstile: {
    siteKey: CONFIG.turnstileSiteKey,  // ✅ Injected configuration
    widget: {
      theme: 'auto',
      size: 'normal'
    }
  }
});
*/

// Make log globally available (optional)
window.log = log;

// Initialize app
log.info('Client application initialized');
log.debug('Debug mode available (localStorage override)');

export { log, turnstile };