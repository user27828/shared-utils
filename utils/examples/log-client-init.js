/**
 * Client-side logger initialization example
 * Include this in your main client entry point (e.g., src/main.js, src/index.js)
 */
import { log } from '@user27828/shared-utils/utils';

// Configure for client-side
log.setOptions({
  client: {
    namespace: 'MyApp',
    production: ['warn', 'error'], // Only show warnings and errors in production
    localStorageOverrideKey: 'debugLogs'
  },
  // Optional: Add custom interceptor for analytics/monitoring
  interceptor: (level, args) => {
    // Example: Send errors to analytics service
    if (level === 'error' && window.analytics) {
      window.analytics.track('client_error', {
        message: args.join(' '),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }
});

// Make globally available (optional)
window.log = log;

// Example usage after initialization
log.info('Client application initialized');
log.debug('Debug mode enabled'); // Won't show in production unless localStorage override

export default log;
