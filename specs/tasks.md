---
title: shared-utils Cloudflare Email Provider Tasks
feature: shared-utils-email-cloudflare-provider
artifact: tasks
status: proposed-enhancement
created: 2026-05-17
updated: 2026-05-17
source: speckit.tasks
---

# Tasks: shared-utils Cloudflare Email Provider

**Input**: Design documents from `/specs/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Provider-level Jest coverage, the targeted root package-surface integration regression suite, `yarn build`, and supplemental root `yarn test` validation are required for this enhancement because the plan explicitly calls for all four gates.

**Organization**: Tasks are grouped by the Cloudflare feature user stories defined in `specs/spec.md` and aligned to the package-surface, provider-runtime, and verification requirements in `specs/plan.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`)
- Every task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Cloudflare provider code and test touchpoints in the existing brownfield email-provider surface.

- [x] T001 Add `CloudflareProviderConfig` and related provider-exported types in `server/src/email/providers/types.ts`
- [x] T002 [P] Create the Cloudflare provider module with class and factory skeletons in `server/src/email/providers/cloudflare.ts`
- [x] T003 [P] Add Cloudflare env-key fixtures, including `EMAIL_CLOUDFLARE_ZONE_ID`, and base provider test setup in `server/__tests__/email-providers.test.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared prerequisites that must exist before the runtime story and published-surface story can be finished.

**⚠️ CRITICAL**: No user story is complete until this phase is finished.

- [x] T004 [P] Add reusable Cloudflare mock-response and fetch-test helpers in `server/__tests__/email-providers.test.js`
- [x] T005 [P] Define non-sending Cloudflare `healthCheck()` semantics around `GET /zones/{zone_id}/email/sending/subdomains` plus the executable validation commands in `specs/contracts/email-cloudflare-api.md`, `specs/plan.md`, and `specs/quickstart.md`

**Checkpoint**: Shared provider scaffolding and feature-level validation semantics are ready for feature work.

---

## Phase 3: User Story 1 - Send Transactional Email Through Cloudflare (Priority: P1) 🎯 MVP

**Goal**: A platform operator can configure Cloudflare Email Service credentials and use the shared server provider abstraction to send outbound transactional email.

**Independent Test**: A mocked Cloudflare provider initializes with account, zone, and token configuration, maps `EmailMessage` fields to the documented REST payload, rejects recipient/header/size violations, reports non-sending `healthCheck()` status through the documented read-only probe, and surfaces timeout or API failures as `EmailProviderError` without requiring a live Cloudflare account.

### Tests for User Story 1

- [x] T006 [P] [US1] Add Cloudflare initialize, non-sending `healthCheck()`, send, recipient-overflow, oversize, disallowed-header, timeout, invalid-content, and API-error regression tests in `server/__tests__/email-providers.test.js`

### Implementation for User Story 1

- [x] T007 [US1] Implement Cloudflare config validation, including `zoneId`, and subpath `isConfigured()` env detection in `server/src/email/providers/cloudflare.ts` and `server/src/email/providers/types.ts`
- [x] T008 [US1] Implement Cloudflare REST payload mapping for addresses, `reply_to`, headers, attachments, required-content validation, explicit recipient-count and disallowed-header rejection, and the conservative 5 MiB size-limit enforcement in `server/src/email/providers/cloudflare.ts`
- [x] T009 [US1] Implement Cloudflare response parsing, retryability rules, and `EmailProviderError` translation in `server/src/email/providers/cloudflare.ts`
- [x] T010 [US1] Implement non-sending `healthCheck()` semantics using `GET /zones/{zone_id}/email/sending/subdomains` plus disposal behavior in `server/src/email/providers/cloudflare.ts`
- [x] T011 [US1] Document Cloudflare provider credentials, `zoneId`, Workers Paid plan requirement, conservative limits, and usage in `server/README-SERVER.md`

**Checkpoint**: The Cloudflare provider runtime works directly through the server provider abstraction and is testable without package-surface concerns.

---

## Phase 4: User Story 2 - Consume Cloudflare Provider From Published Package (Priority: P2)

**Goal**: An application developer can import the Cloudflare provider from the built package surface instead of reaching into workspace source paths.

**Independent Test**: After build, the root package export tests and distribution tests resolve both `@user27828/shared-utils/email/server/providers` and `@user27828/shared-utils/email/server/providers/cloudflare` with the expected Cloudflare exports.

### Tests for User Story 2

- [x] T012 [P] [US2] Add Cloudflare provider barrel and subpath import assertions in `__tests__/package-imports.test.js` and `__tests__/package-structure.test.js`

### Implementation for User Story 2

- [x] T013 [US2] Publish Cloudflare provider re-exports, including `isConfigured as isCloudflareProviderConfigured`, in `server/src/email/providers/index.ts`
- [x] T014 [US2] Publish Cloudflare provider subpath exports and `typesVersions` entries in `package.json`
- [x] T015 [US2] Add built-package distribution assertions for Cloudflare provider artifacts in `__tests__/server-package-distribution.test.js`

**Checkpoint**: The Cloudflare provider is consumable through the published package surface and validated by the dist/import regression harnesses.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Keep external contracts and validation docs aligned with the implemented provider.

- [x] T016 Run targeted Cloudflare provider verification with `cd server && NODE_OPTIONS="--experimental-vm-modules" yarn jest __tests__/email-providers.test.js --runInBand`
- [x] T017 Run root build verification with `yarn build` and confirm Cloudflare provider artifacts in `dist/server/src/email/providers/`
- [x] T018 Run root package regression tests with `NODE_OPTIONS="--experimental-vm-modules" yarn jest --config jest.config.mjs --runTestsByPath __tests__/package-imports.test.js __tests__/package-structure.test.js __tests__/server-package-distribution.test.js --runInBand`
- [x] T019 Run supplemental full root workspace verification using `package.json` and `yarn test`
- [x] T020 Align final Cloudflare provider docs, onboarding prerequisites, and validation notes in `specs/spec.md`, `specs/plan.md`, `specs/data-model.md`, `specs/contracts/email-cloudflare-api.md`, `specs/research.md`, and `specs/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks both user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion.
- **User Story 2 (Phase 4)**: Depends on Foundational completion.
- **Polish (Phase 5)**: Depends on the user stories you intend to ship.

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Phase 2 and delivers the core runtime value of the enhancement.
- **US2 (P2)**: Can start immediately after Phase 2 and focuses on the published package surface; it does not need a live Cloudflare integration, but it assumes the provider module exists.

### Within Each User Story

- Write the listed regression coverage before finishing the implementation tasks for that story.
- For US1, finish config detection before request mapping, and finish request mapping before health/error translation.
- For US1, implement `healthCheck()` only after the non-sending contract is defined.
- For US2, finish import/export assertions before finalizing package exports and distribution expectations.

### Parallel Opportunities

- `T002` and `T003` can run in parallel after `T001`.
- `T004` and `T005` can run in parallel after Phase 1.
- `T006` and `T012` can run in parallel after Phase 2 because they touch different test suites.
- `T011` can proceed once the Cloudflare runtime behavior stabilizes, without blocking `T013` to `T015`.
- `T016` and `T017` can run in parallel once implementation is complete.
- `T018` and `T019` can run in parallel after the build succeeds.

---

## Parallel Example: User Story 1

```bash
# After Phase 2, start runtime regression coverage and published-surface coverage in parallel:
Task: "Add Cloudflare initialize, non-sending healthCheck(), send, recipient-overflow, oversize, disallowed-header, timeout, invalid-content, and API-error regression tests in server/__tests__/email-providers.test.js"
Task: "Add Cloudflare provider barrel and subpath import assertions in __tests__/package-imports.test.js and __tests__/package-structure.test.js"
```

## Parallel Example: User Story 2

```bash
# After the package-surface assertions are in place, complete the publication work in parallel where files do not overlap:
Task: "Publish Cloudflare provider re-exports in server/src/email/providers/index.ts"
Task: "Add built-package distribution assertions for Cloudflare provider artifacts in __tests__/server-package-distribution.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Run `cd server && NODE_OPTIONS="--experimental-vm-modules" yarn jest __tests__/email-providers.test.js --runInBand`.
5. Demo direct Cloudflare provider runtime behavior before broadening to package-surface publication.

### Incremental Delivery

1. Finish Setup + Foundational to establish the provider skeleton and regression harnesses.
2. Deliver US1 to prove the provider runtime and error handling.
3. Deliver US2 to publish and validate the provider through the root package surface.
4. Run explicit verification gates (`T016` to `T019`).
5. Finish Polish to align contracts and verification notes with the shipped behavior.

### Parallel Team Strategy

1. One developer handles US1 runtime implementation in `server/src/email/providers/cloudflare.ts`.
2. One developer handles US2 export-surface work in `server/src/email/providers/index.ts`, `package.json`, and the root package regression tests.
3. Reconcile both tracks in Phase 5 with explicit verification runs and updated validation docs.

---

## Notes

- `[P]` tasks target different files and can be worked in parallel safely.
- The task list now maps directly to the Cloudflare feature scope defined in `specs/spec.md`.
- The key validation commands for completion are the targeted server provider test command, the root integration-project package-surface regression command, `yarn build`, and supplemental `yarn test`.
