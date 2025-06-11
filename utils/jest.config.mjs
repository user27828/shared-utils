export default {
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  testMatch: [
    '**/__tests__/**/*.{js,ts}',
    '**/*.test.{js,ts}'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.d\\.ts$',
    '/dist/.*\\.d\\.ts$',
    '__tests__/basic.test.js'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@shared-utils/utils$': '<rootDir>/dist/index.js',
    '^shared-utils/utils$': '<rootDir>/dist/index.js', 
    '^shared-utils$': '<rootDir>/dist/index.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(lodash-es)/)'
  ]
};
