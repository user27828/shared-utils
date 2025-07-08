export default {
  testEnvironment: "jsdom",
  roots: ["<rootDir>"],
  testMatch: [
    "<rootDir>/__tests__/**/*.js",
    "<rootDir>/**/*.test.js",
    "<rootDir>/**/*.test.ts",
    "<rootDir>/**/*.test.tsx",
  ],
  moduleNameMapper: {
    "^@shared-utils/client$": "<rootDir>/../dist/client/index.js",
    "^shared-utils/client$": "<rootDir>/../dist/client/index.js",
    "^@shared-utils/utils$": "<rootDir>/../utils/dist/index.js",
    "^shared-utils/utils$": "<rootDir>/../utils/dist/index.js",
  },
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          ["@babel/preset-react", { runtime: "automatic" }],
          ["@babel/preset-typescript"],
        ],
      },
    ],
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/../dist/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/__tests__/**",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(@mui|@testing-library|lodash-es)/)",
  ],
};
