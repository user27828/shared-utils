/**
 * Complete server-side initialization example
 * Includes both log and turnstile utilities for a complete server setup
 */
import { log, turnstile, optionsManager } from '@shared-utils/utils';

// Configuration values would be injected by your application
const CONFIG = {
  turnstileSecretKey: 'your-secret-key-here',  // Injected from your app's env vars
  turnstileWorkerUrl: 'https://your-worker.domain.workers.dev/',  // Optional
  environment: 'production'  // or 'development'
};

// Option 1: Configure utilities individually
log.setOptions({
  type: 'server',
  server: {
    namespace: 'API',
    production: ['info', 'warn', 'error']
  }
});

turnstile.setOptions({
  secretKey: CONFIG.turnstileSecretKey,  // ✅ Injected configuration
  // Optional: Use your deployed Cloudflare Worker
  apiUrl: CONFIG.turnstileWorkerUrl || 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
});

// Option 2: Configure utilities centrally (recommended)
/*
optionsManager.setGlobalOptions({
  log: {
    type: 'server',
    server: {
      namespace: 'API',
      production: ['info', 'warn', 'error']
    }
  },
  turnstile: {
    secretKey: CONFIG.turnstileSecretKey,  // ✅ Injected configuration
    apiUrl: CONFIG.turnstileWorkerUrl
  }
});
*/

// Make log globally available (optional but recommended for server)
global.log = log;

// Initialize server
log.info('Server application initialized');
log.info('Environment:', process.env.NODE_ENV);
log.info('Turnstile verification ready');

export { log, turnstile };