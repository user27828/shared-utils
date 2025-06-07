module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.js', // Keep for existing JS tests
    '**/__tests__/**/*.ts', // For TS tests in __tests__ folders
    '**/*.test.js',       // For .test.js files anywhere (like utils/src/__tests__)
    '**/*.test.ts'        // For .test.ts files anywhere
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest', // Transform both .ts/.tsx and .js/.jsx with ts-jest
  },
  collectCoverageFrom: [
    'utils/src/**/*.ts',
    'utils/index.ts',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Simplified mapper to focus on the core issue
    '^@user27828/shared-utils/client$': '<rootDir>/dist/client/index.js',
    '^@user27828/shared-utils/utils$': '<rootDir>/dist/utils/index.js',
    '^@user27828/shared-utils$': '<rootDir>/dist/index.js'
    // Removed the wildcard and utils/src specific mappers for now to simplify
  },
  // Prevent tests from being run from the dist directory if they are copied there
  testPathIgnorePatterns: [
    '<rootDir>/dist/'
  ]
};
