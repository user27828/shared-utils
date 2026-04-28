---
title: shared-utils Current State Implementation Plan
feature: shared-utils-current-state
artifact: plan
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# Implementation Plan: shared-utils Current State

**Branch**: `[current-state-baseline]` | **Date**: 2026-04-28 | **Spec**: `/specs/spec.md`  
**Input**: Feature specification from `/specs/spec.md`

**Note**: This plan documents the current repository state in stock Spec-Kit
shape. It is a normalization artifact for future Spec-Kit workflows, not a new
feature implementation brief.

## Summary

The repository is a Yarn-workspaces TypeScript monorepo that publishes a single
library package with layered utilities, client UI, and server helpers. The
current planning goal is to express the existing CMS, FM, email, and Turnstile
surfaces in stock Spec-Kit artifacts so later `/speckit.tasks` or brownfield
work can consume conventional `spec.md`, `plan.md`, `data-model.md`,
`contracts/`, and `quickstart.md` inputs.

## Technical Context

**Language/Version**: TypeScript 6 source compiled to ES modules for Node.js 18+ and browser consumers  
**Primary Dependencies**: React 19, MUI 7, Express 5, lodash-es, nanoid, DOMPurify, sanitize-html, Nodemailer, AWS SDK modules  
**Storage**: File-based dist outputs, consumer-provided CMS/FM persistence backends, and local or S3-compatible FM object storage  
**Testing**: Vitest for the client workspace, Jest with ES module support for utils and server, plus `test-consumer/` integration coverage  
**Target Platform**: Browser applications, Node/Express servers, and optional Cloudflare Worker deployment for Turnstile  
**Project Type**: Reusable library monorepo with shared types, browser UI, and server integration surfaces  
**Performance Goals**: Library-grade correctness, predictable reuse across host apps, responsive client admin workflows, and cache-aware public content/media delivery  
**Constraints**: Yarn-only workflow, ESM `.js` import suffixes in source, side-effect-free client barrel, injected persistence/auth/provider seams, stock Spec-Kit artifact compatibility  
**Scale/Scope**: One published package spanning shared utilities, CMS, FM, email previewing, and Turnstile, with multi-runtime consumer support through `test-consumer/`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Current state:

- `.specify/memory/constitution.md` is now ratified as the repository’s
  top-level engineering policy.
- The governing principles are:
  - contract-first library surfaces
  - layered domain boundaries and injection
  - explicit runtime and side-effect boundaries
  - typed contracts, validation, and failure discipline
  - verification across workspaces and consumers

Implication for this plan:

- **Gate status**: pass.
- This documentation-baseline plan complies because it records the existing
  package surface, respects the layered architecture, and keeps Spec-Kit
  artifacts aligned with the actual repository contract.
- Future implementation plans should cite concrete evidence for each
  constitution gate rather than treating this section as a placeholder.

## Project Structure

### Documentation (this feature)

```text
specs/
├── spec.md               # Stock Spec-Kit-compatible feature specification
├── plan.md               # Stock Spec-Kit-compatible implementation plan
├── quickstart.md         # Validation scenarios for the current baseline
├── data-model.md         # Domain entities and relationships
├── tech_stack.md         # Focused stack and tooling snapshot
├── product_spec.md       # Richer product-oriented current-state narrative
├── technical_spec.md     # Richer architecture-oriented current-state narrative
├── contracts/
│   ├── cms-http.md
│   ├── fm-http.md
│   └── email-http.md
└── tasks.md              # Future `/speckit.tasks` output if generated
```

### Source Code (repository root)

```text
.
├── utils/
│   ├── src/
│   │   ├── cms/
│   │   ├── fm/
│   │   ├── email/
│   │   ├── log.ts
│   │   ├── options-manager.ts
│   │   ├── turnstile.ts
│   │   └── functions.ts
│   └── index.ts
├── client/
│   ├── src/
│   │   ├── cms/
│   │   ├── fm/
│   │   ├── email/
│   │   ├── components/
│   │   └── helpers/
│   └── index.ts
├── server/
│   ├── src/
│   │   ├── cms/
│   │   ├── fm/
│   │   ├── email/
│   │   ├── turnstile/
│   │   └── express/
│   └── index.ts
├── test-consumer/
├── data/
├── doc/
└── specs/
```

**Structure Decision**: The repository is a library monorepo with three core
implementation workspaces (`utils`, `client`, `server`) plus an integration
consumer workspace. The documentation structure is rooted directly under
`specs/` rather than a numbered feature subdirectory because this artifact is a
current-state baseline spanning the whole repository.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                                                          | Why Needed                                                                                      | Simpler Alternative Rejected Because                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Specs rooted directly in `specs/` instead of `specs/[###-feature]` | This baseline documents the whole brownfield repository rather than one numbered feature branch | Forcing an arbitrary feature-number directory would misrepresent the current artifact scope |
