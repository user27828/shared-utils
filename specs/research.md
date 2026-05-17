---
title: shared-utils Cloudflare Email Provider Research
feature: shared-utils-email-cloudflare-provider
artifact: research
status: proposed-enhancement
created: 2026-05-17
updated: 2026-05-17
source: web-research-and-codebase-analysis
---

# Research: shared-utils Cloudflare Email Provider

## Scope

This document resolves the technical unknowns for adding Cloudflare-backed email delivery to the existing server email provider surface in this repository.

## Decision 1: Implement Cloudflare delivery through the Email Service REST API

**Decision**: The Node/server provider should call Cloudflare Email Service's documented REST endpoint, `POST /accounts/{account_id}/email/sending/send`, instead of attempting an SMTP-style integration.

**Rationale**:

- The reviewed Cloudflare Email Service docs describe outbound sending through two documented mechanisms: the REST API and a Workers `send_email` binding.
- This repository's shared provider runtime is a Node/server package, not a Cloudflare Worker runtime, so the REST API is the compatible transport.
- Cloudflare's docs also expose `send_raw` for raw MIME email, but the standard structured send endpoint already maps the repository's current `EmailMessage` shape closely enough for the planned first implementation.
- The studied docs do not describe a generic SMTP relay host, SMTP credentials workflow, or SMTP submission endpoint for Email Service.

**Alternatives considered**:

- **Workers binding**: Rejected for this enhancement because it requires a Worker runtime and Wrangler binding configuration that do not belong in the generic Node/server provider path.
- **SMTP relay implementation**: Rejected because the reviewed Cloudflare docs do not document a general SMTP relay surface.
- **Raw MIME API as the primary transport**: Rejected for the initial implementation because it adds MIME-construction complexity without being necessary for the current provider contract.

## Decision 2: Preserve the current provider abstraction and export pattern

**Decision**: Add a new `CloudflareProviderConfig` and `CloudflareEmailProvider` alongside the existing Gmail, Resend, SES, and test providers, using the same `IEmailProvider` contract, `isConfigured()` convention, and published provider subpaths.

**Rationale**:

- The codebase already has a stable provider pattern in `server/src/email/providers/`.
- The published root package already exports `./email/server/providers` and per-provider subpaths for Gmail, Resend, SES, and `_test_`.
- Reusing the existing pattern keeps Cloudflare support tree-shakeable, discoverable, and aligned with current brownfield expectations.

**Alternatives considered**:

- **Hiding Cloudflare behind `server/src/email/index.ts` only**: Rejected because provider implementations are already published through provider-specific subpaths.
- **Creating a separate Cloudflare-specific email subsystem**: Rejected because the existing provider abstraction already solves the needed seam.

## Decision 3: Treat Cloudflare's documented limits and rules as first-class provider constraints

**Decision**: The provider contract and implementation plan will explicitly account for Cloudflare's documented requirements and constraints.

**Rationale**:

- Cloudflare Email Service is documented as beta and available on a Workers Paid plan.
- Email Sending requires Cloudflare DNS plus domain onboarding and verification of Cloudflare-managed SPF, DKIM, DMARC, and bounce-handling records.
- Cloudflare documents a 50-recipient combined limit, a 5 MiB total message-size limit for the REST API, and strict header whitelist rules.
- The FAQ currently positions Email Service for transactional emails, not marketing/bulk use.

The feature will intentionally enforce a conservative 5 MiB total message-size
limit for all sends so the provider fails closed deterministically instead of
varying behavior by account or verified-address status.

**Alternatives considered**:

- **Deferring limits to docs only**: Rejected because some constraints, such as auth, recipient count, and header behavior, should shape request mapping and error handling.
- **Treating Cloudflare as feature-equivalent to existing SMTP/API providers**: Rejected because Cloudflare's header and platform-controlled field rules differ materially.

## Decision 4: Keep Workers-specific features and inbound routing out of the initial provider scope

**Decision**: The enhancement scope is outbound email delivery from Node/server consumers. Workers `send_email`, inbound Email Routing handlers, and routing rules remain out of scope.

**Rationale**:

- The user request targets the existing email/SMTP capability in this library, which maps to outbound provider support.
- The current shared-utils email server surface already has separate concerns for template registries, marketing sync, and webhooks; inbound Cloudflare routing would be a separate feature.
- Cloudflare's Workers local-development story is useful context, but it does not affect the Node REST provider implementation path.

**Alternatives considered**:

- **Adding inbound routing support in the same enhancement**: Rejected because it would expand scope beyond the current provider abstraction.
- **Adding dual REST and Workers implementations immediately**: Rejected because it would create a second runtime surface without a clear consumer in this repo.

## Decision 5: Define `healthCheck()` as a non-sending authenticated probe

**Decision**: The Cloudflare provider should treat `healthCheck()` as a
non-sending operation that validates required configuration and performs a
lightweight authenticated read-only probe against
`GET /zones/{zone_id}/email/sending/subdomains`.

**Rationale**:

- The existing provider set already favors low-side-effect health semantics:
  Gmail uses `transporter.verify()`, SES uses `GetAccount`, and Resend uses a
  read-only domains request.
- Cloudflare's documented Email Sending API includes read-only subdomain
  listing endpoints, which makes a concrete non-sending probe possible without
  inventing an undocumented endpoint.
- Sending a real email from `healthCheck()` would create operational side
  effects, make tests harder to isolate, and blur the distinction between send
  verification and runtime readiness.
- A config-only check would be too weak to catch auth or account reachability
  problems that the current provider surface expects health checks to surface.

**Alternatives considered**:

- **Config-only health check**: Rejected because it would report false positives
  when credentials or account access are invalid remotely.
- **Test-email health check**: Rejected because it creates delivery side effects
  and does not match the behavior of existing providers.
- **Generic Cloudflare account probe**: Rejected because the documented
  Email Sending subdomain endpoints provide a more feature-specific and
  contract-aligned read-only check.

## Supporting Findings

- Cloudflare Email Service docs describe Email Sending and Email Routing as a unified product suite, but outbound sending is currently exposed through REST API or Workers binding, not a documented SMTP relay.
- The REST API accepts structured fields for `to`, `from`, `subject`, `html`, `text`, `cc`, `bcc`, `reply_to`, `attachments`, and `headers`, which aligns closely with the existing `EmailMessage` model.
- Cloudflare also exposes a raw MIME endpoint, `POST /accounts/{account_id}/email/sending/send_raw`, which can be reserved for a future enhancement if MIME-only capabilities become necessary.
- Custom headers are whitelist-based; platform-controlled headers such as `Date`, `Message-ID`, `Content-Type`, and `DKIM-Signature` cannot be set manually.
- Cloudflare automatically manages bounce handling, suppression lists, and reputation controls, but the docs currently recommend the service for transactional email rather than marketing/bulk sending.
- The feature needs an explicit `healthCheck()` contract because the shared
  provider interface requires it and existing providers already implement
  authenticated, non-sending probes.
- The documented `GET /zones/{zone_id}/email/sending/subdomains` endpoint is
  suitable as the concrete read-only health probe, which means the provider
  config needs a `zoneId` in addition to `accountId` and `apiToken`.

## Source References

- https://developers.cloudflare.com/email-service/
- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/email-service/api/send-emails/rest-api/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- https://developers.cloudflare.com/email-service/platform/limits/
- https://developers.cloudflare.com/email-service/reference/headers/
- https://developers.cloudflare.com/email-service/reference/faq/
- https://developers.cloudflare.com/email-service/configuration/domains/
- https://developers.cloudflare.com/api/resources/email_sending/methods/send
- https://developers.cloudflare.com/api/resources/email_sending/methods/send_raw
