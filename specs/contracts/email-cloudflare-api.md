---
title: shared-utils Cloudflare Email Provider Contract
feature: shared-utils-email-cloudflare-provider
artifact: contract
domain: email
status: proposed-enhancement
created: 2026-05-17
updated: 2026-05-17
source: codebase-analysis-and-cloudflare-docs
---

# Cloudflare Email Provider Contract

## Scope

This contract documents the planned external integration between the shared-utils
server email provider surface and Cloudflare Email Service.

It is separate from `email-http.md`, which covers the client preview API and
the shipped webhook router.

## Planned shared-utils surface

The enhancement adds a new provider under the existing published provider
subpaths:

- `@user27828/shared-utils/email/server/providers`
- `@user27828/shared-utils/email/server/providers/cloudflare`

Planned exports:

- `CloudflareEmailProvider`
- `createCloudflareProvider()`
- `isConfigured()` from `@user27828/shared-utils/email/server/providers/cloudflare`
- `isCloudflareProviderConfigured()` from `@user27828/shared-utils/email/server/providers`
- `CloudflareProviderConfig`

## Provider configuration contract

### Planned TypeScript shape

```ts
interface CloudflareProviderConfig {
  enabled: boolean;
  accountId: string;
  zoneId: string;
  apiToken: string;
  baseUrl?: string;
  timeoutMs?: number;
}
```

### Planned environment convention

To stay consistent with the existing provider pattern, the dedicated Cloudflare
provider subpath should export `isConfigured()` and the shared provider barrel
should re-export it as `isCloudflareProviderConfigured()`, both based on these
environment variables:

- `EMAIL_CLOUDFLARE_ENABLED`
- `EMAIL_CLOUDFLARE_ACCOUNT_ID`
- `EMAIL_CLOUDFLARE_ZONE_ID`
- `EMAIL_CLOUDFLARE_API_TOKEN`
- optional `EMAIL_CLOUDFLARE_BASE_URL`
- optional `EMAIL_CLOUDFLARE_TIMEOUT_MS`

## External Cloudflare API contract

### Primary endpoint

- Method: `POST`
- Path: `/accounts/{account_id}/email/sending/send`
- Auth: `Authorization: Bearer <API_TOKEN>`
- Content type: `application/json`

### Request mapping

The provider maps the shared-utils `EmailMessage` shape to Cloudflare's
documented structured send payload:

| shared-utils field | Cloudflare field | Notes                                                            |
| ------------------ | ---------------- | ---------------------------------------------------------------- |
| `from`             | `from`           | String or object supported by Cloudflare docs                    |
| `to`               | `to`             | String or array; total recipients capped at 50 across all fields |
| `cc`               | `cc`             | Optional                                                         |
| `bcc`              | `bcc`            | Optional                                                         |
| `replyTo`          | `reply_to`       | REST field uses snake_case                                       |
| `subject`          | `subject`        | Required                                                         |
| `html`             | `html`           | At least one of `html` or `text` must be present                 |
| `text`             | `text`           | At least one of `html` or `text` must be present                 |
| `attachments[]`    | `attachments[]`  | Base64 payloads with filename, type, and disposition             |
| `headers`          | `headers`        | Must satisfy Cloudflare's whitelist-based header rules           |

### Response mapping

Successful Cloudflare responses follow the standard Cloudflare API envelope:

```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "delivered": ["recipient@example.com"],
    "permanent_bounces": [],
    "queued": []
  }
}
```

Planned provider mapping:

- `EmailSendResult.success` -> `true` when the Cloudflare API returns `success: true`
- `EmailSendResult.provider` -> `"cloudflare"`
- `EmailSendResult.messageId` -> derived from the provider response when available; otherwise left undefined
- `EmailSendResult.providerResponse` -> raw Cloudflare delivery breakdown (`delivered`, `permanent_bounces`, `queued`, and any informational messages)

## Error handling contract

### REST API failures

The REST API returns numeric error codes inside the standard Cloudflare API
`errors[]` array. The provider should surface these as `EmailProviderError`
instances with:

- `provider = "cloudflare"`
- `providerCode` set to the Cloudflare numeric error code as a string when present
- `context.httpStatus` set from the response status
- `context.operation` set to the failing operation, such as `send` or `healthCheck`
- `retryable` set when the failure is caused by timeout, network interruption,
  rate limiting, or a transient 5xx-style Cloudflare failure when determinable

## Health Check Contract

- `healthCheck()` is a non-sending operation.
- It must validate required configuration and initialization state before
  reporting the provider as healthy.
- The concrete read-only probe is
  `GET /zones/{zone_id}/email/sending/subdomains` using the configured
  `zoneId` and API token.
- A healthy result means the provider can complete that authenticated read-only
  Cloudflare API probe without sending an email.
- An unhealthy result returns `healthy: false` plus an error message and
  latency measurement in the shared `ProviderHealthStatus` shape.
- Missing `zoneId`, unauthorized responses, and other non-2xx probe failures
  must map to an unhealthy result.
- Test or runtime overrides may stub the read-only probe, but they must preserve
  the non-sending contract.

### Capability constraints to document and honor

- Cloudflare Email Service is currently documented as beta.
- Cloudflare Email Service is documented as requiring a Workers Paid plan.
- The reviewed docs position the product for transactional emails, not marketing/bulk sending.
- Cloudflare DNS and domain onboarding are required before sending.
- The implementation intentionally enforces a conservative 5 MiB total
  message-size limit, including attachments.
- Platform-controlled headers such as `Date`, `Message-ID`, `DKIM-Signature`, and `Content-Type` cannot be set manually.
- Headers that correspond to first-class API fields such as `From`, `To`, `Cc`, `Bcc`, `Subject`, and `Reply-To` must be set through the dedicated payload fields rather than the `headers` map.
- `healthCheck()` must not be implemented as a test-email send.

## Out of scope for this enhancement

- Cloudflare Workers `send_email` binding support inside the shared Node/server provider path
- Cloudflare inbound Email Routing handlers or Workers `email()` support
- Cloudflare-specific preview UI or webhook router changes
- Marketing-email workflows
