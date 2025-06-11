/**
 * Debug helpers example for client-side development
 * Shows how to use localStorage overrides and debug utilities
 */
import { log } from '@shared-utils/utils';

// Configure log for client with debug capabilities
log.setOptions({
  type: 'client',
  client: {
    namespace: 'DebugApp',
    production: ['warn', 'error'],
    localStorageOverrideKey: 'debugLogs'
  }
});

// Debug helper functions
export const debugHelpers = {
  // Enable all debug logging
  enableAll() {
    log.enableDebug();
    console.info('🐛 Debug mode: ALL levels enabled');
  },

  // Enable specific log levels
  enableLevels(levels = ['log', 'info', 'warn', 'error']) {
    log.enableDebug(levels);
    console.info(`🐛 Debug mode: ${levels.join(', ')} enabled`);
  },

  // Disable debug logging
  disable() {
    log.disableDebug();
    console.info('🔇 Debug mode disabled');
  },

  // Check current debug status
  status() {
    const override = log.getLocalStorageOverride();
    if (override === null) {
      console.info('🔇 Debug mode: OFF (production levels only)');
    } else if (override === true) {
      console.info('🐛 Debug mode: ALL levels enabled');
    } else if (Array.isArray(override)) {
      console.info(`🐛 Debug mode: ${override.join(', ')} enabled`);
    }
    return override;
  },

  // Test all log levels
  testLevels() {
    console.group('🧪 Testing all log levels:');
    log.debug('This is a debug message');
    log.log('This is a log message');
    log.info('This is an info message');
    log.warn('This is a warning message');
    log.error('This is an error message');
    console.groupEnd();
  },

  // Quick development setup
  devMode() {
    this.enableAll();
    this.testLevels();
    log.info('🚀 Development mode activated');
  },

  // Production debugging (only errors)
  prodDebug() {
    this.enableLevels(['error']);
    log.info('🔧 Production debugging mode (errors only)');
  }
};

// Make available globally for easy console access
window.debug = debugHelpers;

// Example usage
console.info('Debug helpers loaded. Try: debug.devMode(), debug.status(), debug.disable()');

export default debugHelpers;