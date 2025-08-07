export default {
  testEnvironment: "node",
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.mjs"],
  testMatch: ["**/__tests__/**/*.{js,ts}", "**/*.test.{js,ts}"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "\\.d\\.ts$",
    "/dist/.*\\.d\\.ts$",
    "__tests__/basic.test.js",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  moduleNameMapper: {
    "^@shared-utils/utils$": "<rootDir>/../dist/utils/index.js",
    "^shared-utils/utils$": "<rootDir>/../dist/utils/index.js",
    "^shared-utils$": "<rootDir>/../dist/utils/index.js",
    // Map ESM-style .js imports in source to .ts files for Jest
    "^\\./options-manager\\.js$": "<rootDir>/src/options-manager.ts",
  },
  transformIgnorePatterns: ["node_modules/(?!(lodash-es|nanoid)/)"],
};
