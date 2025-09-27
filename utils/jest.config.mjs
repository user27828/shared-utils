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
    // Specific mappers for detectFormat source imports (strip .js to resolve to .ts)
    "^\\./options-manager\\.js$": "<rootDir>/src/options-manager.ts",
    // For source imports like '../src/*.js' -> '../src/*' (resolves to .ts)
    "^(\\.{1,2}/src/.*)\\.js$": "$1",
    // For detectFormat/types.js -> types.ts
    "^\\./types\\.js$": "<rootDir>/src/detectFormat/types.ts",
    // For detectFormat/formats/*.js -> formats/*.ts
    "^\\./formats/([a-z]+)\\.js$": "<rootDir>/src/detectFormat/formats/$1.ts",
  },
  transformIgnorePatterns: [
    "<rootDir>/../dist/.*",
    "node_modules/(?!(lodash-es|nanoid)/)",
  ],
};
