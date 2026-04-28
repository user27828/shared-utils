---
title: shared-utils Current State Data Model
feature: shared-utils-current-state
artifact: data-model
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# Data Model: shared-utils Current State

## Scope

This document normalizes the current source-backed domain model across the
three main feature families exposed by the package:

- CMS
- FM
- Email

It complements the broader architecture narrative in
[technical_spec.md](./technical_spec.md).

## CMS Domain Model

Primary source: `utils/src/cms/types.ts`

### Core entities

| Entity             | Cardinality               | Purpose                                            | Key fields                                                                                                                                                                         |
| ------------------ | ------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CmsHeadRow`       | 1 per content item        | Canonical editable record                          | `uid`, `title`, `content`, `content_type`, `slug`, `locale`, `post_type`, `options`, `metadata`, `tags`, `status`, `etag`, `version_number`, publish/lock/trash/archive timestamps |
| `CmsHistoryRow`    | 0..n per `CmsHeadRow`     | Historical snapshot for restore and audit flows    | `id`, `cms_uid`, `revision`, `snapshot`, `created_by`, soft-delete metadata                                                                                                        |
| `CmsMetadata`      | 0..1 per `CmsHeadRow`     | Structured metadata bag                            | `version`, `notes`                                                                                                                                                                 |
| `CmsVersionMeta`   | 0..1 inside `CmsMetadata` | Save/revision annotation                           | `version`, `notes`, `dt_updated`, `user_uid`                                                                                                                                       |
| `CmsContentNote`   | 0..n inside `CmsMetadata` | Persistent notes independent of revisions          | `note`, `dt_updated`, `user_uid`                                                                                                                                                   |
| `CmsPublicPayload` | Derived view              | Public render-ready projection                     | `uid`, `post_type`, `locale`, `slug`, `title`, `content_type`, rendered content fields                                                                                             |
| `CmsPublicHead`    | Derived view              | Lightweight lookup for ETag/password/public checks | `uid`, `post_type`, `locale`, `slug`, `status`, `etag`, password fields, publish fields                                                                                            |

### Relationships

```text
CmsHeadRow 1 ---- 0..n CmsHistoryRow
CmsHeadRow 1 ---- 0..1 CmsMetadata
CmsMetadata 1 ---- 0..1 CmsVersionMeta
CmsMetadata 1 ---- 0..n CmsContentNote
CmsHeadRow 1 ---- 0..1 CmsPublicPayload (derived public read model)
CmsHeadRow 1 ---- 0..1 CmsPublicHead (derived lightweight public read model)
```

### Enumerated state

- Post type: `post`, `page`, `general`, `faq`, `blog`, `embed`, `data`,
  `docs`, `kb`, `other`
- Status: `draft`, `published`, `trash`
- Content type: `text/html`, `text/markdown`, `application/json`, `text/plain`

### Invariants

- `etag` and `version_number` together support optimistic concurrency.
- `password_hash` and `password_version` drive protected-content access.
- Trash and archive metadata preserve lifecycle state without immediate hard
  deletion.
- History rows snapshot prior state before destructive or version-changing
  actions.

## FM Domain Model

Primary source: `utils/src/fm/types.ts`

### Core entities

| Entity              | Cardinality             | Purpose                                   | Key fields                                                                                                                                     |
| ------------------- | ----------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `FmFileRow`         | 1 per original file     | Canonical file record                     | `uid`, owner/creator fields, filename/title/alt text, tags, storage location/key, size, MIME, SHA-256, visibility, purpose, archive timestamps |
| `FmFileVariantRow`  | 0..n per `FmFileRow`    | Derived variant asset                     | `uid`, `variant_of_uid`, `variant_kind`, dimensions, transform, storage location/key, size, MIME                                               |
| `FmFileLinkRow`     | 0..n per `FmFileRow`    | Link to consuming entity                  | `file_uid`, `linked_entity_type`, `linked_entity_uid`, `linked_field`                                                                          |
| `FmObjectRef`       | Transport object        | Storage address for upload/finalize flows | `bucket`, `objectKey`                                                                                                                          |
| `FmDestinationHint` | Optional transport hint | Client-suggested bucket/prefix            | `bucket`, `prefix`                                                                                                                             |

### Relationships

```text
FmFileRow 1 ---- 0..n FmFileVariantRow
FmFileRow 1 ---- 0..n FmFileLinkRow
FmFileRow 1 ---- 1 FmObjectRef (resolved storage address for original object)
FmFileVariantRow 1 ---- 1 FmObjectRef (resolved storage address for variant object)
```

### Enumerated state

- Purpose: `resume`, `job`, `cms_asset`, `cms_b64`, `avatar`, `generic`
- Visibility: `private`, `public`
- Variant kind: `original`, `thumb`, `preview`, `web`

### Invariants

- Uploads are intentionally modeled as two-phase init/finalize transactions.
- Variants are distinct persisted records, not fields on the original file row.
- `sha256`, `mime_type`, and dimension metadata are part of the final stored
  file identity.
- Links are first-class records because files may be reused by many entities.

## Email Domain Model

Primary sources: `utils/src/email/types.ts`, `server/src/email/registry.ts`

### Core entities

| Entity                         | Cardinality                | Purpose                           | Key fields                                                                                 |
| ------------------------------ | -------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `EmailTemplateSummary`         | 1 per registered template  | Catalog-level identity            | `uid`, `name`, `category`, `description`, `sendScenarios`, `tags`, `fixtureCount`          |
| `EmailTemplateDetail`          | 1 per selected template    | Detail-level identity             | summary fields plus `previewFixtures`                                                      |
| `EmailPreviewFixture`          | 0..n per template          | Named preview scenario            | `uid`, `label`, `description`, `props`                                                     |
| `EmailRenderResult`            | Derived render output      | Concrete subject/body result      | `subject`, `html`, `text`, `warnings`, `metadata`                                          |
| `EmailTemplatePreviewRequest`  | Client request DTO         | Preview selection input           | `fixtureUid`, `propsOverride`                                                              |
| `EmailTemplatePreviewResponse` | Preview result DTO         | Template plus render output       | `template`, `fixtureUid`, `subject`, `html`, `text`, `warnings`, `metadata`                |
| `EmailTemplateDescriptor`      | Server registry definition | Authoritative template descriptor | summary fields, delivery refs, fixtures, subject builder, optional text builder, component |

### Relationships

```text
EmailTemplateDescriptor 1 ---- 0..n EmailPreviewFixture
EmailTemplateDescriptor 1 ---- 1 EmailTemplateSummary (derived catalog view)
EmailTemplateDescriptor 1 ---- 1 EmailTemplateDetail (derived detail view)
EmailTemplateDescriptor + EmailPreviewFixture ----> EmailRenderResult
EmailTemplatePreviewRequest ----> EmailTemplatePreviewResponse
```

### Enumerated state

- Category: `auth`, `transactional`, `notification`, `marketing`, `system`,
  `other`
- Delivery setting refs supported by the registry: `noReplyEmail`,
  `supportEmail`

### Invariants

- Preview fixtures are part of the template contract, not separate sample data.
- `EmailTemplateDetail` is a derived, client-facing projection of the richer
  server-side descriptor.
- HTML and plain-text render results are both considered first-class outputs.

## Cross-Domain Relationships

### CMS <-> FM

- CMS content can embed or reference FM assets.
- The CMS server layer exposes an `onAfterWrite` hook used by the FM link
  tracker to keep `fm_file_links` synchronized with CMS content references.
- This is the strongest cross-domain relationship in the package.

### Email <-> CMS/FM

- No direct persisted package-level relationship is modeled between email
  templates and CMS/FM entities in the current shared-utils core.
- Any such relationship would be defined in consuming applications through
  template props or external business data.

## Lifecycle Summary

### CMS lifecycle

```text
draft -> published -> trash -> restored or permanently deleted
           |
           +-> history snapshots across save/publish/restore flows
```

### FM lifecycle

```text
upload init -> upload finalize -> active file
                               -> variants added later
active file -> archived -> restored or hard deleted
```

### Email lifecycle

```text
registered template -> catalog/detail view -> preview fixture selection -> render result -> optional test send
```
