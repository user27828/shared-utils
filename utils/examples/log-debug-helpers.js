/**
 * Debug logging utilities for production troubleshooting
 * These functions help enable logging in production environments for debugging
 */
import { log } from '@shared-utils/utils';

/**
 * Browser console helpers for production debugging
 * Open browser console and run these commands to enable debug logging
 */

// Enable all logging levels in production
// localStorage.setItem('debugLogs', 'true');

// Enable specific log levels
// localStorage.setItem('debugLogs', '["log", "info", "warn", "error"]');

// Disable debug logging
// localStorage.removeItem('debugLogs');

/**
 * Programmatic debug control
 */
export const debugHelpers = {
  
  /**
   * Enable all debug logging
   */
  enableAll: () => {
    log.enableDebug();
    console.log('✅ All debug logging enabled');
  },

  /**
   * Enable specific log levels
   */
  enableLevels: (levels = ['log', 'info', 'warn', 'error']) => {
    log.enableDebug(levels);
    console.log('✅ Debug logging enabled for levels:', levels);
  },

  /**
   * Disable debug logging
   */
  disable: () => {
    log.disableDebug();
    console.log('❌ Debug logging disabled');
  },

  /**
   * Show current debug settings
   */
  status: () => {
    const options = log.getOptions();
    const override = localStorage.getItem(options.client.localStorageOverrideKey);
    
    console.log('🔍 Debug Status:', {
      environment: options.type,
      isProduction: process.env.NODE_ENV === 'production',
      productionLevels: options[options.type].production,
      debugOverride: override ? JSON.parse(override) : null
    });
  },

  /**
   * Test all log levels
   */
  test: () => {
    log.debug('🐛 This is a debug message');
    log.log('📝 This is a log message');
    log.info('ℹ️ This is an info message');
    log.warn('⚠️ This is a warning message');
    log.error('❌ This is an error message');
  }
};

// Make available globally for console access in browser
if (typeof window !== 'undefined') {
  window.debugLog = debugHelpers;
  console.log('🔧 Debug helpers available at window.debugLog');
  console.log('💡 Try: debugLog.enableAll(), debugLog.test(), debugLog.status()');
}

export default debugHelpers;
