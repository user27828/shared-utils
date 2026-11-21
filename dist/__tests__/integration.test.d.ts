/**
 * Integration tests for the complete shared-utils package functionality
 * @jest-environment node
 */
declare const loadUtilsModule: () => Promise<typeof import("../dist/utils/index.js")>;
