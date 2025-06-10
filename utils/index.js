/**
 * Barrel file for utilities
 * Re-exports all utility modules for convenient importing
 */

// Logging utility
import log, { Log, ORIGINAL_CONSOLE_METHODS } from './src/log.js';

export {
  log,
  Log,
  ORIGINAL_CONSOLE_METHODS,
};
