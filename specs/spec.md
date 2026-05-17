---
title: shared-utils Cloudflare Email Provider Feature Specification
feature: shared-utils-email-cloudflare-provider
artifact: spec
status: proposed-enhancement
created: 2026-05-17
updated: 2026-05-17
source: analysis-remediation
---

# Feature Specification: shared-utils Cloudflare Email Provider

**Feature Branch**: `[master]`  
**Created**: 2026-05-17  
**Status**: Draft  
**Input**: Enhancement request to add Cloudflare email capability to the existing shared-utils server email provider surface.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Send Transactional Email Through Cloudflare (Priority: P1)

An application server configures Cloudflare Email Service credentials and sends
transactional email through the shared `IEmailProvider` abstraction without
introducing a Cloudflare Worker runtime dependency.

**Why this priority**: This is the core functional change requested by the
feature. Without a working provider runtime, the export-surface and
documentation work has no operational value.

**Independent Test**: A mocked provider can initialize with account, zone, and
token configuration, map a message to Cloudflare's REST payload, reject local
recipient/header/size violations, report non-sending `healthCheck()` status via
the documented read-only probe, and translate timeout or API failures into
`EmailProviderError` without requiring a live Cloudflare account.

**Acceptance Scenarios**:

1. **Given** valid Cloudflare account credentials and a valid sender domain,
   **When** the provider sends a message with `from`, `to`, `subject`, `html`,
   `text`, optional `replyTo`, headers, and attachments, **Then** it issues a
   Cloudflare-compatible REST request and returns a normalized `EmailSendResult`.
2. **Given** the provider is missing required configuration such as
   `accountId`, `zoneId`, or `apiToken`, **When** initialization or send is
   attempted,
   **Then** it fails closed before attempting a network request.
3. **Given** a message exceeds Cloudflare's recipient, size, or header rules,
   **When** send is attempted, **Then** the provider fails closed locally
   before issuing a network request.
4. **Given** Cloudflare rejects the request or the request times out,
   **When** send is attempted, **Then** the provider throws `EmailProviderError`
   with provider-specific context rather than a raw `Error`.
5. **Given** the application calls `healthCheck()`, **When** the provider uses
   the configured `zoneId`, **Then** it performs a read-only
   `GET /zones/{zone_id}/email/sending/subdomains` probe without sending mail.

---

### User Story 2 - Consume the Provider From the Published Package Surface (Priority: P2)

An application developer imports the Cloudflare provider from the published
shared-utils package surface instead of reaching into workspace source files.

**Why this priority**: The constitution treats published subpath exports as the
real library contract. A provider that only works from workspace internals is
not a valid package feature.

**Independent Test**: After build, the package import and distribution tests can
resolve both `@user27828/shared-utils/email/server/providers` and
`@user27828/shared-utils/email/server/providers/cloudflare` with the expected
Cloudflare exports present in `dist/`.

**Acceptance Scenarios**:

1. **Given** a consuming application imports from the provider barrel,
   **When** it requests Cloudflare provider symbols, **Then** the Cloudflare
   provider exports are available without breaking existing provider exports.
2. **Given** a consuming application imports the dedicated Cloudflare provider
   subpath, **When** the package is built, **Then** the corresponding `.js` and
   `.d.ts` artifacts resolve from `dist/server/src/email/providers/cloudflare`.
3. **Given** the package root export map and type mappings are inspected,
   **When** the Cloudflare provider enhancement is present, **Then** the export
   map and `typesVersions` remain aligned with the built artifacts.

### Edge Cases

- What happens when `enabled` is true but `accountId`, `zoneId`, or `apiToken`
  is missing?
- What happens when a message includes neither `html` nor `text`?
- What happens when combined `to`, `cc`, and `bcc` recipients exceed
  Cloudflare's documented 50-recipient limit?
- What happens when the combined message payload exceeds Cloudflare's documented
  5 MiB limit?
- What happens when headers include platform-controlled or disallowed values?
- What happens when the sender domain is not onboarded to Cloudflare Email
  Service or the sender is otherwise unavailable for sending?
- What happens when the provider must report health without sending a real
  email?
- What happens when Cloudflare returns throttling, validation, or internal
  server errors?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose the Cloudflare provider from the published
  package surface through both `@user27828/shared-utils/email/server/providers`
  and `@user27828/shared-utils/email/server/providers/cloudflare`.
- **FR-002**: The system MUST provide a typed `CloudflareProviderConfig`, an
  `isConfigured()` helper from the dedicated Cloudflare provider subpath, and an
  `isCloudflareProviderConfigured()` alias from the shared provider barrel using
  `EMAIL_CLOUDFLARE_*` configuration keys, including `EMAIL_CLOUDFLARE_ZONE_ID`.
- **FR-003**: The system MUST implement Cloudflare delivery behind the existing
  `IEmailProvider` abstraction using Cloudflare Email Service's REST API rather
  than a Worker-only binding or undocumented SMTP relay path.
- **FR-004**: The system MUST map shared-utils `EmailMessage` fields into the
  Cloudflare send payload, including `reply_to`, attachments, and headers, and
  MUST fail closed when required content is missing or when documented
  recipient, conservative 5 MiB size, or header constraints are violated.
- **FR-005**: The system MUST translate Cloudflare API, timeout, and network
  failures into `EmailProviderError` values that include provider code,
  operation context, and retryability metadata when determinable.
- **FR-006**: The system MUST define `healthCheck()` as a non-sending health
  probe that validates required configuration and performs a lightweight,
  authenticated, read-only Cloudflare API check using
  `GET /zones/{zone_id}/email/sending/subdomains`.
- **FR-007**: The system MUST document Cloudflare onboarding prerequisites,
  including the documented Workers Paid plan requirement, transactional-email
  scope, health-check semantics, and validation flow in the feature artifacts
  and server usage documentation.
- **FR-008**: The system MUST be verified by targeted provider regression
  coverage, targeted root package-surface regression coverage, root `yarn build`,
  and supplemental root `yarn test` validation for the published package surface.

### Key Entities _(include if feature involves data)_

- **Cloudflare provider config**: Runtime configuration containing `enabled`,
  `accountId`, `zoneId`, `apiToken`, and optional API overrides.
- **Cloudflare send payload**: The structured outbound REST payload derived
  from `EmailMessage`.
- **Cloudflare attachment**: A normalized attachment payload carrying filename,
  base64 content, type, and disposition for the REST API.
- **Cloudflare send result envelope**: The Cloudflare response envelope
  containing `success`, delivery status buckets, and any returned errors.
- **Cloudflare provider error context**: Normalized metadata used to preserve
  Cloudflare HTTP status, provider code, and failing operation details.
- **Provider health status**: The common shared-utils provider health result for
  reporting healthy or unhealthy Cloudflare connectivity without sending mail.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The Cloudflare provider passes mocked initialization, request
  mapping, recipient/header/size validation, non-sending `healthCheck()`,
  timeout, and API-error regression tests in
  `server/__tests__/email-providers.test.js`.
- **SC-002**: A consuming application can import the Cloudflare provider from
  both the provider barrel and the dedicated provider subpath after build.
- **SC-003**: Root `yarn build`, the targeted root package-surface regression
  command, and supplemental root `yarn test` succeed with the Cloudflare
  provider artifacts present in `dist/` and covered by package-surface
  assertions.
- **SC-004**: The contract and quickstart docs clearly state that the feature
  uses Cloudflare's REST Email Service path, not a generic SMTP relay, and that
  `healthCheck()` is non-sending.

## Assumptions

- The existing `EmailMessage`, `EmailSendResult`, `ProviderHealthStatus`, and
  `IEmailProvider` abstractions remain the source of truth for provider shape.
- The Node/server implementation targets Cloudflare's REST Email Service API;
  Cloudflare Workers bindings and inbound routing remain out of scope.
- The feature intentionally enforces a conservative 5 MiB total message limit
  for deterministic fail-closed behavior.
- Live smoke validation requires a Cloudflare-onboarded domain, but repository
  regression tests must remain runnable with mocked network behavior.
