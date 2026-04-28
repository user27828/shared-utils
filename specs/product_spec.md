---
title: shared-utils Current State Product Specification
feature: shared-utils-current-state
artifact: product-spec
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# Product Specification: shared-utils Current State

**Created**: 2026-04-28  
**Status**: Current-state baseline  
**Input**: Existing monorepo behavior and exported package surfaces

## Overview

`@user27828/shared-utils` is a reusable application toolkit rather than a single
end-user app. Its current product surface combines:

- shared runtime utilities and centralized configuration
- a portable CMS for authoring and rendering structured content
- a portable FM system for uploading, selecting, and managing files and media
- an email template preview surface for validating rendered messages
- server helpers for environment loading, Turnstile verification, and provider
  integrations

The package is designed so a consuming application can adopt only the parts it
needs while still sharing one consistent set of domain models and runtime
patterns.

## Users and Actors

- **Application developer**: integrates package entrypoints, configures global
  options, mounts routers, and supplies connectors/adapters.
- **Content administrator**: lists, creates, edits, versions, publishes,
  trashes, and restores CMS content.
- **Content editor**: writes body content, manages metadata, and inserts or
  references media assets.
- **Media administrator**: uploads files, reviews metadata, manages variants,
  and selects reusable assets.
- **Public site visitor**: views published content and unlocks protected pages
  when required.
- **Email operator**: browses registered templates, chooses preview fixtures,
  inspects output, and optionally sends test messages.
- **Platform operator**: configures environment-dependent behavior such as
  logging, Turnstile verification, storage, and email providers.

## User Scenarios and Testing

### Scenario 1: A developer integrates only the needed surfaces

The developer installs one package, imports targeted subpaths, and wires the
missing environment-specific seams such as database connectors, storage
adapters, or route mounting.

Expected current behavior:

- utilities, client components, server helpers, CMS, FM, and email previewing
  are consumable through stable subpath exports
- client initialization is opt-in through a dedicated `client/init` entrypoint
- the package can be consumed in browser, server, and mixed full-stack setups

### Scenario 2: A content administrator manages a CMS catalog

The administrator opens the CMS list view, filters by status, searches for
content, creates new entries, and performs restore or trash cleanup actions.

Expected current behavior:

- content can be segmented into all, draft, published, and trash views
- search is responsive and debounced rather than firing per keystroke
- bulk restore and trash cleanup are available from the list surface

### Scenario 3: A content editor authors and publishes a page

The editor opens an item in the CMS edit page, updates title, slug, locale,
tags, options, body content, and version notes, then saves or publishes.

Expected current behavior:

- editing includes both metadata and body-authoring workflows
- saved content keeps revision history and version metadata
- concurrent edits are detected and surfaced as a conflict rather than silently
  overwriting another editor's changes
- published content can later be moved to trash, restored, or restored from a
  prior revision

### Scenario 4: An editor inserts reusable media into CMS content

While editing a CMS item, the editor opens a file picker, browses the media
library, and selects an original asset or a derived variant for insertion.

Expected current behavior:

- the CMS authoring flow can delegate file selection to the FM surface
- selected media is returned as a structured file or variant record
- the FM system supports reuse rather than treating uploads as one-off blobs

### Scenario 5: A public visitor reads published content

The visitor requests a published CMS page. If the page is public, it renders
directly. If it is protected, the visitor is prompted for a password and can
continue after a successful unlock.

Expected current behavior:

- public rendering uses a lightweight public client surface
- password-protected content uses an explicit unlock step
- rendered output can represent sanitized HTML, markdown-derived HTML, plain
  text, or JSON-oriented content depending on the content type

### Scenario 6: A media administrator manages file inventory

The media administrator uploads files, filters and sorts the media library,
opens detail views, renames assets, edits tags, reviews links, and archives,
restores, moves, or deletes files.

Expected current behavior:

- the FM surface supports both browsing and upload management
- uploads can produce variants for image-oriented assets
- the same FM surface supports single-file picking and broader administrative
  lifecycle actions
- media details include both file metadata and linkage to consuming entities

### Scenario 7: An email operator validates templates before sending

The operator opens the email template catalog, filters or searches it, selects
one template, chooses a preview fixture, inspects HTML and plain-text output,
and optionally queues a test email.

Expected current behavior:

- template catalog entries expose description, category, scenarios, and fixture
  counts
- detail view exposes fixtures and synchronized preview output
- HTML and text output are visible side by side through a shared preview shell

## Requirements

### Functional Requirements

- **FR-001**: The system MUST publish a single package with subpath exports for
  utilities, client UI, server helpers, CMS, FM, and email previewing.
- **FR-002**: The system MUST let consuming applications configure shared
  behavior through centralized options rather than isolated per-module setup.
- **FR-003**: CMS administrators MUST be able to list, search, create, update,
  publish, trash, restore, and permanently clear content through reusable
  package surfaces.
- **FR-004**: CMS editing MUST preserve revision history and version metadata so
  content changes remain traceable.
- **FR-005**: The CMS authoring experience MUST detect concurrent updates and
  surface them as explicit conflicts.
- **FR-006**: Public CMS consumers MUST be able to fetch and render published
  content without loading admin/editor dependencies.
- **FR-007**: Password-protected CMS content MUST require an unlock flow before
  rendered content is exposed.
- **FR-008**: FM users MUST be able to upload, browse, filter, sort, preview,
  rename, tag, archive, restore, move, and delete files.
- **FR-009**: FM MUST support both original files and derived variants as
  addressable assets.
- **FR-010**: CMS and other consumers MUST be able to reuse the FM surface as a
  picker instead of implementing a separate asset-selection tool.
- **FR-011**: Email operators MUST be able to browse registered templates,
  select preview fixtures, and inspect both HTML and plain-text output.
- **FR-012**: The server package MUST provide reusable integration points for
  environment loading, Turnstile verification, email providers, and storage.

### Key Entities

- **Global option space**: Shared configuration categories consumed by logging,
  Turnstile, environment loading, and utility helpers.
- **CMS content item**: A page/post-like object with title, body, content type,
  slug, locale, tags, status, and publication state.
- **CMS revision**: A historical snapshot of a content item that supports
  version tracing and restoration.
- **CMS version metadata**: Version label and notes attached to a save or
  revision.
- **CMS content note**: Persistent notes attached to the content item rather
  than one specific revision.
- **Public CMS payload**: The read-optimized content shape used for rendering on
  public-facing pages.
- **FM file**: The canonical representation of an uploaded asset, including
  ownership, storage location, size, MIME type, visibility, and purpose.
- **FM variant**: A derivative asset associated with an original file and a
  variant kind such as thumbnail, preview, or web.
- **FM file link**: A relationship tying a file to another entity or field in a
  consuming system.
- **Email template**: A registered message definition with category,
  description, scenarios, and preview fixtures.
- **Email preview fixture**: A named preview scenario that supplies props to a
  template.
- **Email render result**: The rendered subject, HTML, text, and warnings for a
  template preview.

## Component Surfaces

### CMS admin surface

- `CmsListPage` for catalog browsing and status-based organization
- `CmsEditPage` for authoring, publishing, versioning, and conflict handling
- `CmsHistoryDrawer` for revision access
- `CmsBodyEditor` for content editing
- `CmsContentNotes` and `CmsVersionNotesForm` for persistent and revision-level
  annotations

### CMS public surface

- `useCmsPublic` for read-side data access
- `CmsPasswordGate` for protected content access
- `CmsBodyRenderer` for final content rendering

### FM surface

- `FmMediaLibrary` as the full administrative and picker-capable media shell
- `FmFilePicker` as a dialog wrapper around the library
- `FmImageViewer` and `FmVideoViewer` for expanded previews

### Email preview surface

- `EmailTemplateListPage` for catalog browsing
- `EmailTemplateDetailPage` for fixture selection and previewing
- `EmailPreviewTabs`, `EmailHtmlPreviewFrame`, and `EmailTextPreviewPanel` for
  output inspection

## Success Criteria

- **SC-001**: A consuming application can adopt one or more domain surfaces
  from a single published package without copying source files between projects.
- **SC-002**: A content team can complete the full CMS lifecycle of create,
  edit, publish, trash, restore, and history review using reusable package UI
  and APIs.
- **SC-003**: A public-facing application can render published content and gate
  protected content through a dedicated unlock flow.
- **SC-004**: A media workflow can use the FM surface for both administration
  and asset selection, including variant-aware selection.
- **SC-005**: An email workflow can validate subject, HTML, and text output for
  registered templates before sending a test message.

## Assumptions

- Host applications provide the persistence, auth, and routing context that the
  package deliberately leaves injectable.
- CMS and FM are meant to be embedded into larger applications rather than run
  as turnkey standalone products.
- FM storage backends and email providers vary by consuming application, so the
  package supplies abstractions and factories instead of enforcing one vendor.
- Public-facing CMS consumers prefer a lightweight surface that excludes
  editor-only dependencies.
