# CMS Connector Authoring Guide

How to write a new CMS connector for `@user27828/shared-utils`. A connector adapts a specific database or storage backend to the CMS core service.

## Architecture Overview

```
CmsServiceCore (shared-utils)
  ├── Domain rules: validation, sanitization, concurrency, password hashing
  ├── Orchestration: what "create", "update", "publish" mean
  └── Delegates persistence to → CmsConnector (your connector)
                                    ├── DB queries
                                    ├── Column aliasing
                                    └── Connection management
```

The core owns **semantics**. The connector owns **persistence**. The connector must never perform sanitization, ETag computation, password hashing, or slug validation -- those are core responsibilities.

## The CmsConnector Interface

Your connector must implement the `CmsConnector` interface:

```ts
import type { CmsConnector } from "@user27828/shared-utils/cms/server";
```

### Required methods

```ts
interface CmsConnector {
  // ── Head table CRUD ─────────────────────────────────────────
  getByUid(uid: string): Promise<CmsHeadRow | null>;
  insert(row: Partial<CmsHeadRow> & { uid: string }): Promise<CmsHeadRow>;
  updateByUid(uid: string, patch: Partial<CmsHeadRow>): Promise<CmsHeadRow | null>;
  deleteByUid(uid: string): Promise<void>;
  list(params: CmsListRequest): Promise<CmsListResponse>;

  // ── Public read ─────────────────────────────────────────────
  getPublishedBySlug(params: {
    postType: string; locale: string; slug: string;
  }): Promise<CmsHeadRow | null>;

  // ── History ─────────────────────────────────────────────────
  insertHistory(row: {
    cms_uid: string; revision: number; snapshot: unknown; created_by: string | null;
  }): Promise<CmsHistoryRow>;
  listHistory(params: {
    cmsUid: string; limit?: number; offset?: number; includeSoftDeleted?: boolean;
  }): Promise<{ items: CmsHistoryRow[]; totalCount: number }>;
  getHistoryById(id: number): Promise<CmsHistoryRow | null>;
  updateHistoryById(id: number, patch: Partial<CmsHistoryRow>): Promise<CmsHistoryRow | null>;
  deleteHistoryById(id: number): Promise<void>;

  // ── Collaborators ───────────────────────────────────────────
  listCollaborators(cmsUid: string): Promise<CmsCollaboratorRow[]>;
  replaceCollaborators(
    cmsUid: string,
    collaborators: Array<{ user_uid: string; role: string }>,
  ): Promise<CmsCollaboratorRow[]>;
}
```

### Optional capability: public head

For efficient 304/password-gating without fetching the full content body, implement `CmsConnectorWithPublicHead`:

```ts
import type { CmsConnectorWithPublicHead } from "@user27828/shared-utils/cms/server";

interface CmsConnectorWithPublicHead extends CmsConnector {
  getPublicHeadBySlug(params: {
    postType: string; locale: string; slug: string;
  }): Promise<CmsPublicHead | null>;
}
```

The core auto-detects this capability via the `hasPublicHead()` type guard. If your connector does not implement it, the core falls back to `getPublishedBySlug()` and derives head data (at the cost of a full row read).

## Method Responsibilities

### getByUid

- Return the full `CmsHeadRow` for a UID, or `null` if not found.
- Must include all schema fields (see `CmsHeadRowSchema`).

### insert

- Receive a partial row with at least `uid` set.
- Persist to the database and return the full inserted row.
- Map API field names to DB column names if they differ (e.g., `content` -> `body`).

### updateByUid

- Apply only the fields present in `patch`.
- Return the full updated row, or `null` if the UID was not found.
- **Do not** delete or drop fields from the patch. The core already filters which fields to include.

### deleteByUid

- Permanently delete the row. No soft-delete -- the core enforces trash-first semantics before calling this.

### list

Accepts `CmsListRequest`:

```ts
interface CmsListRequest {
  q?: string;           // full-text search
  status?: "draft" | "published" | "trash";
  post_type?: string;
  locale?: string;
  tag?: string;
  limit?: number;
  offset?: number;
  orderBy?: "created_at" | "updated_at" | "published_at" | "title" | "slug";
  orderDirection?: "asc" | "desc";
  includeTrash?: boolean;
}
```

Returns `CmsListResponse`:

```ts
interface CmsListResponse {
  items: CmsHeadRow[];
  totalCount: number;
  limit: number;
  offset: number;
}
```

Key behaviors:

- If `status` is set, filter by that status.
- If `includeTrash` is false or not set, exclude trashed items from unfiltered lists.
- `q` should search across `title`, `slug`, and optionally `content`.
- `totalCount` is the count matching the filters (not the page size).
- Apply reasonable defaults for unbounded queries (e.g., limit: 50, max: 200).

### getPublishedBySlug

- Filter: `status = "published"`, `archived_at IS NULL`, `published_at <= now()`.
- Match on `(post_type, locale, slug)` triple.
- Return the full row, or `null`.

### getPublicHeadBySlug (optional)

- Same filters as `getPublishedBySlug`, but select only lightweight columns:
  - `uid`, `post_type`, `locale`, `slug`, `status`, `etag`, `version_number`, `password_hash`, `password_version`, `published_at`, `archived_at`
- Return as `CmsPublicHead`, or `null`.

### History methods

- `insertHistory` -- Insert a history snapshot. The `snapshot` field is a JSON object (the core builds it).
- `listHistory` -- Return paginated history for a CMS UID. Exclude soft-deleted rows by default (`soft_deleted_at IS NULL`), unless `includeSoftDeleted` is true.
- `getHistoryById` -- Return a single history row by its auto-increment ID.
- `updateHistoryById` -- Partial update (used for soft-delete: setting `soft_deleted_at` and `soft_deleted_by`).
- `deleteHistoryById` -- Hard-delete a history row.

### Collaborator methods

- `listCollaborators` -- Return all collaborator rows for a CMS UID.
- `replaceCollaborators` -- Atomically replace all collaborators: delete existing, insert new. Return the new list.

## Column Aliasing

If your database uses different column names than the CMS API fields, the connector is responsible for mapping both directions.

Example from the Supabase connector:

| API field (`CmsHeadRow`) | DB column |
|---|---|
| `content` | `body` |
| `userUid` | `created_by` |

The core always speaks in API field names. Your connector translates at the persistence boundary.

## Error Handling

Connectors should throw plain `Error` instances for database-level failures. The core catches connector errors and wraps them as appropriate (e.g., a missing row becomes a `CmsNotFoundError`).

Do **not** throw CMS error classes (`CmsNotFoundError`, etc.) from the connector. Return `null` for "not found" cases; let the core decide whether that is an error.

## Minimal Example: In-Memory Connector

```ts
import type { CmsConnector } from "@user27828/shared-utils/cms/server";
import type {
  CmsHeadRow,
  CmsHistoryRow,
  CmsListRequest,
  CmsListResponse,
  CmsCollaboratorRow,
} from "@user27828/shared-utils/cms";

export class InMemoryCmsConnector implements CmsConnector {
  private rows = new Map<string, CmsHeadRow>();
  private history: CmsHistoryRow[] = [];
  private historySeq = 0;
  private collaborators = new Map<string, CmsCollaboratorRow[]>();

  async getByUid(uid: string): Promise<CmsHeadRow | null> {
    return this.rows.get(uid) ?? null;
  }

  async insert(row: Partial<CmsHeadRow> & { uid: string }): Promise<CmsHeadRow> {
    const full = { ...row } as CmsHeadRow;
    this.rows.set(row.uid, full);
    return full;
  }

  async updateByUid(uid: string, patch: Partial<CmsHeadRow>): Promise<CmsHeadRow | null> {
    const existing = this.rows.get(uid);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, ...patch };
    this.rows.set(uid, updated);
    return updated;
  }

  async deleteByUid(uid: string): Promise<void> {
    this.rows.delete(uid);
  }

  async list(params: CmsListRequest): Promise<CmsListResponse> {
    let items = Array.from(this.rows.values());

    if (params.status) {
      items = items.filter((r) => r.status === params.status);
    }
    if (params.post_type) {
      items = items.filter((r) => r.post_type === params.post_type);
    }
    if (params.locale) {
      items = items.filter((r) => r.locale === params.locale);
    }
    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.slug?.toLowerCase().includes(q),
      );
    }

    const totalCount = items.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    items = items.slice(offset, offset + limit);

    return { items, totalCount, limit, offset };
  }

  async getPublishedBySlug(params: {
    postType: string; locale: string; slug: string;
  }): Promise<CmsHeadRow | null> {
    for (const row of this.rows.values()) {
      if (
        row.status === "published" &&
        row.post_type === params.postType &&
        row.locale === params.locale &&
        row.slug === params.slug &&
        !row.archived_at
      ) {
        return row;
      }
    }
    return null;
  }

  async insertHistory(row: {
    cms_uid: string; revision: number; snapshot: unknown; created_by: string | null;
  }): Promise<CmsHistoryRow> {
    const entry: CmsHistoryRow = {
      id: ++this.historySeq,
      cms_uid: row.cms_uid,
      revision: row.revision,
      snapshot: row.snapshot,
      created_by: row.created_by,
      created_at: new Date().toISOString(),
    };
    this.history.push(entry);
    return entry;
  }

  async listHistory(params: {
    cmsUid: string; limit?: number; offset?: number; includeSoftDeleted?: boolean;
  }): Promise<{ items: CmsHistoryRow[]; totalCount: number }> {
    let items = this.history.filter((h) => h.cms_uid === params.cmsUid);
    if (!params.includeSoftDeleted) {
      items = items.filter((h) => !h.soft_deleted_at);
    }
    const totalCount = items.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    return { items: items.slice(offset, offset + limit), totalCount };
  }

  async getHistoryById(id: number): Promise<CmsHistoryRow | null> {
    return this.history.find((h) => h.id === id) ?? null;
  }

  async updateHistoryById(
    id: number, patch: Partial<CmsHistoryRow>,
  ): Promise<CmsHistoryRow | null> {
    const idx = this.history.findIndex((h) => h.id === id);
    if (idx < 0) {
      return null;
    }
    this.history[idx] = { ...this.history[idx], ...patch };
    return this.history[idx];
  }

  async deleteHistoryById(id: number): Promise<void> {
    this.history = this.history.filter((h) => h.id !== id);
  }

  async listCollaborators(cmsUid: string): Promise<CmsCollaboratorRow[]> {
    return this.collaborators.get(cmsUid) ?? [];
  }

  async replaceCollaborators(
    cmsUid: string,
    collaborators: Array<{ user_uid: string; role: string }>,
  ): Promise<CmsCollaboratorRow[]> {
    const rows: CmsCollaboratorRow[] = collaborators.map((c, i) => ({
      id: i + 1,
      cms_uid: cmsUid,
      user_uid: c.user_uid,
      role: c.role,
      created_at: new Date().toISOString(),
    }));
    this.collaborators.set(cmsUid, rows);
    return rows;
  }
}
```

## Using Your Connector

```ts
import { CmsServiceCore } from "@user27828/shared-utils/cms/server";
import { InMemoryCmsConnector } from "./InMemoryCmsConnector";

const connector = new InMemoryCmsConnector();
const core = new CmsServiceCore({
  connector,
  reservedSlugs: ["admin", "api"],
});

// Use with Express routers
import { createCmsAdminRouter, createCmsPublicRouter } from "@user27828/shared-utils/cms/server";

app.use("/api/admin/cms", authMiddleware, createCmsAdminRouter({ service: core, authz }));
app.use("/api/public/cms", createCmsPublicRouter({ service: core }));
```

## Conformance Tests

shared-utils ships a reusable test harness that validates any connector implementation against the expected contract. Run it from your test suite:

```ts
import { runCmsConnectorConformanceTests } from "@user27828/shared-utils/cms/server";
import { InMemoryCmsConnector } from "./InMemoryCmsConnector";

runCmsConnectorConformanceTests({
  name: "InMemoryCmsConnector",
  factory: async () => {
    const connector = new InMemoryCmsConnector();
    return { connector };
  },
  cleanup: async (connector) => {
    // Optional: tear down test data
  },
  ownerUid: "test-user-001", // optional, default: "test-user-001"
});
```

### What the conformance harness tests

The harness exercises every `CmsConnector` method:

| Test | What it validates |
|---|---|
| **insert + getByUid** | Inserted row is retrievable by UID with correct field values |
| **updateByUid** | Partial updates are applied and persisted |
| **deleteByUid** | Row is removed and subsequent `getByUid` returns null |
| **list with status filter** | Items filtered by status return only matching rows |
| **list with pagination** | `limit` and `offset` are respected |
| **getPublishedBySlug** | Published rows are found by (postType, locale, slug) triple |
| **getPublishedBySlug (miss)** | Non-existent slugs return null |
| **insertHistory + listHistory** | History entries persist and are listed for the correct CMS UID |
| **getHistoryById** | Single history entry is retrievable by auto-increment ID |
| **updateHistoryById** | Soft-delete fields are applied |
| **deleteHistoryById** | History entry is permanently removed |
| **listCollaborators + replaceCollaborators** | Replacement is atomic; cleared list returns empty array |

### Integrating with your test runner

The harness auto-detects `describe`, `it`, `expect`, `beforeAll`, and `afterAll` from `globalThis`. If your test framework uses different globals, pass them explicitly:

```ts
runCmsConnectorConformanceTests({
  name: "MyConnector",
  factory: async () => ({ connector: new MyConnector() }),
  describe: Deno.test.describe,
  it: Deno.test.it,
  expect: Deno.test.expect,
  beforeAll: Deno.test.beforeAll,
  afterAll: Deno.test.afterAll,
});
```

## Database Schema Requirements

The CMS core is schema-agnostic, but your connector's backing database must support the following logical tables:

### `cms` (head table)

| Column | Type | Notes |
|---|---|---|
| `uid` | text, PK | Unique content identifier |
| `title` | text | |
| `content` (or `body`) | text | Content body |
| `content_type` | text | `text/html`, `text/markdown`, `application/json`, `text/plain` |
| `slug` | text | URL-safe identifier, unique per (post_type, locale) |
| `locale` | text | e.g., `en`, `es` |
| `post_type` | text | `post`, `page`, `blog`, `faq`, etc. |
| `options` | jsonb | Arbitrary metadata (OG tags, SEO, etc.) |
| `tags` | text[] | Tag array |
| `password_hash` | text, nullable | bcrypt hash for password-protected content |
| `password_version` | int | Incremented on password change |
| `status` | text | `draft`, `published`, `trash` |
| `etag` | text | Concurrency token (computed by core) |
| `version_number` | int | Monotonically increasing |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `published_at` | timestamptz, nullable | |
| `first_published_at` | timestamptz, nullable | |
| `locked_by` | uuid, nullable | User UID holding the lock |
| `locked_at` | timestamptz, nullable | |
| `trashed_at` | timestamptz, nullable | |
| `trashed_by` | uuid, nullable | |
| `archived_at` | timestamptz, nullable | |
| `userUid` / `created_by` | uuid, nullable | Content author |

### `cms_history` (revision table)

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | Auto-increment |
| `cms_uid` | text, FK | References `cms.uid` |
| `revision` | int | Version number at time of snapshot |
| `snapshot` | jsonb | Full row snapshot |
| `created_by` | uuid, nullable | |
| `soft_deleted_at` | timestamptz, nullable | |
| `soft_deleted_by` | uuid, nullable | |
| `created_at` | timestamptz | |

### `cms_collaborators` (collaborator table)

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `cms_uid` | text, FK | References `cms.uid` |
| `user_uid` | uuid | |
| `role` | text | e.g., `author`, `reviewer` |
| `created_at` | timestamptz | |

Exact column names may differ. The connector is responsible for mapping between the API field names (`CmsHeadRow`) and whatever your database uses.

## Checklist for a New Connector

1. [ ] Implement all `CmsConnector` methods
2. [ ] Optionally implement `CmsConnectorWithPublicHead` for efficient public reads
3. [ ] Handle column aliasing in both directions (API -> DB, DB -> API)
4. [ ] Return `null` for not-found cases (do not throw)
5. [ ] Do not perform sanitization, ETag computation, or password hashing
6. [ ] Support `CmsListRequest` filtering: status, post_type, locale, tag, q, pagination, ordering
7. [ ] Support soft-delete filtering in `listHistory` (exclude `soft_deleted_at IS NOT NULL` by default)
8. [ ] Implement atomic `replaceCollaborators` (delete + insert in one transaction if possible)
9. [ ] Pass the conformance test harness
10. [ ] Document any database-specific setup requirements (schema, extensions, permissions)
