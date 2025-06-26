# Examples

This directory contains example files demonstrating various features of the shared-utils library.

## Log Utility Examples

### Browser Test

- **File**: `log-caller-browser-test.html`
- **Purpose**: Demonstrates the `showCaller` feature in a browser environment
- **Usage**:
  1. Run `yarn build:utils` to compile the library
  2. Open the HTML file in a browser (preferably via a local server)
  3. Open browser console to see log output with caller information

### Jest Test Integration

The log caller functionality is now fully integrated into the Jest test suite:

- **All tests**: Run `yarn test` to run all tests including caller information tests
- **Specific tests**: Run `yarn test __tests__/log-caller.test.js` to run only the caller tests
- **Location**: `utils/__tests__/log-caller.test.js`

## Features Demonstrated

- **Caller Information**: Shows which file/function generated each log message
- **Dynamic Configuration**: Toggle caller info on/off at runtime
- **Environment Detection**: Works in both browser and Node.js environments
- **Multiple Log Levels**: Works with all log levels (log, info, warn, error, debug)
- **Jest Integration**: Comprehensive automated testing within the main test suite
