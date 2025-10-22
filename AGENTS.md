# Copilot Instructions for `shared-utils`

## Big Picture Architecture

- **Monorepo Structure**: TypeScript-compiled utilities distributed from `dist/` directory. Source in `utils/src/`, `client/src/`, `server/src/` with individual `package.json` configs and TypeScript project references.
- **ES Module Native**: Everything uses `.js` extensions in imports (TypeScript ES module pattern). Critical: imports must end with `.js` even for `.ts` files (e.g., `"./options-manager.js"`).
- **Centralized Configuration**: `OptionsManager` is the architectural centerpiece. Each utility registers with the global `optionsManager` singleton, enabling cross-utility configuration via `setGlobalOptions()`.
- **Environment Auto-Detection**: Use the consolidated `isDev()` function for development environment detection. Log and Turnstile utilities auto-detect client vs server context. Never hardcode environment checks - use `isDev()` or the provided detection patterns from existing utilities.

## Critical TypeScript Patterns

- **ES Module Imports**: Always use `.js` extensions: `import { OptionsManager } from "./options-manager.js"`
- **TypeScript Build**: Compiles to `../dist/{utils|client|server}/` with `--outDir` flag. Each workspace builds independently.
- **Jest ES Modules**: Uses `NODE_OPTIONS="--experimental-vm-modules"` and `preset: "ts-jest/presets/default-esm"` with complex `moduleNameMapper` configs.
- **Lodash-ES**: Uses ES module version (`lodash-es`) with specific Jest transform patterns. Import: `import { mergeWith, cloneDeep } from "lodash-es"`

## Developer Workflows

- **Build System**: `yarn build` runs workspace builds sequentially: `utils build && client build && server build`. Each workspace clears `tsconfig.tsbuildinfo` before compilation.
- **Test Integration**: Root `yarn test` runs all workspace tests. Use `yarn test:all` in `test-consumer/` for end-to-end integration across React, Node, and vanilla JS consumers.
- **Data Updates**: `./bin/update-source-data.sh` downloads official data from Library of Congress and DataHub.io with backup creation.
- **Package Management**: Yarn-only monorepo. Scripts detect yarn vs npm and fail gracefully. Never use `npm` or `pnpm` commands.
- **Development Servers**: `test-consumer/` provides isolated test environments. Use `yarn kill:all` to terminate all background processes.

Note: when running `yarn test:consumer`, the command starts Vite (React dev server) which does not exit on its own; automated runs should execute with a timeout or use a forced stop (for example, run the process in the foreground and terminate after X seconds, or run `vite --force`/`yarn test:consumer -- --timeout <ms>` in CI). This prevents Copilot or automation from hanging waiting for the process to terminate.

## OptionsManager Architecture (Critical)

- **Registration Pattern**: Each utility creates an `OptionsManager` instance and registers with global `optionsManager`: `optionsManager.registerManager("log", this.optionsManager)`
- **Cross-Utility Config**: Use `optionsManager.setGlobalOptions({ log: {...}, turnstile: {...} })` for unified configuration
- **Flexible API**: Supports both category-based (`setOption("client", {...})`) and dot notation (`setOption("client.production", [...])`) access patterns
- **Deep Merging**: Uses `lodash-es mergeWith` with array replacement (not concatenation) for configuration updates

### Environment loader integration

- The server package exposes an environment loader that builds an in-memory `envCache` from `process.env` and an optional `.env` file.
- The loader reads `ENV_JSON_KEYS` only from the parsed dotenv file (CSV string). For example:
  ENV_JSON_KEYS=LLM_DEFAULT, LLM_FALLBACK
  Keys listed in `ENV_JSON_KEYS` are JSON.parsed from the loaded dotenv values and stored in the global options under the `ENV` key.
- After building the computed environment the loader stores it via `optionsManager.setGlobalOptions({ ENV: {...}, __READONLY__: true })` so consumers can read it with `optionsManager.getOption('ENV')`.

## Project-Specific Conventions

- **File Extensions**: Source files are `.ts`, imports reference `.js`, compiled output is `.js` with `.d.ts` types
- **Logging**: `log` utility with caller information (`showCaller: true`), production filtering, and localStorage overrides for debugging
- **Turnstile Integration**: Client-side widget rendering + server-side token verification. Supports Cloudflare Worker deployment via `wrangler.toml`
- **React Components**: Function components only. Client exports include MUI-based file icons and country/language selectors
- **Data Sources**: ISO standards from official sources (Library of Congress, DataHub.io) with automated download and backup scripts

## Integration Points

- **Package Exports**: Root exports utils, client, server, with specific paths like `/client/wysiwyg` for optional dependencies
- **Test Consumer Architecture**: `test-consumer/` provides isolated test environments for React (`vite`), Node.js, vanilla JS, and server integration. These are NOT distributed - development/testing only
- **TypeScript References**: Root `tsconfig.json` uses project references to coordinate workspace builds while maintaining isolation
- **Jest Configuration**: Complex `moduleNameMapper` patterns handle ES modules, `lodash-es` transforms, and workspace imports with `transformIgnorePatterns`

## AI Coding Guidance

**When generating TypeScript code:**

- Always use curly braces for conditional return statements, even for single-line returns. Do not use single-line returns without braces.
- Never use single-line conditional execution (e.g., `if (x) doY();`). Always enclose the conditional block in curly braces, even for a single statement. Exception: single-line function definitions and returns are allowed.
- Use `.js` extensions in imports, never `.ts`: `import { log } from "./log.js"`
- Prefer `optionsManager.setGlobalOptions()` over individual `utility.setOptions()` calls
- Use `isDev()` for environment detection, never hardcode `typeof window` checks or `process.env.NODE_ENV` comparisons
- Use `lodash-es` imports: `import { mergeWith, cloneDeep } from "lodash-es"`

**When working with tests:**

- Use Vitest for new tests (prefer `vitest` over `jest`). Vitest provides fast ESM-native testing and better compatibility with Vite-based consumers.
- Run with `NODE_OPTIONS="--experimental-vm-modules"` for ES module support when required
- For existing Jest-based suites keep compatibility, but prefer writing new tests in Vitest format and update existing docs/tests when migrating
- Test both client and server contexts using provided detection mechanisms

**When updating dependencies or configs:**

- Maintain yarn-only workflow patterns - detect and warn about npm/pnpm usage
- Preserve ES module configurations in Jest/TypeScript/package.json files
- Follow monorepo patterns: individual workspace builds, centralized root scripts

## Patterns & Examples

- **Importing Utilities**:
  ```js
  import {
    log,
    turnstile,
    optionsManager,
  } from "@user27828/shared-utils/utils";
  ```
- **Running All Tests**:
  ```bash
  cd test-consumer && yarn test:all
  ```
- **Updating Data**:
  ```bash
  yarn update:data
  ```

## Key Files & Directories

- `utils/README.md`, `client/`, `server/`, `test-consumer/`, `data/source/`, `bin/`
- `test-consumer/package.json` for integration scripts
- `utils/options-manager.js` for config patterns

## Utility Function Patterns

- All shared utility functions (e.g., formatFileSize, formatDate) should read global options from optionsManager using a category key (e.g., files, dates), and allow per-call overrides via function parameters.
- Keep implementations simple: read global options, then override with function arguments.
- Document all available options in the README and in JSDoc comments.

## FileUploadList Component

- selectDefaultAction: Always ensure this prop triggers the onClick/onSelect action for the default selection, even if the value is already selected.
- Use the global log (window.log) for debug output in client code. Do not import log directly in consumer code; rely on the global.
- Never use single-line conditional execution (e.g., if (x) doY();). Always use curly braces for conditionals, except for single-line function definitions and returns.

---

**Verification Notes:**

- All conventions above are verified in code/scripts, not just assumed from documentation.
- If you find any use of npm or pnpm, or class components, report and refactor to match these conventions.
- If any section is unclear or missing, please specify which workflows, patterns, or architectural details need further documentation.
