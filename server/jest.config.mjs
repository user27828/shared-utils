/**
 * Jest configuration for server package
 * @jest-environment node
 */

export default {
  testEnvironment: "node",
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.mjs"],
  testMatch: ["**/__tests__/**/*.{js,ts}", "**/*.test.{js,ts}"],
  testPathIgnorePatterns: ["/node_modules/", "\\.d\\.ts$"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // Map all imports from the utils package to the compiled JS output
    "^@shared-utils/utils(.*)$": "<rootDir>/../dist/utils$1",
    "^@user27828/shared-utils/utils(.*)$": "<rootDir>/../dist/utils$1",
    // Map any direct imports from utils/src/ to compiled JS
    "^../utils/src/(.*)$": "<rootDir>/../dist/utils/$1",
    "^.*utils/src/(.*)$": "<rootDir>/../dist/utils/$1",
    // Map absolute path imports from utils/src/ (Node ESM realpath)
    "^/home/marc314/work/misc/shared-utils/utils/src/(.*)$":
      "<rootDir>/../dist/utils/$1",
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
      },
    ],
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@shared-utils/utils|@user27828/shared-utils|lodash-es)/)",
  ],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
};
