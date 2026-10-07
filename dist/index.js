"use strict";
/**
 * Main entry point for @shared-utils
 *
 * This module intentionally does NOT export client components directly
 * to avoid runtime issues with JSX imports in Node.js environments.
 *
 * Usage:
 * - Client components: import { CountrySelect } from '@shared-utils/client'
 * - Pure utilities: import { isValidEmail } from '@user27828/shared-utils/utils'
 * - Logger: import { log } from '@user27828/shared-utils/utils/log'
 */
// No exports from root - use specific import paths
// This ensures proper tree-shaking and avoids JSX import issues
