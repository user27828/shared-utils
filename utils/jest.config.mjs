export default {
  testEnvironment: "node",
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
    "^.+\\.(ts|tsx|js|jsx)$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          ["@babel/preset-typescript"],
        ],
      },
    ],
  },
  moduleNameMapper: {
    "^@shared-utils/utils$": "<rootDir>/../dist/utils/index.js",
    "^shared-utils/utils$": "<rootDir>/../dist/utils/index.js",
    "^shared-utils$": "<rootDir>/../dist/utils/index.js",
    "^\.\./src/detectFormat$":
      "<rootDir>/../dist/utils/src/detectFormat/index.js",
    "^\.\./\.\./src/detectFormat$":
      "<rootDir>/../dist/utils/src/detectFormat/index.js",
    // Resolve test imports from utils src to built dist JS artifacts.
    "^\.\./src/(.*)\.js$": "<rootDir>/../dist/utils/src/$1.js",
    "^\.\./\.\./src/(.*)\.js$": "<rootDir>/../dist/utils/src/$1.js",
    "^\.\./src/(.*)\.ts$": "<rootDir>/../dist/utils/src/$1.js",
    "^\.\./\.\./src/(.*)\.ts$": "<rootDir>/../dist/utils/src/$1.js",
  },
  transformIgnorePatterns: [
    "<rootDir>/../dist/.*",
    "node_modules/(?!(lodash-es|nanoid)/)",
  ],
};
