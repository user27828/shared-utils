/**
 * Main entry point for @shared-utils
 * 
 * This module intentionally does NOT export client components directly
 * to avoid runtime issues with JSX imports in Node.js environments.
 * 
 * Usage:
 * - Client components: import { CountrySelect } from '@shared-utils/client'
 * - Utils: import { log } from '@shared-utils/utils'
 */

// No exports from root - use specific import paths
// This ensures proper tree-shaking and avoids JSX import issues
