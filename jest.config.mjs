export default {
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.js', // Keep for existing JS tests
    '**/__tests__/**/*.ts', // For TS tests in __tests__ folders
    '**/*.test.js',       // For .test.js files anywhere (like utils/src/__tests__)
    '**/*.test.ts'        // For .test.ts files anywhere
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'es2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        declaration: false,
        skipLibCheck: true,
        // Add path mapping for .js extensions to .ts files
        paths: {
          "./src/log.js": ["./src/log.ts"]
        }
      }
    }], // Transform both .ts/.tsx and .js/.jsx with ts-jest
  },
  collectCoverageFrom: [
    'utils/src/**/*.ts',
    'utils/index.ts',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  moduleNameMapper: {
    // Handle specific imports in our test files
    '^\\.\\.?/src/log\\.js$': '<rootDir>/utils/src/log.ts',
    '^\\.\\.?/utils/index\\.js$': '<rootDir>/utils/index.ts',
    // Package mappings
    '^@user27828/shared-utils/client$': '<rootDir>/dist/client/index.js',
    '^@user27828/shared-utils/utils$': '<rootDir>/dist/utils/index.js',
    '^@user27828/shared-utils$': '<rootDir>/dist/index.js'
  },
  // Prevent tests from being run from the dist directory if they are copied there
  testPathIgnorePatterns: [
    '<rootDir>/dist/'
  ]
};
