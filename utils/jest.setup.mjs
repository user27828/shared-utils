/**
 * Jest setup file for ES modules
 * Provides global Jest functions for ES module tests
 */

import { jest } from '@jest/globals';

// Make Jest globals available globally in ES module tests
global.jest = jest;
