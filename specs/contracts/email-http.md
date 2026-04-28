---
title: shared-utils Email HTTP Contract
feature: shared-utils-current-state
artifact: contract
domain: email
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# Email HTTP Contract

## Scope

The email surface in this repository has two different contract layers:

- a client-side admin preview API contract expected by `EmailTemplateClient`
- a shipped provider-webhook router contract implemented by
  `createWebhookRouter()`

Unlike CMS and FM, the package currently ships the webhook router but does not
ship a matching admin preview router for the template-preview client SDK.

## Client Preview API Contract

Primary source: `client/src/email/EmailTemplateClient.ts`

Default base URL:

- `/api/admin/email/templates`

### Envelope

The client expects a JSON envelope shaped like:

```json
{
  "success": true,
  "data": {}
}
```

Error payloads may use either `error` or `message`.

### Expected endpoints

| Method | Path                      | Purpose                   | Notes                                                                              |
| ------ | ------------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| `GET`  | `/`                       | List registered templates | Returns `EmailTemplateSummary[]`                                                   |
| `GET`  | `/:templateUid`           | Get template detail       | Returns `EmailTemplateDetail`                                                      |
| `POST` | `/:templateUid/preview`   | Render preview            | Body follows `EmailTemplatePreviewRequest`; returns `EmailTemplatePreviewResponse` |
| `POST` | `/:templateUid/send-test` | Queue test send           | Body: `{ fixtureUid? }`; success payload may be empty                              |

### Type expectations

- list view -> `EmailTemplateSummary[]`
- detail view -> `EmailTemplateDetail`
- preview view -> `EmailTemplatePreviewResponse`
- send-test -> success with no required body payload

### Client behavior notes

- `templateUid` is URL-encoded and may contain slashes
- preview and test-send are POST requests even though preview is read-like
- hook-level consumers expect fixture-aware previewing and test sending to share
  the same selected fixture state

## Shipped Webhook Router Contract

Primary source: `server/src/email/webhooks/router.ts`

This router is mount-point agnostic. Typical examples mount it under a path such
as `/webhooks`.

### Supported provider keys

- `mailerlite`
- `resend`
- `ses`

### Endpoints

| Method | Path         | Purpose                                 | Notes                                                                                |
| ------ | ------------ | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `POST` | `/:provider` | Receive signed provider webhook payload | Requires raw body; verifies signature before parsing events                          |
| `GET`  | `/:provider` | Challenge or readiness endpoint         | Echoes `challenge` or `hub.challenge` when present, otherwise returns readiness JSON |

### POST behavior

Observed status behavior:

- `200` -> signature verified and events processed successfully
- `401` -> invalid signature
- `404` -> unknown provider key
- `500` -> raw body unavailable, verification failure, or processing error

### GET behavior

- If `challenge` or `hub.challenge` query param exists, the router responds with
  the raw challenge text
- Otherwise it returns a small readiness payload including provider and
  timestamp

## Request/Response Types

### Preview API types

- `EmailTemplateSummary`
- `EmailTemplateDetail`
- `EmailTemplatePreviewRequest`
- `EmailTemplatePreviewResponse`

### Webhook types

- `WebhookEvent`
- `BounceEvent`
- `ComplaintEvent`
- `UnsubscribeEvent`
- `DeliveryEvent`
- `OpenEvent`
- `ClickEvent`

## Contract Notes

- The preview API is a consumer-implemented contract inferred from the shipped
  client SDK, not a server router exported by this package.
- The webhook router must be mounted before JSON/body parsers because it relies
  on raw request bodies for signature verification.
- The server registry and providers define email-template behavior, but the
  repository leaves the HTTP preview administration layer to consuming apps.
