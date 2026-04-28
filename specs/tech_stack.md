---
title: shared-utils Current State Tech Stack
feature: shared-utils-current-state
artifact: tech-stack
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# Tech Stack: shared-utils Current State

## Purpose

This document isolates the technical context that would normally feed a
Spec-Kit planning phase. It complements:

- [product_spec.md](./product_spec.md)
- [technical_spec.md](./technical_spec.md)
- [data-model.md](./data-model.md)

## Stack Summary

| Dimension           | Current state                                                                |
| ------------------- | ---------------------------------------------------------------------------- |
| Project type        | TypeScript utility/library monorepo with reusable client and server packages |
| Package manager     | Yarn 4 workspaces                                                            |
| Language            | TypeScript source with ES module output                                      |
| Module pattern      | Native ESM with `.js` import suffixes in source                              |
| Root runtime target | Node.js 18+                                                                  |
| Client runtime      | React 19                                                                     |
| Client UI toolkit   | MUI 7 plus optional MUI X and editor peer dependencies                       |
| Server HTTP layer   | Express 5                                                                    |
| Edge runtime        | Optional Cloudflare Worker deployment for Turnstile                          |
| Build output        | Workspace compilation into `dist/`                                           |
| Client tests        | Vitest                                                                       |
| Server/utils tests  | Jest with ES module support                                                  |
| Integration harness | `test-consumer/` multi-runtime consumer workspace                            |

## Workspace Breakdown

### Root package

- Publishes `@user27828/shared-utils`
- Owns the public export map for utils, client, server, CMS, FM, and email
- Runs aggregate build and test scripts
- Publishes only `dist/**/*`, package metadata, README, license, scripts, and
  bin utilities

### `utils/`

- Shared runtime utilities
- Shared CMS, FM, and email types
- Validation, sanitization, concurrency helpers, and typed errors
- Canonical configuration and environment helpers

### `client/`

- React components, hooks, and providers
- CMS admin/public UI
- FM media-library and picker UI
- Email template preview UI
- Side-effect-free barrel plus a separate `client/init` entrypoint

### `server/`

- Service cores for CMS and FM
- Express router factories
- FM storage adapters
- Turnstile verification and middleware
- Email registry, providers, marketing helpers, and webhook router

### `test-consumer/`

- React app consumer
- Node consumer
- Vanilla JS consumer
- Test server harness

## Primary Libraries by Concern

### Shared and domain-layer utilities

- `nanoid` for identifier generation
- `lodash-es` for deep merging and option handling
- `sanitize-html` for CMS/server HTML sanitization
- `bcryptjs` for CMS password hashing
- Zod imports in CMS and FM source model files for runtime schemas and derived
  types

### Client

- `react` and `react-dom`
- `@mui/material` and `@mui/system`
- `dompurify` for browser-side sanitization
- `date-fns` and `date-fns-tz`
- `papaparse` for CSV helpers
- `prismjs` for markup/code display concerns
- Optional peer editor integrations: CKEditor 5, TinyMCE, EasyMDE, MDXEditor

### Server

- `express`
- `nodemailer`
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`
- `@aws-sdk/client-sesv2`
- `wrangler` and `@cloudflare/workers-types` for worker deployment and typing

## Build and Test Tooling

### Compilation

- TypeScript project references from the root `tsconfig.json`
- Workspace builds clear `tsconfig.tsbuildinfo` before compiling
- Output directories are workspace-specific under `dist/`

### Testing

- Client workspace uses `vitest run`
- Utils workspace uses Jest with `NODE_OPTIONS="--experimental-vm-modules"`
- Server workspace uses Jest with `NODE_OPTIONS="--experimental-vm-modules"`
- Root `yarn test` runs the three workspace test suites sequentially
- `test-consumer/` provides integration-style validation across consumption
  modes

## Distribution and Runtime Boundaries

### Published entrypoints

- Root utility barrel
- Client barrel and `client/init`
- Server barrel
- CMS shared, client, server, and public client entrypoints
- FM shared, client, server, and S3 adapter entrypoints
- Email shared, client, server, errors, and providers entrypoints

### Internal-only implementation seams

- CMS connectors are injected by consuming apps
- FM connectors and storage adapters are injected by consuming apps
- CMS and FM auth/authz are provided by host applications
- Email template preview admin endpoints are expected by the client SDK but are
  not shipped as a router in this repository

## Deployment Targets

### Browser applications

- React-based apps can consume `@user27828/shared-utils/client`
- Public CMS rendering can consume `@user27828/shared-utils/cms/client/public`

### Node/Express applications

- Can mount CMS and FM routers from the server package
- Can use email registry, providers, marketing helpers, and webhook router

### Cloudflare Workers

- Turnstile verification can be deployed through the worker factory and
  `wrangler.toml` support in `server/`

## Constraints and Conventions

- Yarn-only workflow; npm and pnpm are not the intended package managers
- ES module imports in TypeScript source must use `.js` suffixes
- `client/index.ts` stays side-effect-free for tree-shaking
- `client/init` must be imported explicitly when a consumer wants `window.log`
- `isDev()` is the canonical environment-detection helper
- CMS and FM request/response types are centralized in `utils/`
- FM supports both local and S3-like storage backends
- Client hooks are expected to abort in-flight requests when dependencies change

## Risk and Maintenance Notes

- The repo is a reusable platform package, so public export stability matters as
  much as internal correctness.
- The consumer integration workspace is part of regression coverage and should
  be treated as a supported adoption path.
- CMS and FM are extensible through injected connectors/adapters, so contract
  drift between shared types and implementation layers is a primary maintenance
  risk.
