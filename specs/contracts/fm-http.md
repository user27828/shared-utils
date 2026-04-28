---
title: shared-utils FM HTTP Contract
feature: shared-utils-current-state
artifact: contract
domain: fm
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# FM HTTP Contract

## Scope

This document captures the FM HTTP surface represented by:

- `client/src/fm/FmClient.ts`
- `client/src/fm/FmApi.ts`
- `server/src/fm/express/adminRouter.ts`
- `server/src/fm/express/publicRouter.ts`
- `server/src/fm/express/contentRouter.ts`

Default or common mount points:

- Admin: `/api/fm`
- Public media: `/media`
- Authenticated content router: consumer-defined, commonly a short path such as
  `/fm`

## Transport Conventions

### Envelope

Most admin endpoints return:

```json
{
  "success": true,
  "data": {}
}
```

Proxy upload endpoints accept raw binary bodies instead of JSON.

### Query conventions

- Listing uses `search`, `limit`, `offset`, `includeArchived`, `isPublic`,
  `orderBy`, `orderDirection`, `ownerUserUid`, `includeVariants`
- File delivery uses `variantKind`, `variant`, `v`, `w`, `download`, or `dl`
  depending on router and URL builder

### Auth expectations

- Admin endpoints assume host-mounted auth plus the FM authz adapter
- Public media router serves only public, non-archived files
- Authenticated content router serves private or public content to authenticated
  users, with ownership enforcement for non-public files

## Admin API

### Upload lifecycle

| Method | Path                                 | Purpose                        | Notes                                     |
| ------ | ------------------------------------ | ------------------------------ | ----------------------------------------- |
| `POST` | `/upload/init`                       | Begin original upload          | Body follows `FmUploadInitRequest`        |
| `POST` | `/upload/finalize`                   | Finalize direct upload         | Body includes `fileUid` and `object`      |
| `POST` | `/upload/:fileUid/proxy`             | Proxied binary upload          | Raw body endpoint                         |
| `POST` | `/variants/upload/init`              | Begin variant upload           | Body follows `FmVariantUploadInitRequest` |
| `POST` | `/variants/upload/finalize`          | Finalize direct variant upload | Body includes `variantUid` and `object`   |
| `POST` | `/variants/upload/:variantUid/proxy` | Proxied binary variant upload  | Raw body endpoint                         |

### File CRUD and lifecycle

| Method   | Path                      | Purpose               | Notes                                                                            |
| -------- | ------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| `GET`    | `/files`                  | List files            | Supports search, pagination, archive/public filters, sorting, variants inclusion |
| `GET`    | `/files/:fileUid`         | Get file              | Returns one `FmFileRow`                                                          |
| `PATCH`  | `/files/:fileUid`         | Patch file metadata   | Mutable fields: title, alt text, tags, public flag                               |
| `POST`   | `/files/:fileUid/rename`  | Rename file           | Body: `{ originalFilename }`                                                     |
| `POST`   | `/files/:fileUid/archive` | Archive file          | Soft-delete lifecycle step                                                       |
| `POST`   | `/files/:fileUid/restore` | Restore archived file | Reverses archive                                                                 |
| `DELETE` | `/files/:fileUid`         | Delete file           | May archive instead unless `force=true`                                          |
| `POST`   | `/files/:fileUid/move`    | Move file             | Body: `{ toBucket?, toFolderPath? }`                                             |

### Metadata and variants

| Method | Path                              | Purpose                      | Notes                                                |
| ------ | --------------------------------- | ---------------------------- | ---------------------------------------------------- |
| `GET`  | `/files/:fileUid/url`             | Resolve read URL             | Returns public/signed/canonical URL result           |
| `GET`  | `/files/:fileUid/object-metadata` | Read storage metadata        | Supports `variantKind` query                         |
| `GET`  | `/files/:fileUid/variants`        | List variants                | Returns variant rows                                 |
| `GET`  | `/files/:fileUid/content`         | Stream authenticated content | Used when no explicit `contentBaseUrl` is configured |

### Link management

These routes are optional and exist only when `allowLinks` is enabled on the
admin router.

| Method   | Path                    | Purpose     | Notes                                     |
| -------- | ----------------------- | ----------- | ----------------------------------------- |
| `GET`    | `/files/:fileUid/links` | List links  | Supports pagination                       |
| `POST`   | `/files/:fileUid/links` | Create link | Body: linked entity type/uid/field        |
| `DELETE` | `/files/:fileUid/links` | Delete link | Query-driven delete by entity identifiers |

## Public and Authenticated Delivery Contracts

### Public media router

| Method | Path          | Purpose               | Notes                   |
| ------ | ------------- | --------------------- | ----------------------- | ------- | ---------------------------------------------------- |
| `GET`  | `/media/:uid` | Public asset delivery | Supports `variant=thumb | preview | web`, width-based fallback via `w`, and `download=1` |

Observed behavior:

- Returns `404` for non-public or archived files
- Returns `ETag` derived from file SHA-256 when available
- Can redirect to signed URLs for S3-backed objects
- Can stream local files directly
- Can fall back from missing variants to the original asset

### Authenticated content router

| Method | Path    | Purpose                      | Notes                                                             |
| ------ | ------- | ---------------------------- | ----------------------------------------------------------------- |
| `GET`  | `/:uid` | Authenticated asset delivery | Supports `v`, `w`, `dl`; enforces ownership unless file is public |

Observed behavior:

- Intended for short embeddable authenticated URLs
- Uses `X-Content-Type-Options: nosniff`
- Forces download disposition for dangerous MIME types
- Supports redirect or local streaming depending on storage provider

## Client URL Builder Expectations

The shipped client also treats these as contract surfaces:

- `getContentUrl()`
  - explicit content base: `<contentBaseUrl>/<uid>?v=thumb&w=...&dl=1`
  - fallback admin streaming: `<adminBaseUrl>/files/<uid>/content?...`
- `getProxyUploadUrl()` -> `<adminBaseUrl>/upload/<fileUid>/proxy`
- `getVariantProxyUploadUrl()` ->
  `<adminBaseUrl>/variants/upload/<variantUid>/proxy`
- `getPublicMediaUrl()` -> `<publicBaseUrl>/<fileUid>`

## Request/Response Types

### Request bodies

- `FmUploadInitRequest`
- `FmVariantUploadInitRequest`
- rename, patch, move, and link payloads

### Response bodies

- `FmUploadInitResponse`
- `FmUploadFinalizeResponse`
- `FmVariantUploadInitResponse`
- `FmVariantUploadFinalizeResponse`
- `FmFileListResult`
- `FmDeleteResult`
- `FmReadUrlResult`

## Contract Notes

- Upload workflows are intentionally multi-step and must not be collapsed into a
  single blind upload call by consuming applications.
- File deletion is a policy-aware operation, not always a hard delete.
- Public delivery and authenticated delivery are separate router concerns even
  when they resolve through the same `FmServiceCore`.
