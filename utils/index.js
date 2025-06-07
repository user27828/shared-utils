/**
 * Barrel file for utilities
 * Re-exports all utility modules for convenient importing
 */

// Logging utility
const { default: log, Log } = require('./src/log.ts');

module.exports = {
  log,
  Log
};
