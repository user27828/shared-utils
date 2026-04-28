---
title: shared-utils Current State Quickstart
feature: shared-utils-current-state
artifact: quickstart
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# Quickstart: shared-utils Current State Validation

## Purpose

This document defines concrete validation scenarios for the repository’s
current-state surfaces so future Spec-Kit planning or brownfield work has a
practical baseline.

## Prerequisites

- Node.js 18+
- Yarn 4
- Repository dependencies installed
- For consumer-flow validation, any required environment variables or provider
  credentials configured by the host application

## Baseline Repository Validation

### 1. Build the published package surfaces

Run:

```bash
yarn build
```

Expected result:

- `dist/utils`, `dist/client`, and `dist/server` are generated successfully.
- The root export map resolves to built artifacts rather than workspace source
  files.

### 2. Run workspace tests

Run:

```bash
yarn test
```

Expected result:

- Client Vitest suite passes.
- Utils Jest suite passes.
- Server Jest suite passes.

## Domain Validation Scenarios

### CMS validation

#### Scenario A: Admin list and edit flow

Validation steps:

1. Mount `createCmsAdminRouter()` in a host Express app with a working
   `CmsServiceCore`, connector, and authz adapter.
2. Open the CMS list view or call the admin list endpoint.
3. Create a content item, edit it, and save it twice.

Expected result:

- Listing supports search and status filtering.
- Created content persists as a draft row.
- Re-saving the item increments version state and preserves metadata/history.

#### Scenario B: Conflict detection

Validation steps:

1. Fetch the same CMS item twice.
2. Update it once using the current ETag.
3. Attempt a second update with the stale ETag.

Expected result:

- The stale update is rejected as a precondition/concurrency failure.
- The client/admin UI can surface the conflict instead of silently overwriting.

#### Scenario C: Public rendering and unlock flow

Validation steps:

1. Mount `createCmsPublicRouter()`.
2. Publish one public item and one password-protected item.
3. Fetch the public item through the public route.
4. Attempt to fetch the protected item without a token, then unlock it and
   retry.

Expected result:

- Public item returns a normalized public payload.
- Protected item initially reports password requirement.
- Unlock endpoint returns a token and expiration.
- Retrying with the unlock token succeeds.

### FM validation

#### Scenario D: Upload init/finalize flow

Validation steps:

1. Mount `createFmRouter()` with a working `FmServiceCore`, connector, storage
   adapter, and authz adapter.
2. Start an upload with `/upload/init`.
3. Complete either the direct finalize path or the proxied upload path.
4. List files and fetch the uploaded file metadata.

Expected result:

- Upload init returns a file UID plus either presigned or proxied instructions.
- Finalization persists a canonical `FmFileRow`.
- The uploaded file appears in list results and can be queried individually.

#### Scenario E: Variants and delivery

Validation steps:

1. Upload an image asset.
2. Generate or upload one or more variants.
3. Resolve content through public media and authenticated content routes.
4. Request a missing variant kind or width-based variant.

Expected result:

- Variant rows are stored and discoverable.
- Public files resolve through the public media route.
- Private files resolve only through the authenticated content route.
- Missing variant requests can fall back to the original when enabled.

#### Scenario F: File lifecycle and link safety

Validation steps:

1. Create a file link to a consuming entity.
2. Attempt to delete the file without force.
3. Archive, restore, move, and then hard-delete the file.

Expected result:

- Non-force delete follows the router/service policy rather than blindly
  removing linked data.
- Archive and restore preserve the file record lifecycle.
- Move updates storage location while keeping the file addressable.

### Email validation

#### Scenario G: Preview API compatibility

Validation steps:

1. Provide a consumer admin API compatible with `EmailTemplateClient`.
2. Load the template list, open a template detail view, and change preview
   fixtures.
3. Trigger a test-send request if the consumer implements it.

Expected result:

- The list endpoint returns `EmailTemplateSummary[]`.
- The detail endpoint returns `EmailTemplateDetail`.
- Preview returns subject, HTML, and plain text in the expected envelope.
- Test-send can be queued through the expected endpoint contract.

#### Scenario H: Webhook router

Validation steps:

1. Mount `createWebhookRouter()` before JSON/body parsers.
2. Send a provider readiness GET request.
3. Send a signed POST webhook payload for a supported provider.

Expected result:

- GET returns either a readiness payload or a challenge echo.
- POST verifies the signature, parses provider events, and dispatches typed
  webhook events.

### Turnstile validation

#### Scenario I: Browser render + server verification split

Validation steps:

1. In a browser app, import and configure the shared Turnstile helper from the
   utils package.
2. Render a widget and capture a token.
3. Verify the token server-side with `verifyTurnstileToken()` or
   `createTurnstileMiddleware()`.

Expected result:

- Browser rendering loads the Turnstile script and produces a widget token.
- Server-side verification checks the token against Cloudflare.
- Optional expected action and expected hostname checks fail closed when the
  response does not match configured values.

## Consumer Integration Validation

### 3. Run consumer-level checks

Recommended targeted commands:

```bash
cd test-consumer && yarn test:react
cd test-consumer && yarn test:node
cd test-consumer && yarn test:vanilla
cd test-consumer && yarn test:server
```

Expected result:

- The package works across React, Node, vanilla browser-style, and server-side
  consumer contexts.

Note:

- `test-consumer` also exposes `yarn test:all`, but the repo’s guidance notes
  that some consumer workflows may need timeouts or forced shutdown depending on
  how Vite-based flows are exercised.

## Validation Outcome Checklist

- Package builds cleanly from the monorepo.
- Shared export surfaces resolve from the published artifact layout.
- CMS admin and public flows behave as documented.
- FM upload, variant, delivery, and lifecycle flows behave as documented.
- Email preview client expectations match the consuming API contract.
- Email webhooks verify and dispatch correctly.
- Turnstile browser/server responsibilities remain cleanly separated.
