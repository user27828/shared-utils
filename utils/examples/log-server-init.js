/**
 * Server-side logger initialization example
 * Include this in your main server entry point (e.g., server.js, app.js)
 */
import { log } from '@user27828/shared-utils/utils';

// Configure for server-side
log.setOptions({
  server: {
    namespace: 'API',
    production: ['info', 'warn', 'error'] // Show info, warnings and errors in production
  },
  // Optional: Add custom interceptor for monitoring/logging services
  interceptor: (level, args) => {
    // Example: Send to external logging service
    if (level === 'error') {
      // Send to monitoring service like Sentry, DataDog, etc.
      console.error('MONITORING:', level, args);
    }
    
    // Example: Write to file or database
    if (process.env.LOG_TO_FILE) {
      const fs = require('fs');
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: args.join(' '),
        pid: process.pid
      };
      fs.appendFileSync('app.log', JSON.stringify(logEntry) + '\n');
    }
  }
});

// Example usage after initialization
log.info('Server application initialized');
log.info('Environment:', process.env.NODE_ENV);
log.debug('Debug information'); // Won't show in production

export default log;
