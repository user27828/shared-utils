---
title: shared-utils Cloudflare Email Provider Quickstart
feature: shared-utils-email-cloudflare-provider
artifact: quickstart
status: proposed-enhancement
created: 2026-05-17
updated: 2026-05-17
source: analysis-remediation
---

# Quickstart: shared-utils Cloudflare Email Provider Validation

## Purpose

This document defines the concrete validation path for the Cloudflare provider
enhancement so the implementation can be checked at the runtime, package-surface,
and documentation levels.

## Prerequisites

- Node.js ^22.18.0 or >=24.11.0
- Yarn 4
- Repository dependencies installed
- Optional Cloudflare account credentials, zone ID, and onboarded sender domain
  on a Workers Paid plan account for live smoke validation

## Validation Scenarios

### Scenario A: Targeted provider regression suite

Validation steps:

1. Run:

```bash
cd server && NODE_OPTIONS="--experimental-vm-modules" yarn jest __tests__/email-providers.test.js --runInBand
```

2. Exercise Cloudflare initialization, send payload mapping, recipient-overflow
   rejection, oversize rejection, disallowed-header rejection, timeout
   handling, API-error translation, and non-sending `healthCheck()` behavior.

Expected result:

- Missing `accountId`, `zoneId`, or `apiToken` fails initialization before
  network use.
- Structured messages map to Cloudflare REST fields including `reply_to` and
  normalized attachments.
- Messages that exceed 50 combined recipients, exceed the conservative 5 MiB
  total message limit, or set disallowed headers fail closed locally.
- Cloudflare timeouts and API rejections surface as `EmailProviderError` with
  actionable provider context.
- `healthCheck()` reports health without sending a real email and uses the
  configured `zoneId` to issue a read-only subdomain-list probe.

### Scenario B: Published package surface verification

Validation steps:

1. Run `yarn build` from the repository root.
2. Verify that `dist/server/src/email/providers/cloudflare.js` and
   `dist/server/src/email/providers/cloudflare.d.ts` exist.
3. Run:

```bash
NODE_OPTIONS="--experimental-vm-modules" yarn jest --config jest.config.mjs --runTestsByPath __tests__/package-imports.test.js __tests__/package-structure.test.js __tests__/server-package-distribution.test.js --runInBand
```

4. Confirm the selected integration-project regression suite covers the root
   import and distribution tests rather than relying on root `yarn test` alone.

Expected result:

- The root export map resolves the Cloudflare provider from the provider barrel
  and dedicated subpath.
- The built dist artifacts and type declarations align with `package.json`
  `exports` and `typesVersions`.
- Existing provider exports remain intact.

### Scenario C: Full repository verification

Validation steps:

1. Run `yarn test` from the repository root after the targeted provider checks
   pass.
2. Review failures for any regressions outside the Cloudflare provider change,
   especially package-surface and server email tests.
3. Treat this as supplemental workspace verification, not a replacement for the
   targeted regression command in Scenario B.

Expected result:

- Root workspace tests pass.
- The Cloudflare enhancement does not regress unrelated package behavior.

### Scenario D: Optional live Cloudflare smoke test

Validation steps:

1. Configure `EMAIL_CLOUDFLARE_ENABLED`, `EMAIL_CLOUDFLARE_ACCOUNT_ID`, and
   `EMAIL_CLOUDFLARE_ZONE_ID`, and `EMAIL_CLOUDFLARE_API_TOKEN` for an
   onboarded Cloudflare Email Service account.
2. Use a verified sender domain and a safe recipient address.
3. Send a single transactional message through the provider.
4. Run `healthCheck()` separately and confirm it does not send mail.

Expected result:

- The message is accepted by Cloudflare Email Service.
- The response maps cleanly into `EmailSendResult.providerResponse`.
- `healthCheck()` confirms authenticated reachability through the subdomain-list
  probe without generating a test email.

## Validation Outcome Checklist

- Targeted Cloudflare provider regression coverage passes.
- Root build produces Cloudflare provider dist artifacts and type declarations.
- Root package import and distribution tests validate the Cloudflare provider
  surface.
- Root `yarn test` passes.
- The feature enforces the conservative 5 MiB total message limit and explicit
  recipient/header validation documented in the spec.
- Docs clearly describe the REST API scope, transactional-email positioning,
  and non-sending `healthCheck()` behavior.
