# Server Test Consumer

This directory contains Node.js-based tests for the server-side functionality of `@user27828/shared-utils`.

## Purpose

- **Proper Environment**: Tests server-side code in Node.js where it belongs
- **Actual Execution**: Unlike browser tests, these can actually execute server functionality
- **Complement Browser Tests**: Works alongside `test-consumer/react-app` for complete coverage

## Architecture

```
test-consumer/
├── react-app/          # Browser-based tests (client-side)
├── server/             # Node.js-based tests (server-side)
│   ├── package.json    # Dependencies & scripts
│   ├── index.js        # HTTP server for test results
│   ├── test-runner.js  # Standalone test runner
│   └── tests/
│       └── server-integration-tests.js
└── packages/           # Shared package artifacts
```

## Usage

### Install Dependencies

```bash
yarn install
```

### Run Tests

#### Standalone Test Runner

```bash
yarn test
```

#### HTTP Server with Tests

```bash
yarn start
# Visit http://localhost:3002/test for JSON results
```

#### Development Mode

```bash
yarn dev  # Auto-restarts on file changes
```

## Test Coverage

- ✅ **Package Import**: Verifies server module can be imported
- ✅ **API Surface**: Validates presence of key functions and interfaces
- ✅ **Configuration**: Tests `TurnstileConfig` creation and usage
- ✅ **Verification**: Tests `verifyTurnstileToken` function
- ✅ **Middleware**: Tests `createTurnstileMiddleware` function
- ✅ **Worker Factory**: Tests `createTurnstileWorker` function
- ✅ **Integration**: Mock verification calls with graceful error handling
- ✅ **CMS Connector Conformance**: Runs `runCmsConnectorConformanceTests()` against an in-memory connector
- ✅ **FM Connector Conformance**: Runs `runFmConnectorConformanceTests()` against an in-memory connector

## Integration with React App

The server test consumer complements the browser-based tests in `react-app`:

- **Browser Tests**: Focus on client-side integration, UI components, browser compatibility
- **Server Tests**: Focus on server-side logic, Node.js compatibility, actual execution

This separation ensures each test environment is optimized for its intended runtime.
