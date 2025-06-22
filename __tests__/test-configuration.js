/**
 * Configuration defaults for various tests.  This file is imported by various
 * tests via optionsManager, with handling for specific .env overrides
 * @see /.env for possible overrides
 */

/**
 * Default test configuration prior to overrides
 */
export const TEST_OPTIONS = {
  log: {
    type: "server", // Default for Node.js test environment
    server: {
      production: ["log", "info", "warn", "error"], // All levels in tests
      namespace: "test",
    },
    client: {
      production: ["log", "info", "warn", "error"], // All levels in tests
      localStorageOverrideKey: "testLogLevels",
    },
  },
  turnstile: {
    environment: "server", // Default for Node.js test environment
    apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    scriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js",
    widget: {
      theme: "auto",
      size: "normal",
      retry: "auto",
      "retry-interval": 8000,
      "refresh-expired": "auto",
      appearance: "always",
      "response-field": true,
      "response-field-name": "cf-turnstile-response",
    },
  },
};

/**
 * Common test values for mocking and testing
 */
export const TEST_VALUES = {
  // Generic test tokens and keys for unit tests
  token: "test-token",
  siteKey: "test-site-key",
  secretKey: "test-secret-key",

  // IP addresses for testing
  ipAddress: "192.168.1.1",
  localhostIpv4: "127.0.0.1",
  localhostIpv6: "::1",
  privateNetworkIp: "192.168.1.100",

  // Hostnames for testing
  hostname: "localhost",
  testHostname: "example.com",

  // User agent for testing
  userAgent: "Mozilla/5.0 (compatible; test-user-agent)",

  // Widget IDs for testing
  widgetId: "widget-123",

  // URLs for testing
  cloudflareApiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  cloudflareScriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js",
  localhostOrigin: "http://localhost:3000",
  testOrigin: "https://example.com",

  // Response values
  responseSuccess: {
    success: true,
    challenge_ts: "2024-01-01T00:00:00.000Z",
    hostname: "example.com",
  },
  responseFailure: {
    success: false,
    "error-codes": ["invalid-input-response"],
  },

  // Error messages for consistency in tests
  errorMessages: {
    siteKeyRequired: "Site key is required",
    secretKeyRequired: "Secret key is required",
    clientOnlyMethod: "Getting response is only available on client-side",
    serverOnlyMethod: "Token verification is only available on server-side",
    widgetResetClientOnly: "Widget reset is only available on client-side",
    widgetRemovalClientOnly: "Widget removal is only available on client-side",
    widgetExpiryClientOnly:
      "Widget expiry check is only available on client-side",
    networkError: "Network error",
    httpError: "HTTP error! status: 500",
    turnstileApiError: "Turnstile API error: 500",
    interceptorError: "Turnstile interceptor error:",
  },

  // Mock environment values for testing
  mockEnvironment: {
    nodeEnvDevelopment: "development",
    nodeEnvProduction: "production",
    devModeTrue: "true",
    devModeFalse: "false",
  },

  // Test timestamps and dates
  timestamps: {
    challengeTs: "2024-01-01T00:00:00.000Z",
    mockTimestamp: "2023-01-01T00:00:00.000Z",
  },
};

/**
 * Cloudflare-specific test options that are used in various tests
 * @see {@link https://developers.cloudflare.com/turnstile/troubleshooting/testing/}
 */
export const TURNSTILE_TEST_OPTIONS = {
  siteKeySuccess: "1x00000000000000000000AA", // Always passes - Visibility: visible
  siteKeyFailure: "2x00000000000000000000AB", // Always blocks - Visibility: visible
  siteKeyChallenge: "1x00000000000000000000BB", // Always passes - Visibility: invisible
  siteKeyInteractive: "2x00000000000000000000BB", // Always blocks - Visibility: invisible
  siteKeyForceInteractive: "3x00000000000000000000FF", // Forces interactive challenge - Visibility: visible
  secretKeyAlwaysPasses: "1x0000000000000000000000000000000AA", // Secret key that always passes
  secretKeyAlwaysFails: "2x0000000000000000000000000000000AA", // Secret key that always fails
  secretKeyTokenAlreadySpent: "3x0000000000000000000000000000000AA", // Secret key that token is already spent,
};
