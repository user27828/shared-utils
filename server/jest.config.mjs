/**
 * Jest configuration for server package
 * @jest-environment node
 */

export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.mjs"],
  testMatch: ["**/__tests__/**/*.{js,ts}", "**/*.test.{js,ts}"],
  testPathIgnorePatterns: ["/node_modules/", "\\.d\\.ts$"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    // Resolve test imports from server src to built dist JS artifacts.
    "^\.\./src/(.*)\.js$": "<rootDir>/../dist/server/src/$1.js",
    "^\.\./\.\./src/(.*)\.js$": "<rootDir>/../dist/server/src/$1.js",
    "^\.\./src/(.*)\.ts$": "<rootDir>/../dist/server/src/$1.js",
    "^\.\./\.\./src/(.*)\.ts$": "<rootDir>/../dist/server/src/$1.js",
    // Map all imports from the utils package to the compiled JS output
    "^@shared-utils/utils(.*)$": "<rootDir>/../dist/utils$1",
    "^@user27828/shared-utils/utils(.*)$": "<rootDir>/../dist/utils$1",
    // Map any direct imports from utils/src/ to compiled JS
    "^../utils/src/(.*)\\.js$": "<rootDir>/../dist/utils/src/$1.js",
    "^../utils/src/(.*)\\.ts$": "<rootDir>/../dist/utils/src/$1.js",
    "^.*utils/src/(.*)\\.js$": "<rootDir>/../dist/utils/src/$1.js",
    "^.*utils/src/(.*)\\.ts$": "<rootDir>/../dist/utils/src/$1.js",
    // Map relative utils imports from server source to compiled JS
    "^../../../utils/index\\.js$": "<rootDir>/../dist/utils/index.js",
    // Map the specific utils folder import that's causing issues
    "^../../../utils/(.*)$": "<rootDir>/../dist/utils/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.jest.json",
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@shared-utils/utils|@user27828/shared-utils|lodash-es)/)",
  ],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
};
