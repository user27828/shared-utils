# Copilot Instructions for `shared-utils`

## Big Picture Architecture

- **Monorepo Structure**: Contains core utilities (`utils/`), client components (`client/`), server logic (`server/`), data files (`data/`), and integration/test consumers (`test-consumer/`).
- **Centralized Configuration**: Use `OptionsManager` for unified config across environments. See `utils/options-manager.js` and references in `README.md`.
- **Environment Awareness**: Utilities auto-detect client/server context. Avoid hardcoding environment checks; use provided helpers.

## Developer Workflows

- **Build**: Use `yarn build` in the root or `yarn build:react`/`yarn build:server` for submodules. React app uses Vite.
- **Test**: Run `yarn test:all` in `test-consumer/` for full integration. Individual suites: `yarn test:react`, `yarn test:server`, etc.
- **Debug**: For server tests, use `node --inspect server/test-runner.js`. For React, use browser devtools with Vite dev server.
- **Clean**: Use `yarn clean` in `test-consumer/` to remove all node_modules.
- **Kill Dev Servers**: Use `yarn kill:all` or specific kill scripts (see `package.json` scripts).
- **Yarn Only**: All workflows use `yarn` exclusively. Do not use `npm` or `pnpm` for any install, build, or script commands. This is verified in all scripts and configs.

## Project-Specific Conventions

- **Data Updates**: Run `yarn update:data` to refresh authoritative data in `data/source/` (see `README.md`).
- **Logging**: Use the provided `log` utility for environment-safe logging. Supports caller info and dynamic config (see `utils/README.md`).
- **Turnstile Integration**: Use `turnstile` utility for bot protection; works client/server (see `utils/README.md`).
- **React Function Components**: Always prefer function components for React code. Verified: all exported components in `client/src/components/` are function components; no class components are present.

## Integration Points

- **Client/Server Communication**: Shared utilities are imported in both `client/` and `server/` contexts. Avoid direct cross-imports; use package boundaries.
- **Test Consumers**: `test-consumer/` contains real-world usage examples and integration tests. Each subfolder (`react-app/`, `server/`, etc.) is a standalone consumer. **Note:** `test-consumer/` is NOT part of the distributed package and is only used for local development and testing.
- **External Data**: Data files in `data/source/` are sourced from official URLs. Scripts automate download and backup.

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

---

**Verification Notes:**

- All conventions above are verified in code/scripts, not just assumed from documentation.
- If you find any use of npm or pnpm, or class components, report and refactor to match these conventions.
- If any section is unclear or missing, please specify which workflows, patterns, or architectural details need further documentation.
