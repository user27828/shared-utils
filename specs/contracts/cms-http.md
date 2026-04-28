---
title: shared-utils CMS HTTP Contract
feature: shared-utils-current-state
artifact: contract
domain: cms
status: current-state-baseline
created: 2026-04-28
updated: 2026-04-28
source: codebase-analysis
---

# CMS HTTP Contract

## Scope

This document captures the CMS HTTP surface currently represented by:

- `client/src/cms/CmsClient.ts`
- `client/src/cms/CmsApi.ts`
- `server/src/cms/express/adminRouter.ts`
- `server/src/cms/express/publicRouter.ts`

Default mount points assumed by the shipped client are:

- Admin: `/api/admin/cms`
- Public: `/api/public/cms`

## Transport Conventions

### Admin envelope

Admin endpoints use a JSON envelope shaped like:

```json
{
  "success": true,
  "data": {}
}
```

Failure responses generally use:

```json
{
  "success": false,
  "message": "...",
  "code": "..."
}
```

### Concurrency and caching

- Versioned mutable endpoints expect `If-Match` headers.
- Resource responses may return `ETag`.
- Public GET supports `If-None-Match` and may respond with `304 Not Modified`.

### Auth expectations

- Admin endpoints rely on host-mounted auth middleware plus the CMS authz
  adapter.
- Public content is unauthenticated by default.
- Public draft preview can require author auth when `previewAuthz` is mounted.

## Admin API

### Content CRUD and lifecycle

| Method   | Path            | Purpose                 | Notes                                                                                                                |
| -------- | --------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/`             | List content            | Supports `q`, `status`, `post_type`, `locale`, `tag`, `limit`, `offset`, `orderBy`, `orderDirection`, `includeTrash` |
| `GET`    | `/:uid`         | Get single item         | Returns row plus optional `history_count`; may return `ETag`                                                         |
| `POST`   | `/`             | Create item             | Request body follows `CmsCreateRequest`                                                                              |
| `PUT`    | `/:uid`         | Update item             | Requires `If-Match`; request body follows `CmsUpdateRequest`                                                         |
| `POST`   | `/:uid/publish` | Publish item            | Requires publisher auth; accepts optional publish timestamp                                                          |
| `POST`   | `/:uid/trash`   | Move item to trash      | Requires `If-Match`                                                                                                  |
| `POST`   | `/:uid/restore` | Restore trashed item    | Requires `If-Match`                                                                                                  |
| `DELETE` | `/:uid`         | Permanently delete item | Hard delete path                                                                                                     |
| `POST`   | `/trash/empty`  | Empty trash in batches  | Returns `{ deletedCount, failedCount }`                                                                              |

### History and metadata

| Method   | Path                               | Purpose                 | Notes                                           |
| -------- | ---------------------------------- | ----------------------- | ----------------------------------------------- | ----- |
| `GET`    | `/:uid/history`                    | List history rows       | Supports `limit`, `offset`, `fields=summary     | full` |
| `POST`   | `/:uid/history/:historyId/restore` | Restore revision        | Requires `If-Match`                             |
| `DELETE` | `/:uid/history/:historyId`         | Soft-delete history row | Keeps revision record with soft-delete metadata |
| `DELETE` | `/:uid/history/:historyId/hard`    | Hard-delete history row | Removes revision permanently                    |
| `PATCH`  | `/:uid/history/:historyId/meta`    | Update history metadata | Patches version label and notes                 |
| `PATCH`  | `/:uid/metadata`                   | Replace metadata bag    | Accepts `CmsMetadata`                           |

### Locks and collaborators

| Method   | Path                  | Purpose               | Notes                                           |
| -------- | --------------------- | --------------------- | ----------------------------------------------- |
| `POST`   | `/:uid/lock`          | Acquire edit lock     | Returns updated row                             |
| `DELETE` | `/:uid/lock`          | Release edit lock     | Returns updated row                             |
| `GET`    | `/:uid/collaborators` | List collaborators    | Returns collaborator rows                       |
| `PUT`    | `/:uid/collaborators` | Replace collaborators | Body: `{ collaborators: [{ user_uid, role }] }` |

## Public API

### Fetch content

| Method | Path                       | Purpose              | Notes                                                                             |
| ------ | -------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| `GET`  | `/:postType/:locale/:slug` | Fetch public content | Supports `preview=1` for draft preview and `If-None-Match` for cache revalidation |

Behavioral outcomes exposed by the client SDK:

- `200` -> `kind: "ok"` with `CmsPublicPayload`
- `304` -> `kind: "not_modified"`
- `401` with `requiresPassword` -> `kind: "password_required"`
- `404` -> `kind: "not_found"`
- Other non-OK -> `kind: "error"`

### Unlock protected content

| Method | Path                              | Purpose                            | Notes                        |
| ------ | --------------------------------- | ---------------------------------- | ---------------------------- |
| `POST` | `/:postType/:locale/:slug/unlock` | Exchange password for unlock token | Body: `{ password: string }` |

Observed status behavior:

- `200` -> `{ token, expiresAt }`
- `400` -> missing/invalid password payload
- `403` -> invalid password
- `404` -> content not found
- `409` -> content is not password protected
- `500` -> token-signing misconfiguration

## Request/Response Types

### Admin request bodies

- `CmsCreateRequest`
- `CmsUpdateRequest`
- `CmsMetadata`
- collaborator replacement payload

### Admin response bodies

- `CmsHeadRow`
- `CmsListResponse`
- history list payloads
- `{ deletedCount, failedCount }` for trash-empty

### Public response bodies

- `CmsPublicPayload`
- unlock token payload `{ token, expiresAt }`

## Contract Notes

- The client SDK normalizes public endpoint results into discriminated unions,
  while admin endpoints throw `CmsClientError` on failure.
- Admin writes are strongly coupled to optimistic concurrency and should not be
  treated as unconditional overwrites.
- Public preview support exists at the router level even though it remains a
  public-path concern, not an admin-path concern.
