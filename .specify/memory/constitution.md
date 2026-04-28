# shared-utils Constitution

## Core Principles

### I. Contract-First Library Surface

`@user27828/shared-utils` is a reusable platform package, not an app-local
code dump. The public product surface is the published package export map,
compiled `dist/` output, generated type declarations, and the documented import
paths consumers rely on.

Implications:

- Every change must preserve or intentionally evolve public subpath exports,
  type contracts, and distribution layout.
- Published artifacts are `dist`-backed package surfaces; workspace source
  directories are implementation details and are not part of the installed
  consumer contract.
- Workspace source folders are internal implementation details; consumers must
  never be required to import from `client/src`, `server/src`, or `utils/src`.
- `client/index.ts` remains side-effect-free for tree-shaking, and any required
  side effects must live in explicit init entrypoints such as `client/init`.
- Public-surface changes require matching updates to docs, specs, and any
  consumer compatibility shims or alias maps that encode the supported API.

### II. Layered Domain Boundaries and Injection

The repository uses a stable layered architecture: shared contracts in `utils`,
business orchestration in `server`, and SDK/UI surfaces in `client`. CMS and FM
are the reference implementations of this pattern.

Implications:

- Shared types, validation, and domain errors belong in `utils/src/<domain>/`.
- Service cores, routers, providers, connectors, storage adapters, and worker
  logic belong in `server/src/<domain>/`.
- Client APIs, providers, hooks, and React UI belong in `client/src/<domain>/`.
- Persistence, auth/authz, routing, and storage vendor specifics stay injected
  through connectors, adapters, and host-app seams rather than hardcoded into
  shared layers.
- Consumer-specific business logic must not leak into generic package layers.

### III. Explicit Runtime and Side-Effect Boundaries

Browser and server responsibilities must be explicit. Hidden environment
switching, undocumented side effects, and security-sensitive dev bypasses are
not allowed.

Implications:

- Use `isDev()` or established repository patterns for environment detection;
  do not scatter ad hoc `typeof window` or raw `NODE_ENV` logic.
- Browser widget configuration stays under `turnstile`, while server-side
  verification configuration stays under `turnstile-server` and the server
  package APIs.
- Turnstile browser widget rendering stays in the utils/browser helper, while
  verification, middleware, and worker handling stay in the server package.
- Networked or long-lived operations must clean up after themselves: abort
  in-flight requests, clear timers, remove listeners, and release resources.
- Security-sensitive flows fail closed. Missing validation, action/hostname
  mismatches, missing auth context, or malformed input must not silently pass.

### IV. Typed Contracts, Validation, and Failure Discipline

Shared-utils favors explicit typed contracts over implicit runtime behavior.
Validation, sanitization, and typed failures are part of the architecture, not
optional polish.

Implications:

- TypeScript source must follow the repository’s native ESM conventions,
  including `.js` import suffixes.
- Use established project primitives where they already define the contract:
  `OptionsManager`, Zod schemas, `nanoid`, `lodash-es`, typed CMS/FM errors,
  and the existing sanitization/password/Turnstile utilities.
- FM and CMS public flows must use typed domain errors rather than raw `Error`
  objects.
- Untrusted content must be validated or sanitized at the correct layer before
  it becomes persistent state or rendered output.
- New shared APIs must make data shapes and failure behavior obvious in both
  code and documentation.

### V. Verification Across Workspaces and Consumers

Because this repo publishes one package consumed across browser, server, and
integration harnesses, correctness is not proven by a single local unit test.
Changes must be verified at the layer where they create risk.

Implications:

- Every change starts with a concrete plan and forward/reverse trace of the
  affected contract surface.
- Relevant workspace tests must pass before a change is considered complete.
- Changes to exports, domain contracts, dist packaging, or consumer-facing APIs
  require broader validation such as root `yarn test`, `yarn build`, and, when
  applicable, `test-consumer/` coverage.
- The consumer integration workspace is a supported regression harness, not a
  disposable demo.
- Documentation artifacts, contract docs, and validation instructions must stay
  aligned with the shipped behavior.

## Technical and Security Constraints

- Yarn is the canonical package manager. `npm` and `pnpm` workflows are not
  authoritative for repository development.
- The supported baseline is Node.js 18+ with TypeScript ESM builds emitted to
  `dist/`.
- Cross-utility configuration belongs in `optionsManager`; configuration should
  not be split across hidden globals or undocumented channels.
- Large UI and utility dependencies should default to deep imports unless the
  repo’s bundler strategy explicitly makes named imports equivalent.
- Shared browser code must preserve tree-shaking boundaries and avoid dragging
  server-only dependencies into client bundles.
- External fetches and similar remote calls must use explicit timeout/cancel
  behavior where the repository already establishes that pattern.
- Authored documentation and code must avoid smart quotes and box-drawing
  separators.

## Workflow and Review Gates

- Brownfield work must begin by inspecting the existing code, contracts, docs,
  and test coverage before proposing architectural changes.
- Reuse existing utilities, adapters, schemas, and error types before adding
  new abstractions.
- Public-surface changes must review `package.json` exports, `typesVersions`,
  `sideEffects`, `dist` expectations, and any consumer alias or shim files
  affected by the change.
- Feature-level spec work should keep `spec.md`, `plan.md`, `data-model.md`,
  `contracts/`, and `quickstart.md` consistent when the scope warrants them.
- Validation must be proportional to the change:
  - affected workspace tests for local behavior changes
  - root build/test for package-wide or export-surface changes
  - consumer-harness validation for compatibility-sensitive changes
- Automated agents may prepare analysis, patches, and specs, but commits,
  pushes, tags, and releases are maintainer-only actions.

## Governance

This constitution is the highest-level engineering policy for this repository.
`AGENTS.md`, `.github/copilot-instructions.md`, and future Spec-Kit artifacts
must be interpreted as implementation guidance subordinate to this document.
When lower-level instructions conflict with this constitution, the constitution
prevails until the lower-level guidance is updated.

Amendment rules:

- Amendments must update this file directly.
- Every amendment must include a version bump and refreshed amendment date.
- If an amendment changes delivery expectations, affected specs, plans,
  contracts, quickstarts, or consumer docs must be updated in the same change.
- Plans and reviews must explicitly justify any complexity or temporary
  deviations from these principles.

Compliance rules:

- Constitution compliance is checked during spec review, implementation review,
  and release preparation.
- A change is not complete if its tests pass but its exported contracts, docs,
  or consumer integration obligations are left inconsistent.

**Version**: 1.0.1 | **Ratified**: 2026-04-28 | **Last Amended**: 2026-04-28
