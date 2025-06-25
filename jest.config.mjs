export default {
  testEnvironment: "node",
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  roots: ["<rootDir>"],
  projects: [
    {
      displayName: "utils",
      testMatch: [
        "<rootDir>/utils/__tests__/**/*.js",
        "<rootDir>/utils/**/*.test.js",
      ],
      moduleNameMapper: {
        "^@shared-utils/utils$": "<rootDir>/utils/dist/index.js",
        "^shared-utils/utils$": "<rootDir>/utils/dist/index.js",
        "^shared-utils$": "<rootDir>/utils/dist/index.js",
      },
    },
    {
      displayName: "client",
      testMatch: [
        "<rootDir>/client/__tests__/**/*.js",
        "<rootDir>/client/**/*.test.js",
      ],
      moduleNameMapper: {
        "^@shared-utils/client$": "<rootDir>/client/dist/index.js",
        "^shared-utils/client$": "<rootDir>/client/dist/index.js",
      },
    },
    {
      displayName: "server",
      testMatch: [
        "<rootDir>/server/__tests__/**/*.js",
        "<rootDir>/server/**/*.test.js",
      ],
      moduleNameMapper: {
        "^@shared-utils/server$": "<rootDir>/server/dist/index.js",
        "^@shared-utils/utils$": "<rootDir>/utils/dist/index.js",
        "^shared-utils/server$": "<rootDir>/server/dist/index.js",
      },
    },
    {
      displayName: "integration",
      testMatch: ["<rootDir>/__tests__/**/*.js", "<rootDir>/**/*.test.ts"],
      moduleNameMapper: {
        "^@shared-utils/server$": "<rootDir>/server/dist/index.js",
        "^shared-utils/client$": "<rootDir>/client/dist/index.js",
        "^shared-utils/utils$": "<rootDir>/utils/dist/index.js",
        "^shared-utils$": "<rootDir>/utils/dist/index.js",
      },
    },
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "es2020",
          moduleResolution: "node",
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          resolveJsonModule: true,
          declaration: false,
          skipLibCheck: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    "utils/src/**/*.ts",
    "utils/index.ts",
    "client/src/**/*.{js,jsx,ts,tsx}",
    "!**/__tests__/**",
    "!**/node_modules/**",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.mjs"],
  moduleNameMapper: {
    // Legacy mappings for existing tests
    "^\\.\\.?/src/log\\.js$": "<rootDir>/utils/src/log.ts",
    "^\\.\\.?/src/turnstile\\.js$": "<rootDir>/utils/src/turnstile.ts",
    "^\\.\\.?/src/turnstile\\.ts$": "<rootDir>/utils/src/turnstile.ts",
    "^\\.\\.?/utils/index\\.js$": "<rootDir>/utils/index.ts",
  },
  // Prevent tests from being run from the dist directory if they are copied there
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  // Allow lodash-es to be transformed by Jest
  transformIgnorePatterns: ["node_modules/(?!(lodash-es)/)"],
};
