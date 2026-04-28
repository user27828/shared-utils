---
title: shared-utils Current State Feature Specification
feature: shared-utils-current-state
artifact: spec
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# Feature Specification: shared-utils Current State

**Feature Branch**: `[current-state-baseline]`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: Current-state specification derived from the existing repository and published package surfaces.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Integrate Shared Surfaces (Priority: P1)

An application developer installs the package once and integrates only the
surfaces needed for the host app, such as shared utilities, client components,
CMS, FM, email previewing, or server helpers.

**Why this priority**: This is the foundational value of the repository. If the
package cannot be consumed cleanly as a library, the rest of the domain
features lose their utility.

**Independent Test**: A host application can import targeted subpath entrypoints
for utilities, client, server, CMS, FM, and email without copying repository
source files or depending on unpublished workspace paths.

**Acceptance Scenarios**:

1. **Given** a consuming application installs the published package, **When** it
   imports specific subpaths such as the CMS, FM, or client barrels, **Then**
   the expected public APIs are available from the published export surface.
2. **Given** a browser application wants client-side logging, **When** it imports
   the explicit `client/init` entrypoint, **Then** browser-side logger setup
   occurs without requiring side effects from the main client barrel.

---

### User Story 2 - Manage Content and Media (Priority: P1)

A content administrator or editor manages CMS content, edits metadata and body
content, preserves revision history, and reuses FM assets from a shared media
library during authoring.

**Why this priority**: CMS and FM together represent the deepest shared product
surface in the repository and cover the highest-value admin workflows.

**Independent Test**: An administrator can list content, edit and publish an
item, detect conflicts, and select FM media from a reusable picker during the
same authoring workflow.

**Acceptance Scenarios**:

1. **Given** a CMS administrator opens the content list, **When** they filter,
   search, or switch between draft, published, and trash states, **Then** the
   list reflects the expected content slice.
2. **Given** an editor opens a CMS item, **When** they modify metadata, body
   content, version notes, or publication state, **Then** the system preserves
   version-aware state and detects conflicting concurrent edits.
3. **Given** an editor needs an asset inside CMS content, **When** they open the
   FM picker and select a file or variant, **Then** the selected media is
   returned as a structured FM asset rather than an ad hoc blob reference.

---

### User Story 3 - Deliver Public Content and Media (Priority: P2)

A public site visitor accesses published content and media through lightweight
public client and server surfaces, including password-protected content when
applicable.

**Why this priority**: Public delivery is a distinct downstream slice of value,
but it depends on authoring and asset-management workflows being present first.

**Independent Test**: A public-facing application can fetch and render
published content, handle protected-content unlocks, and resolve media through
public or authenticated delivery endpoints.

**Acceptance Scenarios**:

1. **Given** a published CMS page exists, **When** a public client fetches it,
   **Then** the client receives a normalized public payload suitable for
   rendering.
2. **Given** a page is password protected, **When** a visitor submits the
   correct password, **Then** the system exchanges it for an unlock token and
   allows the content to be fetched.
3. **Given** a public or authenticated media request is made, **When** the FM
   delivery routers resolve the asset, **Then** the correct original or variant
   content is served or redirected according to visibility and storage mode.

---

### User Story 4 - Preview Email Templates (Priority: P2)

An email operator browses registered templates, chooses preview fixtures,
inspects HTML and plain-text output, and optionally sends a test email through
consumer-provided admin endpoints.

**Why this priority**: Email previewing is a reusable workflow, but it is more
specialized than the CMS/FM core package surfaces.

**Independent Test**: A compatible admin API can drive the list, detail,
preview, and test-send flows expected by the shipped email client SDK and UI.

**Acceptance Scenarios**:

1. **Given** templates are registered in a host application, **When** the email
   list page loads, **Then** operators can filter and open individual template
   previews.
2. **Given** a selected template exposes preview fixtures, **When** an operator
   changes the fixture, **Then** the preview updates with subject, HTML, and
   plain-text output for that fixture.
3. **Given** a compatible test-send endpoint exists, **When** the operator
   triggers a test send, **Then** the UI can queue the request using the same
   selected fixture context.

---

### User Story 5 - Configure Platform and Verification Flows (Priority: P3)

A platform operator configures shared runtime behavior such as global options,
environment loading, Turnstile verification, email webhooks, and storage or
provider adapters.

**Why this priority**: These capabilities are critical for deployment and
operations, but they depend on the core library surfaces and domain contracts
already being in place.

**Independent Test**: A host application can wire the exported server/browser
helpers and verify that environment loading, Turnstile verification, and email
webhook handling operate through the documented seams.

**Acceptance Scenarios**:

1. **Given** global configuration is applied through the shared options manager,
   **When** utilities such as logging or Turnstile access their configuration,
   **Then** they read from a centralized option space.
2. **Given** a browser app renders a Turnstile widget and a server verifies the
   resulting token, **When** the token is submitted, **Then** verification
   occurs through the strict server-side path.
3. **Given** provider webhooks are mounted, **When** signed webhook payloads are
   posted to the email webhook router, **Then** the router verifies and parses
   them before dispatching typed events.

### Edge Cases

- What happens when a CMS item is updated with a stale ETag?
- How does the system handle password-protected content when the unlock token is
  missing, stale, or from a different content item?
- What happens when an FM variant is requested but only the original file is
  available?
- How does the system handle deleting or moving FM files that are still linked
  from consuming entities?
- What happens when the email preview client is configured against a consumer
  API that does not match the expected envelope or endpoint shape?
- How does the system handle Turnstile verification timeouts or hostname/action
  mismatches?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST publish one installable package with stable
  subpath exports for shared utilities, client UI, server helpers, CMS, FM, and
  email preview surfaces.
- **FR-002**: The system MUST centralize cross-cutting configuration through a
  shared options-management pattern.
- **FR-003**: Application developers MUST be able to consume targeted subpaths
  without depending on workspace source folders.
- **FR-004**: CMS administrators MUST be able to list, create, update,
  publish, trash, restore, and permanently clear content through reusable
  package surfaces.
- **FR-005**: CMS editing MUST preserve revision history, version metadata, and
  conflict detection for concurrent edits.
- **FR-006**: CMS authoring MUST support reuse of FM assets through a shared
  file-picker and media-library workflow.
- **FR-007**: Public CMS consumers MUST be able to fetch and render published
  content through a lightweight public client surface.
- **FR-008**: Password-protected CMS content MUST require an explicit unlock
  exchange before protected content is returned.
- **FR-009**: FM users MUST be able to upload, browse, filter, sort, rename,
  tag, archive, restore, move, preview, and delete files.
- **FR-010**: FM MUST support original files, derived variants, and durable
  link records to consuming entities.
- **FR-011**: Email operators MUST be able to browse registered templates,
  select preview fixtures, inspect HTML and plain-text output, and optionally
  trigger test sends through compatible consumer endpoints.
- **FR-012**: Platform operators MUST be able to use exported helpers for
  environment loading, Turnstile verification, email webhook handling, and
  storage/provider integration.

### Key Entities _(include if feature involves data)_

- **Global option space**: Shared configuration categories consumed by logging,
  Turnstile, environment loading, and utility helpers.
- **CMS content item**: A versioned content record with metadata, body,
  publication state, and public-delivery projections.
- **CMS revision**: A historical snapshot of a CMS item used for restore and
  audit flows.
- **FM file**: The canonical record for an uploaded asset, including ownership,
  storage location, visibility, and purpose.
- **FM variant**: A derived asset associated with an original file and a named
  variant kind.
- **FM file link**: A durable relationship between a file and a consuming
  entity.
- **Email template**: A registered message definition with catalog metadata and
  preview fixtures.
- **Email preview fixture**: A named scenario supplying props for preview or
  test-send flows.
- **Email render result**: The rendered subject, HTML, text, warnings, and
  metadata produced by a template preview.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A consuming application can adopt at least one shared-utils
  domain surface through the published package without copying source files from
  the repository.
- **SC-002**: A content team can complete the CMS lifecycle of list, edit,
  publish, trash, restore, and history review using the reusable package
  surfaces.
- **SC-003**: A public-facing application can render published CMS content and
  gate protected content through the documented unlock flow.
- **SC-004**: A media workflow can use the FM surface for both administrative
  management and asset selection, including original and variant-aware choices.
- **SC-005**: A compatible admin email API can satisfy the shipped email client
  and UI expectations for listing templates, previewing fixtures, and issuing a
  test send.

## Assumptions

- Host applications provide persistence adapters, auth/authz, route mounting,
  and any project-specific business data not owned by the package.
- CMS and FM are intended to be embedded as reusable product surfaces inside
  larger applications rather than operated as standalone hosted products.
- Email template previewing depends on consumer-provided admin endpoints because
  the repository ships the client SDK and registry utilities but not a preview
  router.
- Current-state documentation is the goal of this artifact; it is not proposing
  a new greenfield feature beyond documenting what already exists.
