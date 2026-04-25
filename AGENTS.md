# Copilot Instructions for `shared-utils`

## Engineering Standards

Every change — no matter how small — must follow first-principles logic and be production-grade.

- Before implementing, build a concrete plan. Back-trace (does each step follow from preconditions?) and forward-trace (do downstream consumers behave correctly?) to verify logical consistency.
- Eliminate implementation gaps, memory leaks, race conditions, and bugs before proposing a solution. Maximise code re-use: search for existing utilities before writing new ones.
- Optimise for robustness, security, and conciseness.
- If anything is unclear, ask — do not guess.

## Big Picture Architecture

- **Monorepo Structure**: TypeScript-compiled utilities distributed from `dist/`. Source in `utils/src/`, `client/src/`, `server/src/` with individual `package.json` configs and TypeScript project references.
- **ES Module Native**: Everything uses `.js` extensions in imports (TypeScript ES module pattern). Critical: imports must end with `.js` even for `.ts` files (e.g., `"./options-manager.js"`).
- **Tree-Shaking**: The root `package.json` declares `"sideEffects"` so bundlers can eliminate unused code. The client barrel (`client/index.ts`) is side-effect-free — all `export *` wildcards have been replaced with explicit named re-exports. `window.log` initialization lives in a separate `client/src/init.ts` module.
- **Centralized Configuration**: `OptionsManager` is the architectural centerpiece. Each utility registers with the global `optionsManager` singleton, enabling cross-utility configuration via `setGlobalOptions()`.
- **Environment Auto-Detection**: Use the consolidated `isDev()` function for development environment detection. Log and Turnstile utilities auto-detect client vs server context. Never hardcode environment checks — use `isDev()` or the provided detection patterns from existing utilities.

## Critical TypeScript Patterns

- **ES Module Imports**: Always use `.js` extensions: `import { OptionsManager } from "./options-manager.js"`
- **TypeScript Build**: Compiles to `../dist/{utils|client|server}/` with `--outDir` flag (utils, server) or `--build` (client, project references). Each workspace clears `tsconfig.tsbuildinfo` before compilation.
- **Lodash-ES**: Uses ES module version (`lodash-es`). Import: `import { mergeWith, cloneDeep } from "lodash-es"`
- **Zod**: Used for schema validation in `utils/src/fm/types.ts`, `utils/src/cms/types.ts`, and `server/src/fm/policy/allowlists.ts`. Import: `import { z } from "zod"`. All request/response shapes and enums are defined as Zod schemas; derive TypeScript types with `z.infer<>`.
- **nanoid**: Used for UID generation in service cores (`FmServiceCore`, `CmsServiceCore`) and `utils/src/functions.ts`. Import: `import { nanoid } from "nanoid"`

## FM & CMS Subsystem Architecture

The File Manager (FM) and Content Management System (CMS) are the two major feature domains. They share an identical layered architecture:

```
utils/src/{fm,cms}/     — Shared types (Zod schemas), errors, validation
server/src/{fm,cms}/    — Service cores, connectors (DB interface), Express routers, policy
client/src/{fm,cms}/    — API client classes, React providers/hooks/components
```

### Key patterns

- **Connector pattern**: DB-agnostic interfaces (`FmConnector`, `CmsConnector`). Connectors handle all persistence; service cores own business logic. Consuming projects implement the connector for their database (e.g., Supabase).
- **Service cores**: `FmServiceCore` and `CmsServiceCore` orchestrate uploads, lifecycle, URL resolution, MIME validation, link management, etc. They accept an injected connector and storage adapter — no global singletons.
- **Express router factories**: `createFmRouter()`, `createCmsAdminRouter()`, `createCmsPublicRouter()`, `createFmContentRouter()`. Each returns an Express `Router` wired to the service core.
- **Client layering**: `FmApi`/`CmsApi` (interface) → `FmClient`/`CmsClient` (HTTP implementation) → `FmClientProvider` (React context) → hooks (`useFmListFiles`, `useCmsAdmin`, `useCmsPublic`) → components (`FmMediaLibrary`, `CmsEditPage`, etc.)
- **Typed error hierarchies**: `FmError` / `CmsError` base classes with specific subclasses (`FmNotFoundError`, `FmValidationError`, `FmPolicyError`, `CmsConflictError`, `CmsLockedError`, etc.). Use `sendFmError()` / `sendCmsError()` in Express handlers — never throw raw `Error`.
- **Link tracker**: `createCmsFmLinkTracker()` automatically maintains `fm_file_links` rows when CMS content is written — wires into `CmsServiceCore.onAfterWrite`.

## Critical Agent Guidelines

**⚠️ AGENTS MUST NOT COMMIT CODE**: AI agents must never execute `git commit`, `git push`, or any other git write operations. All code changes should be left staged or unstaged for the user to commit manually.

If you need to record work, ask the user to commit or use task tracking instead.

## Documentation Guidelines

**Never use smart quotes for documentation or code unless the user requests it**

**Never use box-drawing dash characters such as `─` in code comments, documentation, or visual separators. In contexts like divider lines, always use the standard ASCII dash character `-`. If dash-divider comment lines are used, make the full line exactly 80 characters wide.**

### FM storage adapters

- `FmStorageLocal` — local filesystem
- `FmStorageS3` — S3-compatible (exported as `./fm/server/s3`)

### Package export paths

```
@user27828/shared-utils          → utils (log, optionsManager, turnstile, etc.)
@user27828/shared-utils/utils    → same as above
@user27828/shared-utils/client   → client (components, data, helpers) — side-effect-free, fully tree-shakeable
@user27828/shared-utils/client/init → client-side window.log initialization (side-effectful — import once in app entry)
@user27828/shared-utils/client/wysiwyg → WYSIWYG editors (CKEditor5, TinyMCE, EasyMDE, MDXEditor)
@user27828/shared-utils/server   → server (env loader, middleware, turnstile worker)
@user27828/shared-utils/email    → shared email preview/request/response types and validation helpers
@user27828/shared-utils/email/server → email template registry, attachment helpers, marketing sync, and webhook router factories
@user27828/shared-utils/email/server/errors → email/provider error helpers
@user27828/shared-utils/email/server/providers → provider contracts plus built-in Gmail, Resend, SES, and _test_ providers (deep provider subpaths also exported)
@user27828/shared-utils/email/client → email template preview client, hooks, and preview/admin UI
@user27828/shared-utils/cms      → CMS shared types/errors/validation
@user27828/shared-utils/cms/server → CMS service core, connectors, Express routers
@user27828/shared-utils/cms/client → CMS client API, hooks, UI components
@user27828/shared-utils/cms/client/public → public CMS client API, hook, and render/password-gate components without admin/editor UI
@user27828/shared-utils/fm       → FM shared types/errors/validation
@user27828/shared-utils/fm/server → FM service core, connectors, Express routers
@user27828/shared-utils/fm/client → FM client API, hooks, components
@user27828/shared-utils/fm/server/s3 → FM S3 storage adapter
```

## Developer Workflows

- **Build System**: `yarn build` runs workspace builds sequentially: `utils build && client build && server build`.
- **Test Integration**: Root `yarn test` runs all workspace tests. Use `yarn test:all` in `test-consumer/` for end-to-end integration across React, Node, and vanilla JS consumers.
- **Data Updates**: `./bin/update-source-data.sh` downloads official data from Library of Congress and DataHub.io with backup creation.
- **Package Management**: Yarn-only monorepo (`yarn@4`). Never use `npm` or `pnpm` commands.
- **Development Servers**: `test-consumer/` provides isolated test environments. Use `yarn kill:all` to terminate all background processes.

Note: `yarn test:consumer` starts Vite (React dev server) which does not exit on its own; automated runs should execute with a timeout or use a forced stop. This prevents automation from hanging.

## OptionsManager Architecture

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

## Debounce Hooks

The client package provides lightweight, zero-dependency debounce hooks in `client/src/helpers/debounce.ts`. These are exported for both internal use and consuming projects.

### Hooks

- **`useDebouncedValue<T>(value, options?)`** — Debounces a reactive value. Returns `[debouncedValue, DebounceControls]`.
- **`useDebouncedCallback<TArgs, TReturn>(fn, options?)`** — Debounces a callback function. Returns `[debouncedFn, DebounceControls]`. The returned function is referentially stable.

### Options (`DebounceOptions`)

| Option           | Default | Description                                         |
| ---------------- | ------- | --------------------------------------------------- |
| `wait`           | `0`     | Delay in ms before executing                        |
| `leading`        | `false` | Execute on leading edge (immediately on first call) |
| `trailing`       | `true`  | Execute on trailing edge (after wait period)        |
| `maxWait`        | —       | Maximum time (ms) before forced invocation          |
| `flushOnUnmount` | `false` | Flush (instead of cancel) pending work on unmount   |

`useDebouncedValue` also accepts `equalityFn` (default `Object.is`) to skip debounce when values are equal.

### Controls (`DebounceControls`)

Both hooks return `{ cancel(), flush(), isPending() }` as the second element.

### Usage in consuming projects

```ts
import {
  useDebouncedValue,
  useDebouncedCallback,
} from "@user27828/shared-utils/client";

// Debounce a search query
const [debouncedQuery] = useDebouncedValue(query, { wait: 300 });

// Debounce a save function
const [debouncedSave, { cancel, flush }] = useDebouncedCallback(save, {
  wait: 1000,
  maxWait: 5000,
  flushOnUnmount: true,
});
```

### Internal usage

- `FmMediaLibrary` — search input debounced at 300ms via `useDebouncedValue`
- `CmsListPage` — search/filter query debounced at 300ms via `useDebouncedValue`
- `CmsBodyEditor` — HTML normalization debounced at 500ms (ref-based timer)
- `CmsEditPage` — ARIA announcement timers tracked in refs with cleanup on unmount
- `useFmListFiles` — AbortController cancels in-flight requests on dependency change/unmount

### Design principles

- **Zero external dependencies** — pure React hooks + `setTimeout`
- **Stable references** — returned functions never change across re-renders (ref-based)
- **Automatic cleanup** — cancel on unmount (or flush if `flushOnUnmount: true`)
- **Fully typed** — generic argument/return types are inferred
- Influenced by TanStack Pacer LiteDebouncer (leading/trailing, cancel/flush) and xnimorz/use-debounce (maxWait, equalityFn, flushOnExit)

## Project-Specific Conventions

- **File Extensions**: Source files are `.ts`/`.tsx`, imports reference `.js`, compiled output is `.js` with `.d.ts` types
- **Logging**: `log` utility with caller information (`showCaller: true`), production filtering, and localStorage overrides for debugging
- **Turnstile Integration**: Client-side widget rendering + server-side token verification. Supports Cloudflare Worker deployment via `wrangler.toml`
- **React Components**: Function components only — no class components. Client exports include MUI-based components (CMS pages, FM media library, WYSIWYG editors, file icons, country/language selectors).
- **Data Sources**: ISO standards from official sources (Library of Congress, DataHub.io) with automated download and backup scripts

## AI Coding Guidance

**When generating TypeScript code:**

- Always use curly braces for conditional return statements, even for single-line returns. Do not use single-line returns without braces.
- Never use single-line conditional execution (e.g., `if (x) doY();`). Always enclose the conditional block in curly braces, even for a single statement. Exception: single-line function definitions and returns are allowed.
- Use `.js` extensions in imports, never `.ts`: `import { log } from "./log.js"`
- Prefer `optionsManager.setGlobalOptions()` over individual `utility.setOptions()` calls
- Use `isDev()` for environment detection, never hardcode `typeof window` checks or `process.env.NODE_ENV` comparisons
- Use `lodash-es` imports: `import { mergeWith, cloneDeep } from "lodash-es"`
- Use `nanoid` for ID generation, never `Math.random()` or `uuid`
- Use Zod schemas for request/response validation; derive types with `z.infer<typeof Schema>`
- Use typed error subclasses (`FmNotFoundError`, `CmsValidationError`, etc.) — never throw raw `Error` in FM/CMS code

**When working with tests:**

- **Client tests**: Vitest (`vitest run`). Config: `client/vitest.config.ts`. Setup: `client/vitest.setup.ts`.
- **Server tests**: Jest with ES module support (`NODE_OPTIONS="--experimental-vm-modules" jest`). Config: `server/jest.config.mjs`.
- **Utils tests**: Jest with ES module support (`NODE_OPTIONS="--experimental-vm-modules" jest`). Config: `utils/jest.config.mjs`.
- For new client tests, use Vitest. For new server/utils tests, use Jest with `@jest/globals` imports.
- Test both client and server contexts using provided detection mechanisms.

**When updating dependencies or configs:**

- Maintain yarn-only workflow patterns — detect and warn about npm/pnpm usage
- Preserve ES module configurations in test/TypeScript/package.json files
- Follow monorepo patterns: individual workspace builds, centralized root scripts

### Strategic Import Optimization

**Objective:** Prioritize **Deep (Path) Imports** for performance (HMR speed and tree-shaking) unless specific optimizations make **Barrel (Named) Imports** equally efficient. This applies to all large libraries, not only MUI.

#### 1. The Default: Use Deep Imports

Always use deep imports for large UI libraries, icon sets, and heavy utility packages to prevent Vite dev-server bloat and improve tree-shaking.

- **UI components:** `import Button from '@mui/material/Button';`
- **Icons:** `import SaveIcon from '@mui/icons-material/Save';`
- **Large utility libs:** `import debounce from 'lodash-es/debounce';`
- **Internal:** Avoid `index.ts` barrels in `src/` to prevent circular dependencies.

#### 2. The Exception: Use Barrel (Named) Imports ONLY IF:

- **Pre-Bundled (Vite):** The library is small/utility-based and pre-bundled by Vite (e.g., `clsx`, `date-fns`, lightweight helpers).
- **Next.js 13.5+:** The project uses `optimizePackageImports` (automatically transforms named to deep).
- **Micro-Libs:** The library has < 5 total exports and is marked `"sideEffects": false`.

#### 3. Heuristic Logic

1.  **Is it a large UI library (MUI, Ant Design, etc.) or icon set?** -> **Deep Import** (unless the bundler auto-optimizes).
2.  **Is it a heavy utility library (e.g., `lodash-es`) in Vite?** -> **Deep Import** for individual functions; **Named Import** only if Vite pre-bundles it.
3.  **Is it a small, focused library (<5 exports)?** -> **Named Import** is fine.
4.  **Is it an internal project file?** -> **Deep Import** (avoid `index.ts` barrels).

## Utility Function Patterns

- All shared utility functions (e.g., formatFileSize, formatDate) should read global options from optionsManager using a category key (e.g., files, dates), and allow per-call overrides via function parameters.
- Keep implementations simple: read global options, then override with function arguments.
- Document all available options in the README and in JSDoc comments.

## FileUploadList Component

- selectDefaultAction: Always ensure this prop triggers the onClick/onSelect action for the default selection, even if the value is already selected.
- Use the global log (window.log) for debug output in client code. Do not import log directly in consumer code; rely on the global.
- Consumer apps must explicitly import `@user27828/shared-utils/client/init` once in their entry point (e.g., `index.tsx` or `main.tsx`) to set up `window.log`. This is no longer a side effect of importing the client barrel.

## Patterns & Examples

```ts
// Importing utilities
import { log, turnstile, optionsManager } from "@user27828/shared-utils/utils";

// Importing CMS server
import {
  CmsServiceCore,
  createCmsAdminRouter,
} from "@user27828/shared-utils/cms/server";

// Importing FM client
import {
  FmClient,
  FmClientProvider,
  useFmApi,
} from "@user27828/shared-utils/fm/client";

// Importing FM types
import type { FmFileRow, FmPurpose } from "@user27828/shared-utils/fm";

// Importing debounce hooks
import {
  useDebouncedValue,
  useDebouncedCallback,
} from "@user27828/shared-utils/client";
```

```bash
# Build
yarn build

# Test all workspaces
yarn test

# Integration tests
cd test-consumer && yarn test:all

# Update data
yarn update:data
```

## Key Files & Directories

- `utils/src/options-manager.ts` — OptionsManager implementation
- `utils/src/fm/types.ts`, `utils/src/cms/types.ts` — Zod schemas and core types
- `utils/src/fm/errors.ts`, `utils/src/cms/errors.ts` — Typed error hierarchies
- `server/src/fm/FmServiceCore.ts`, `server/src/cms/CmsServiceCore.ts` — Service cores
- `server/src/fm/FmConnector.ts`, `server/src/cms/connector.ts` — DB connector interfaces
- `server/src/fm/linkTracker.ts` — CMS ↔ FM link tracking
- `client/src/helpers/debounce.ts` — Debounce hooks (useDebouncedValue, useDebouncedCallback)
- `client/src/fm/FmClient.ts`, `client/src/cms/CmsClient.ts` — HTTP API clients
- `client/src/fm/FmClientProvider.tsx` — React context provider
- `client/src/cms/ui/` — CMS admin UI pages (CmsEditPage, CmsListPage, etc.)
- `client/src/fm/components/` — FM UI components (FmMediaLibrary, FmFilePicker)
- `test-consumer/` — Isolated test environments (React, Node, vanilla JS, server)
- `data/source/` — Raw country/language data from official sources

---

**Verification Notes:**

- All conventions above are verified against source code, not assumed from documentation.
- If you find any use of npm or pnpm, or class components, report and refactor to match these conventions.
