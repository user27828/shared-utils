---
title: shared-utils Cloudflare Email Provider Data Model
feature: shared-utils-email-cloudflare-provider
artifact: data-model
status: proposed-enhancement
created: 2026-05-17
updated: 2026-05-17
source: analysis-remediation
---

# Data Model: shared-utils Cloudflare Email Provider

## Scope

This document defines the runtime entities and relationships that matter for the
Cloudflare provider enhancement inside the existing shared email provider
surface.

Primary sources:

- `server/src/email/providers/types.ts`
- `server/src/email/providers/cloudflare.ts`
- `specs/contracts/email-cloudflare-api.md`

## Core Entities

| Entity                           | Cardinality                      | Purpose                                   | Key fields                                                                                                  |
| -------------------------------- | -------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `EmailMessage`                   | 1 per send attempt               | Shared provider input model               | `from`, `to`, optional `cc`, `bcc`, `replyTo`, `subject`, optional `html`, `text`, `attachments`, `headers` |
| `CloudflareProviderConfig`       | 1 per provider instance          | Runtime configuration for Cloudflare send | `enabled`, `accountId`, `zoneId`, `apiToken`, optional `baseUrl`, optional `timeoutMs`                      |
| `CloudflareSendPayload`          | 1 per outbound send attempt      | Structured Cloudflare REST payload        | `to`, `from`, `subject`, optional `html`, `text`, `cc`, `bcc`, `reply_to`, `headers`, `attachments`         |
| `CloudflareAttachment`           | 0..n per `CloudflareSendPayload` | Attachment payload for the REST API       | `filename`, `content`, `type`, `disposition`                                                                |
| `CloudflareSendResultEnvelope`   | 1 per Cloudflare response        | Normalized delivery breakdown             | `success`, `result.delivered[]`, `result.permanent_bounces[]`, `result.queued[]`, `errors[]`, `messages[]`  |
| `CloudflareProviderErrorContext` | 0..1 per failure                 | Provider-specific error metadata          | `httpStatus`, `providerCode`, `operation`, `retryable`, optional response payload                           |
| `ProviderHealthStatus`           | 1 per health probe               | Shared provider health result             | `provider`, `healthy`, `lastCheck`, optional `error`, optional `latencyMs`                                  |

## Relationships

```text
CloudflareProviderConfig 1 ---- 0..n EmailMessage
EmailMessage 1 ---- 1 CloudflareSendPayload
CloudflareSendPayload 1 ---- 0..n CloudflareAttachment
CloudflareSendPayload 1 ---- 1 CloudflareSendResultEnvelope
CloudflareSendResultEnvelope 0..n ---- 0..1 CloudflareProviderErrorContext
CloudflareProviderConfig 1 ---- 0..n ProviderHealthStatus
```

## Entity Notes

### `EmailMessage`

- This is the existing shared-utils provider input contract.
- The Cloudflare provider must consume it without introducing a second public
  message model.

### `CloudflareProviderConfig`

- Holds the minimal runtime configuration necessary to authenticate and target
  the Cloudflare Email Sending API.
- The config must be compatible with env-based `isConfigured()` detection.
- `zoneId` is included because `healthCheck()` uses the documented
  `GET /zones/{zone_id}/email/sending/subdomains` read-only probe.

### `CloudflareSendPayload`

- This is a transport model, not a new public consumer-facing type.
- It exists to capture the Cloudflare-specific request mapping from the shared
  `EmailMessage` model.

### `CloudflareSendResultEnvelope`

- Mirrors the Cloudflare REST success envelope and preserves delivery outcome
  buckets for `providerResponse`.

### `ProviderHealthStatus`

- Must represent a non-sending health probe result.
- The provider may validate config and perform a lightweight authenticated
  read-only API check, but it must not send an email from `healthCheck()`.

## Invariants

- `accountId`, `zoneId`, and `apiToken` are required for a usable enabled
  provider.
- At least one of `html` or `text` must be present before sending.
- Combined `to`, `cc`, and `bcc` recipients must not exceed Cloudflare's
  documented limit of 50.
- Combined payload size must not exceed the feature's conservative 5 MiB total
  message limit.
- Attachments must be normalized to Cloudflare-compatible string or base64
  payloads rather than Node SMTP buffer semantics.
- Platform-controlled headers such as `Message-ID`, `Date`, and `Content-Type`
  cannot be supplied through the custom `headers` map.
- `healthCheck()` is a non-sending operation; success means configuration and
  lightweight authenticated reachability through
  `GET /zones/{zone_id}/email/sending/subdomains` are both good enough to
  report the provider as healthy.

## Lifecycle Summary

```text
CloudflareProviderConfig -> initialize -> send EmailMessage -> build CloudflareSendPayload
                                                   |
                                                   +-> CloudflareSendResultEnvelope on success
                                                   +-> CloudflareProviderErrorContext on failure

CloudflareProviderConfig -> healthCheck -> ProviderHealthStatus
```
