---
title: shared-utils Current State Technical Specification
feature: shared-utils-current-state
artifact: technical-spec
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# Technical Specification: shared-utils Current State

**Created**: 2026-04-28  
**Status**: Current-state baseline  
**Scope**: Monorepo architecture, data models, component hierarchy, and source traceability

## Summary

This repository is a Yarn workspaces TypeScript monorepo that publishes a single
consumer package, `@user27828/shared-utils`, backed by three implementation
workspaces:

- `utils/` for shared runtime utilities, shared domain types, validation, and
  error models.
- `client/` for React components, hooks, providers, and browser-side helpers.
- `server/` for service cores, Express router factories, storage adapters,
  email providers, environment loading, and Turnstile verification.

The dominant architectural pattern is layered domain packaging:

- Shared domain contracts live in `utils/src/<domain>/`.
- Server orchestration lives in `server/src/<domain>/`.
- Client SDKs and UI live in `client/src/<domain>/`.

The two deepest feature domains are CMS and FM. Email previewing is a third,
lighter domain. Cross-cutting concerns such as configuration, environment
resolution, logging, and Turnstile are centralized in `utils/` and `server/`.

## Supporting Artifacts

The current-state architecture described here is supplemented by the following
Spec-Kit-style support artifacts in this directory:

- [tech_stack.md](./tech_stack.md) for a focused stack and tooling snapshot
- [data-model.md](./data-model.md) for normalized domain-model definitions and
  relationships
- [contracts/cms-http.md](./contracts/cms-http.md) for the shipped CMS HTTP
  contract
- [contracts/fm-http.md](./contracts/fm-http.md) for the shipped FM HTTP
  contract
- [contracts/email-http.md](./contracts/email-http.md) for the email client and
  webhook contract surfaces

These files are meant to reduce the need to mine this document for every
contract or entity question.

## Trace Method

This document was built by tracing the repository in both directions.

- Forward trace: published package exports -> barrel files -> hooks/clients/
  components -> service cores/connectors/adapters -> shared schemas.
- Reverse trace: service cores and UI shells -> local barrels -> root package
  exports in `package.json`.

Primary source anchors used for tracing:

- `package.json`
- `client/index.ts`
- `server/index.ts`
- `utils/index.ts`
- `utils/src/cms/types.ts`
- `utils/src/fm/types.ts`
- `utils/src/email/types.ts`
- `server/src/cms/CmsServiceCore.ts`
- `server/src/fm/FmServiceCore.ts`
- `server/src/email/registry.ts`
- `client/src/cms/ui/CmsListPage.tsx`
- `client/src/cms/ui/CmsEditPage.tsx`
- `client/src/cms/ui/CmsPasswordGate.tsx`
- `client/src/fm/components/FmMediaLibrary.tsx`
- `client/src/fm/components/FmFilePicker.tsx`
- `client/src/email/ui/EmailTemplateListPage.tsx`
- `client/src/email/ui/EmailTemplateDetailPage.tsx`

## Technical Context

### Runtime and Build

- Language: TypeScript with ES module output and `.js` import suffixes in
  source.
- Monorepo: Yarn workspaces with project references from the root
  `tsconfig.json`.
- Build output: compiled artifacts emitted into `dist/` and published from the
  root package.
- Client runtime: React 19 plus MUI-based UI components.
- Server runtime: Node 18+ with Express 5 and optional Cloudflare Worker
  deployment for Turnstile.

### Tooling

- Root build: `yarn build`
- Root tests: `yarn test`
- Consumer integration harness: `test-consumer/` with React, Node, server, and
  vanilla JS usage examples.
- Client tests: Vitest
- Server and utils tests: Jest with ES module support

### Core Libraries In Use

- React and React DOM for client UI
- MUI for component primitives and layout
- Zod in source model files for CMS and FM schema contracts
- nanoid for generated identifiers
- lodash-es for deep option merging and shared utility work
- sanitize-html and DOMPurify for content sanitation
- date-fns and date-fns-tz for date utilities
- Nodemailer and AWS SDK modules for server email/storage integrations

## Project Structure

### Published Package Surface

The root package exports domain-specific entrypoints instead of exposing raw
workspace source folders. Key public surfaces are:

- `.` and `./utils` -> shared runtime utilities
- `./client` and `./client/init` -> reusable browser-side UI and setup
- `./server` -> server helpers and shared server exports
- `./cms`, `./cms/server`, `./cms/client`, `./cms/client/public`
- `./fm`, `./fm/server`, `./fm/client`, `./fm/server/s3`
- `./email`, `./email/server`, `./email/client`

### Implementation Layout

```text
shared-utils/
|- utils/
|  |- src/
|  |  |- cms/
|  |  |- fm/
|  |  |- email/
|  |  |- log.ts
|  |  |- options-manager.ts
|  |  |- turnstile.ts
|  |  `- functions.ts
|  `- index.ts
|- client/
|  |- src/
|  |  |- cms/
|  |  |- fm/
|  |  |- email/
|  |  |- components/
|  |  `- helpers/
|  `- index.ts
|- server/
|  |- src/
|  |  |- cms/
|  |  |- fm/
|  |  |- email/
|  |  |- turnstile/
|  |  `- express/
|  `- index.ts
`- test-consumer/
```

## Architecture Overview

### Cross-Cutting Foundations

#### Options and environment

- `utils/src/options-manager.ts` provides the global `optionsManager`
  singleton used to register utility-specific option managers and apply shared
  config.
- `server/src/env.ts` eagerly loads environment data and stores the computed
  `ENV` object into the global options space.
- `utils/src/functions.ts` provides `isDev()` for unified environment
  detection rather than ad hoc `window` or `NODE_ENV` checks.

#### Logging

- `utils/src/log.ts` is the canonical logging wrapper.
- `client/src/init.ts` exists as a separate side-effect entrypoint to attach
  `window.log` without polluting the side-effect-free client barrel.
- `server/index.ts` also attaches the shared logger to `globalThis` if needed.

#### Turnstile

- Browser-side widget orchestration is kept in `utils/src/turnstile.ts`.
- Server-side verification, middleware, and worker factory live in
  `server/src/turnstile/`.
- This is an intentional browser/server split, not one polymorphic module.

### Domain Layering Pattern

```text
Shared Contracts (utils/src/<domain>/)
        |
        v
Server Core + Adapters (server/src/<domain>/)
        |
        v
Client API + Provider + Hooks + UI (client/src/<domain>/)
```

This pattern is strongest in CMS and FM, where the server package supplies the
business core and the client package supplies reusable UI shells.

## Data Models

### CMS Data Model

Source: `utils/src/cms/types.ts`

#### Core enums

- `CMS_POST_TYPES`: `post`, `page`, `general`, `faq`, `blog`, `embed`,
  `data`, `docs`, `kb`, `other`
- `CMS_STATUS`: `draft`, `published`, `trash`
- `CMS_CONTENT_TYPES`: `text/html`, `text/markdown`, `application/json`,
  `text/plain`

#### Primary entities

| Entity             | Purpose                                    | Key fields                                                                                                                                                                  |
| ------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CmsHeadRow`       | Current canonical content row              | `uid`, `title`, `content`, `content_type`, `slug`, `locale`, `post_type`, `tags`, `status`, `etag`, `version_number`, publish timestamps, lock fields, trash/archive fields |
| `CmsHistoryRow`    | Immutable revision snapshot metadata       | `id`, `cms_uid`, `revision`, `snapshot`, `created_by`, soft-delete metadata                                                                                                 |
| `CmsMetadata`      | Structured metadata bag stored on head row | `version`, `notes`                                                                                                                                                          |
| `CmsVersionMeta`   | Revision-specific annotation               | `version`, `notes`, `dt_updated`, `user_uid`                                                                                                                                |
| `CmsContentNote`   | Persistent content annotation              | `note`, `dt_updated`, `user_uid`                                                                                                                                            |
| `CmsPublicPayload` | Normalized public render payload           | `uid`, `post_type`, `locale`, `slug`, `title`, `content_type`, rendered content fields                                                                                      |
| `CmsPublicHead`    | Lightweight public preflight row           | `uid`, `post_type`, `locale`, `slug`, `status`, `etag`, password fields, publish fields                                                                                     |

#### Request/response DTOs

- `CmsCreateRequest`
- `CmsUpdateRequest`
- `CmsListRequest`
- `CmsPublishRequest`
- `CmsListResponse`

#### Behavioral implications from the model

- CMS content supports optimistic concurrency through `etag` and
  `version_number`.
- Password protection is modeled directly on the head row through
  `password_hash` and `password_version`.
- Version notes and content notes are deliberately separated.
- Trash and archive states are represented in row metadata, not by removing the
  content immediately.

### FM Data Model

Source: `utils/src/fm/types.ts`

#### Core enums

- `FM_PURPOSES`: `resume`, `job`, `cms_asset`, `cms_b64`, `avatar`, `generic`
- `FM_VISIBILITY`: `private`, `public`
- `FM_VARIANT_KINDS`: `original`, `thumb`, `preview`, `web`

#### Primary entities

| Entity              | Purpose                                          | Key fields                                                                                                                                        |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FmFileRow`         | Canonical file record                            | `uid`, owner/creator fields, filenames, title, alt text, tags, storage location/key, size, mime, sha256, public flag, purpose, archive timestamps |
| `FmFileVariantRow`  | Derived media asset record                       | `uid`, `variant_of_uid`, `variant_kind`, dimensions, transform, storage location/key, mime, size                                                  |
| `FmFileLinkRow`     | Relationship between a file and consuming entity | `file_uid`, `linked_entity_type`, `linked_entity_uid`, `linked_field`                                                                             |
| `FmObjectRef`       | Storage object address                           | `bucket`, `objectKey`                                                                                                                             |
| `FmDestinationHint` | Client hint for upload placement                 | `bucket`, `prefix`                                                                                                                                |

#### Upload DTOs

- `FmUploadInitRequest` and `FmUploadInitResponse`
- `FmUploadFinalizeRequest` and `FmUploadFinalizeResponse`
- `FmVariantUploadInitRequest` and `FmVariantUploadInitResponse`
- `FmVariantUploadFinalizeRequest` and `FmVariantUploadFinalizeResponse`

#### Behavioral implications from the model

- FM treats original files and variants as separate persisted rows.
- Uploads are two-phase: init followed by finalize.
- Visibility is modeled independently from purpose.
- Links are first-class so other domains can reason about file ownership and
  usage.

### Email Data Model

Sources: `utils/src/email/types.ts`, `server/src/email/registry.ts`

| Entity                         | Purpose                               | Key fields                                                                                           |
| ------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `EmailTemplateSummary`         | List-level template metadata          | `uid`, `name`, `category`, `description`, `sendScenarios`, `tags`, `fixtureCount`                    |
| `EmailTemplateDetail`          | Detail view metadata                  | summary fields plus `previewFixtures`                                                                |
| `EmailPreviewFixture`          | Named preview scenario for a template | `uid`, `label`, `description`, `props`                                                               |
| `EmailRenderResult`            | Canonical rendered output             | `subject`, `html`, `text`, `warnings`, `metadata`                                                    |
| `EmailTemplatePreviewRequest`  | Preview query payload                 | `fixtureUid`, `propsOverride`                                                                        |
| `EmailTemplatePreviewResponse` | Preview result with template context  | `template`, `fixtureUid`, `subject`, `html`, `text`, `warnings`, `metadata`                          |
| `EmailTemplateDescriptor`      | Server-side registry definition       | summary fields, preview fixtures, delivery metadata, `buildSubject`, optional `buildText`, component |

#### Delivery addressing model

The server registry supports three delivery-address shapes:

- raw string email address
- structured `{ email, name }`
- setting reference such as `{ setting: "noReplyEmail" }`

## Server Domain Architecture

### CMS Server Stack

```text
createCmsAdminRouter / createCmsPublicRouter
                |
                v
          CmsServiceCore
                |
                v
            CmsConnector
```

#### `CmsServiceCore` responsibilities

Verified in `server/src/cms/CmsServiceCore.ts`:

- create, update, publish, trash, restore, delete, and history restore flows
- Zod-based request parsing
- slug canonicalization and locale normalization
- post type and content type validation
- optimistic concurrency via ETag checks
- password hashing and password versioning
- history snapshot creation before destructive or versioning operations
- best-effort `onAfterWrite` hooks for downstream integrations

#### CMS server seams

- persistence is injected through `CmsConnector`
- public-head optimization is optional through `CmsConnectorWithPublicHead`
- authz, routing, and unlock-token issuance are composed around the service core

### FM Server Stack

```text
createFmRouter / createFmPublicRouter / createFmContentRouter
                         |
                         v
                    FmServiceCore
                  /               \
                 v                 v
            FmConnector      FmStorageAdapter
```

#### `FmServiceCore` responsibilities

Verified in `server/src/fm/FmServiceCore.ts`:

- upload init/finalize for originals and variants
- direct and proxied upload support
- object-key generation and folder sanitization
- MIME sniffing and image-dimension inspection
- local SHA-256 hashing and hash acceptance for non-local flows
- archive, restore, hard delete, move, and link management
- best-variant selection for `thumb`, `preview`, and `web`
- canonical/public/signed URL resolution for downstream clients

#### FM server seams

- persistence is injected through `FmConnector`
- object storage is injected through `FmStorageAdapter`
- built-in adapters cover local storage and S3-compatible storage
- write hooks allow cross-domain integrations, especially CMS-to-FM link sync

### Email Server Stack

```text
Email template admin endpoints
            |
            v
  EmailTemplateRegistry + provider utilities
```

Verified in `server/src/email/registry.ts` and `server/src/email/index.ts`:

- the registry is descriptor-driven
- list and detail views are derived from the same descriptor set
- preview fixtures are intentionally first-class
- provider implementations and marketing/webhook utilities are separate from
  the registry itself

## Client Component Hierarchy

### CMS Admin Surface

#### `CmsListPage`

Source: `client/src/cms/ui/CmsListPage.tsx`

```text
CmsListPage
|- Header actions
|  |- Refresh
|  `- New
|- Search field
|- Tabs: All / Draft / Published / Trash
|- Bulk action strip
|  |- Restore selected
|  `- Empty trash
`- Result list with selection and row actions
```

Observed behavior:

- debounced search via `useDebouncedValue`
- tab-driven status filtering
- bulk restore and empty-trash actions wired through `CmsApi`
- host application is expected to provide navigation and toast adapters

#### `CmsEditPage`

Source: `client/src/cms/ui/CmsEditPage.tsx`

```text
CmsEditPage
|- CmsHistoryDrawer
`- Main content shell
   |- Header and navigation actions
   |- Status and publish controls
   |- Metadata section
   |  |- title
   |  |- slug
   |  |- locale
   |  |- post type
   |  `- tags
   |- Body editing section
   |  `- CmsBodyEditor
   |- Versioning controls
   |  `- CmsVersionNotesForm
   |- Content notes
   |  `- CmsContentNotes
   |- Media picker integration
   |  `- injected FM picker config
   `- Dialogs
      |- CmsConflictDialog
      `- content-type change dialog
```

Observed behavior:

- two-column editing shell with history sidebar
- form dirty tracking via debounced epoch updates rather than diffing all fields
- lazy history loading when the drawer opens
- optimistic concurrency conflict handling with overwrite option
- media selection delegated through injected config and `useFmApi()`

### CMS Public Surface

Sources: `client/src/cms/public.ts`, `client/src/cms/ui/CmsPasswordGate.tsx`

```text
useCmsPublic
   |
   +-> CmsPasswordGate (when protected)
   `-> CmsBodyRenderer (when payload available)
```

Observed behavior:

- the public barrel intentionally excludes editor-heavy dependencies
- password-protected content uses an explicit unlock form and token callback
- rendered content is delivered as normalized public payload, not raw admin row

### FM Surface

#### `FmFilePicker`

Source: `client/src/fm/components/FmFilePicker.tsx`

```text
Dialog
`- FmMediaLibrary
```

The picker is intentionally thin. All substantive FM UI behavior lives inside
`FmMediaLibrary`.

#### `FmMediaLibrary`

Source: `client/src/fm/components/FmMediaLibrary.tsx`

```text
FmMediaLibrary
|- Toolbar and filters
|  |- search
|  |- archived/public filters
|  |- sort and page-size controls
|  `- view mode toggles
|- Result surface
|  |- list view
|  `- grid view
|- Bulk action controls
|  |- archive
|  |- restore
|  |- delete
|  `- move
|- Upload workflow
|  |- drag/drop state
|  |- upload queue
|  `- progress reporting
|- Detail drawer
|  |- metadata editing
|  |- tag editing
|  |- link inspection
|  `- rename flow
`- Expanded viewers
   |- FmImageViewer
   `- FmVideoViewer
```

Observed behavior:

- persisted local view settings in `localStorage`
- debounced search through `useDebouncedValue`
- list retrieval through `useFmListFiles`
- active-detail drawer loads file metadata and linked-entity data lazily
- upload flow tracks per-item progress and supports both direct and proxied
  transport modes
- picker mode passes `onSelect` through to callers and enables variant-aware
  selection

### Email Preview Surface

Sources: `client/src/email/index.ts`,
`client/src/email/ui/EmailTemplateListPage.tsx`,
`client/src/email/ui/EmailTemplateDetailPage.tsx`

```text
EmailTemplateListPage
`- open selected template
   `- EmailTemplateDetailPage
      |- template metadata panel
      |- fixture selector
      `- EmailPreviewTabs
         |- EmailHtmlPreviewFrame
         `- EmailTextPreviewPanel
```

Observed behavior:

- list page supports category and free-text filtering
- detail page binds fixture selection to preview output
- preview tabs expose both HTML and text render results
- optional send-test-email action is supported at the page level

## Core Runtime Flows

### Flow 1: CMS authoring and publishing

```text
CmsListPage / CmsEditPage
        -> CmsClient
        -> admin router
        -> CmsServiceCore
        -> CmsConnector
        -> CmsHistoryRow snapshot + CmsHeadRow update
        -> optional after-write hook
```

Important invariants:

- every update is validated against the current ETag
- publish increments version metadata and persists publication timestamps
- slug changes on already-published content require explicit confirmation

### Flow 2: CMS public rendering and unlock

```text
useCmsPublic
    -> public router
    -> CmsServiceCore public read path
    -> CmsPublicPayload
    -> CmsPasswordGate if unlock required
    -> CmsBodyRenderer once unlocked
```

Important invariants:

- public rendering uses normalized payloads, not raw admin rows
- password-protected content uses an explicit unlock token handoff

### Flow 3: FM upload lifecycle

```text
FmMediaLibrary upload queue
    -> FmApi init upload
    -> server init route
    -> FmServiceCore initUpload
    -> storage adapter presign or proxied target
    -> client upload transfer
    -> FmApi finalize upload
    -> FmServiceCore finalize path
    -> FmFileRow + FmFileVariantRow persistence
```

Important invariants:

- object placement is purpose-aware
- variants are treated as distinct persisted assets
- finalization is where MIME, hash, and image metadata are verified

### Flow 4: CMS-to-FM asset reuse

```text
CmsEditPage
    -> FM picker config / useFmApi
    -> FmFilePicker
    -> FmMediaLibrary
    -> selected file or variant
    -> content insertion in editor
    -> optional CMS after-write link tracking
```

Important invariants:

- FM selection is reusable and decoupled from CMS implementation details
- CMS after-write hooks can translate embedded asset usage into durable file-link
  rows

### Flow 5: Email preview and test-send

```text
EmailTemplateListPage
    -> EmailTemplateClient.listTemplates
    -> EmailTemplateDetailPage
    -> EmailTemplateClient.getTemplate / previewTemplate
    -> registry-derived detail and preview output
    -> optional sendTestEmail
```

Important invariants:

- preview output always includes subject, HTML, and plain text
- fixtures are part of the template contract, not just demo data

## Forward Trace

### Public export to implementation examples

| Public surface        | Forward trace                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `./cms/client`        | `package.json` -> `client/src/cms/index.ts` -> `CmsClient`, hooks, UI pages -> `client/src/cms/ui/*`                |
| `./cms/client/public` | `package.json` -> `client/src/cms/public.ts` -> `useCmsPublic`, `CmsBodyRenderer`, `CmsPasswordGate`                |
| `./cms/server`        | `package.json` -> `server/src/cms/index.ts` -> router factories and `CmsServiceCore` -> `utils/src/cms/types.ts`    |
| `./fm/client`         | `package.json` -> `client/src/fm/index.ts` -> `FmClient`, hooks, `FmMediaLibrary`, `FmFilePicker`                   |
| `./fm/server`         | `package.json` -> `server/src/fm/index.ts` -> routers, `FmServiceCore`, storage adapters -> `utils/src/fm/types.ts` |
| `./email/client`      | `package.json` -> `client/src/email/index.ts` -> client, hooks, list/detail preview UI                              |
| `./email/server`      | `package.json` -> `server/src/email/index.ts` -> registry, marketing, webhooks, providers                           |
| `./client/init`       | `package.json` -> `client/src/init.ts` -> browser-side logger bootstrap                                             |

## Reverse Trace

### Core implementation back to published surface

| Internal module                                   | Reverse trace                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `server/src/cms/CmsServiceCore.ts`                | exported through `server/src/cms/index.ts`, published at `./cms/server`     |
| `server/src/fm/FmServiceCore.ts`                  | exported through `server/src/fm/index.ts`, published at `./fm/server`       |
| `client/src/cms/ui/CmsEditPage.tsx`               | exported through `client/src/cms/index.ts`, published at `./cms/client`     |
| `client/src/fm/components/FmMediaLibrary.tsx`     | exported through `client/src/fm/index.ts`, published at `./fm/client`       |
| `client/src/email/ui/EmailTemplateDetailPage.tsx` | exported through `client/src/email/index.ts`, published at `./email/client` |
| `utils/src/cms/types.ts`                          | re-exported by `utils/src/cms/index.ts`, published at `./cms`               |
| `utils/src/fm/types.ts`                           | re-exported by `utils/src/fm/index.ts`, published at `./fm`                 |
| `utils/src/email/types.ts`                        | re-exported by `utils/src/email/index.ts`, published at `./email`           |

## Integration Boundaries and Assumptions

- The library supplies reusable domain logic and UI, not a full product shell.
- Consuming applications are responsible for implementing CMS and FM connector
  interfaces against their persistence layer.
- Consuming applications choose and configure FM storage adapters.
- Auth, authz, route mounting, and navigation are injected by host apps.
- Client-side admin pages expect host-supplied toasts, routing, and, in some
  cases, media-picker wiring.
- Email preview UI assumes compatible admin endpoints exist or are mounted under
  the expected base URL.

## Notable Current-State Characteristics

- The client barrel is intentionally side-effect-free; initialization moved to a
  dedicated `client/init` entrypoint.
- CMS and FM both use durable shared type packages under `utils/` rather than
  duplicating domain contracts in client and server packages.
- FM is designed for both asset management and asset reuse by other domains,
  especially CMS.
- The `test-consumer/` workspace is part of the architecture, not incidental
  demo code. It acts as a real integration harness across runtime targets.
