---
title: shared-utils Cloudflare Email Provider Implementation Plan
feature: shared-utils-email-cloudflare-provider
artifact: plan
status: proposed-enhancement
created: 2026-05-17
updated: 2026-05-17
source: analysis-remediation
---

# Implementation Plan: shared-utils Cloudflare Email Provider

**Branch**: `[master]` | **Date**: 2026-05-17 | **Spec**: `/specs/spec.md`  
**Input**: Feature specification from `/specs/spec.md` after resolving the prior consistency analysis findings.

**Note**: This plan aligns the root spec artifacts to one feature scope: adding a Cloudflare provider to the existing shared email provider surface.

## Summary

Add a new server-side Cloudflare email provider that plugs into the existing
`IEmailProvider` abstraction, uses Cloudflare Email Service's REST API for
Node/server consumers, publishes the provider through the package export map,
uses a documented non-sending read-only Cloudflare probe for `healthCheck()`,
and validates the published surface with concrete executable commands. The plan
intentionally normalizes the provider to a conservative 5 MiB message limit,
explicit recipient/header fail-closed behavior, and supplemental workspace-wide
verification through root `yarn test` after the targeted regression suites run.

## Technical Context

**Language/Version**: TypeScript 6 ESM on Node.js ^22.18.0 || >=24.11.0  
**Primary Dependencies**: Existing server email provider abstractions, built-in `fetch`, `requestWithTimeout()`, shared email address and attachment helpers, root package export maps, Cloudflare Email Service REST send endpoint, and the documented `GET /zones/{zone_id}/email/sending/subdomains` endpoint for a read-only health probe  
**Storage**: N/A for provider runtime; request and response only  
**Testing**: `cd server && NODE_OPTIONS="--experimental-vm-modules" yarn jest __tests__/email-providers.test.js --runInBand`, `NODE_OPTIONS="--experimental-vm-modules" yarn jest --config jest.config.mjs --runTestsByPath __tests__/package-imports.test.js __tests__/package-structure.test.js __tests__/server-package-distribution.test.js --runInBand`, plus explicit `yarn build` and supplemental root `yarn test` validation  
**Target Platform**: Published server package consumers running on Node.js ^22.18.0 || >=24.11.0  
**Project Type**: Yarn workspaces library monorepo with published subpath exports  
**Performance Goals**: Preserve existing provider ergonomics, keep outbound requests under the existing timeout discipline, and avoid regressions in published package consumption  
**Constraints**: Yarn-only workflow, `.js` import suffixes, server-only implementation, Cloudflare Email Service beta on a Workers Paid plan, Cloudflare DNS/domain onboarding, transactional-email-only positioning, explicit recipient and header rules, a conservative 5 MiB total message limit, and a zone-scoped read-only Cloudflare probe for `healthCheck()`  
**Scale/Scope**: One new provider module, one new provider config type including `zoneId`, published export map updates, provider and package-surface tests, server usage docs, and aligned feature artifacts

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Contract-First Library Surface**: Pass. The plan updates the provider barrel,
  dedicated provider subpath, root export map, type mappings, and validation
  docs together.
- **Layered Domain Boundaries and Injection**: Pass. All implementation work
  stays in `server/src/email/providers/` and reuses the existing shared email
  helpers instead of adding a new cross-layer abstraction.
- **Explicit Runtime and Side-Effect Boundaries**: Pass. The plan targets the
  Node/server REST API path only and defines `healthCheck()` as a non-sending
  probe using a documented read-only Cloudflare endpoint.
- **Typed Contracts, Validation, and Failure Discipline**: Pass. The provider
  adds a typed config, explicit payload and error mapping, and documented
  fail-closed behavior for content, size, recipient count, and headers.
- **Verification Across Workspaces and Consumers**: Pass. The plan now includes
  explicit runnable commands for targeted provider checks, package-surface
  regression tests, root build, and supplemental workspace-wide verification.

**Post-Phase-1 Re-check**: Pass. The design artifacts are feature-aligned and
now pin the health probe endpoint, the conservative 5 MiB rule, and the
executable validation commands.

## Project Structure

### Documentation (this feature)

```text
specs/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── contracts/
    └── email-cloudflare-api.md
```

### Source Code (repository root)

```text
.
├── package.json
├── jest.config.mjs
├── server/
│   ├── README-SERVER.md
│   ├── jest.config.mjs
│   ├── src/email/providers/
│   │   ├── types.ts
│   │   ├── index.ts
│   │   └── cloudflare.ts
│   └── __tests__/
│       └── email-providers.test.js
└── __tests__/
    ├── package-imports.test.js
    ├── package-structure.test.js
    └── server-package-distribution.test.js
```

**Structure Decision**: The feature stays within the repository's existing
server email provider layer and the published root package contract. The root
`specs/` directory remains the active artifact location because
`.specify/feature.json` pins that directory for this repo.

## Complexity Tracking

No constitution exceptions are currently required.

## Verification Commands

```bash
cd server && NODE_OPTIONS="--experimental-vm-modules" yarn jest __tests__/email-providers.test.js --runInBand
NODE_OPTIONS="--experimental-vm-modules" yarn jest --config jest.config.mjs --runTestsByPath __tests__/package-imports.test.js __tests__/package-structure.test.js __tests__/server-package-distribution.test.js --runInBand
yarn build
yarn test
```

## Implementation Outline

1. Align the spec artifacts to the Cloudflare feature scope, including exact
   validation commands, the documented `GET /zones/{zone_id}/email/sending/subdomains`
   health probe, explicit recipient/header rejection, and the conservative 5 MiB
   message-size rule.
2. Add `CloudflareProviderConfig` and `CloudflareEmailProvider` under
   `server/src/email/providers/`, reusing existing address, attachment, timeout,
   and error helpers.
3. Publish the provider from `server/src/email/providers/index.ts` and extend
   the root `package.json` export and type maps with the Cloudflare subpath.
4. Add provider regression coverage plus package-surface assertions for invalid
   content, recipient overflow, oversize messages, disallowed headers, timeout,
   API failures, and the new dist artifacts/import paths.
5. Run the explicit validation gates above, then align final docs with the
   implemented behavior.
