# FM Connector Authoring Guide

How to write a new FM connector for `@user27828/shared-utils`. A connector adapts a specific database or storage backend to the FM service core.

## Architecture Overview

```
FmServiceCore (shared-utils)
  ├── Upload orchestration: presigned URLs, proxy uploads, finalization
  ├── MIME sniffing, SHA-256 hashing, image dimension extraction
  ├── Archive/restore/delete lifecycle
  ├── Variant picking, URL resolution, content streaming
  ├── Link management, metadata patching
  └── Delegates persistence to → FmConnector (your connector)
                                    ├── File CRUD
                                    ├── Variant CRUD
                                    ├── Link CRUD
                                    └── Connection management
```

The core owns **semantics** (validation, hashing, lifecycle rules). The connector owns **persistence** (DB queries, column aliasing, connection management). The connector must never perform validation, MIME detection, SHA-256 computation, or access control -- those are core responsibilities.

## The FmConnector Interface

Your connector must implement the `FmConnector` interface:

```ts
import type { FmConnector } from "@user27828/shared-utils/fm/server";
```

### Required methods

```ts
interface FmConnector {
  // ── File CRUD ───────────────────────────────────────────────────
  getFileByUid(uid: string): Promise<FmFileRow | null>;
  insertFile(row: FmFileInsert): Promise<FmFileRow>;
  updateFileByUid(
    uid: string,
    patch: Partial<FmFileRow>,
  ): Promise<FmFileRow | null>;
  deleteFileByUid(uid: string): Promise<void>;
  listFiles(params: FmFileListFilters): Promise<FmFileListResult>;

  // ── Variant CRUD ────────────────────────────────────────────────
  getVariantByUid(uid: string): Promise<FmFileVariantRow | null>;
  listVariantsForFile(fileUid: string): Promise<FmFileVariantRow[]>;
  insertVariant(row: FmVariantInsert): Promise<FmFileVariantRow>;
  updateVariantByUid(
    uid: string,
    patch: Partial<FmFileVariantRow>,
  ): Promise<FmFileVariantRow | null>;
  deleteVariantsForFile(fileUid: string): Promise<void>;

  // ── Link CRUD ───────────────────────────────────────────────────
  countLinksForFile(fileUid: string): Promise<number>;
  createLink(params: FmFileLinkInsert): Promise<FmFileLinkRow>;
  deleteLink(params: FmFileLinkDeleteParams): Promise<void>;
  listLinksForFile(params: FmFileLinkListParams): Promise<FmFileLinkListResult>;
}
```

### Optional capabilities

**`FmConnectorWithTransaction`** -- adds transactional support for multi-step atomic operations:

```ts
interface FmConnectorWithTransaction extends FmConnector {
  withTransaction<T>(fn: (txConnector: FmConnector) => Promise<T>): Promise<T>;
}
```

**`FmConnectorWithBatchVariantDelete`** -- adds bulk variant deletion:

```ts
interface FmConnectorWithBatchVariantDelete extends FmConnector {
  deleteVariantsByUids(uids: string[]): Promise<void>;
}
```

The core auto-detects these capabilities via type guards:

```ts
import {
  hasTransaction,
  hasBatchVariantDelete,
} from "@user27828/shared-utils/fm/server";

if (hasTransaction(connector)) {
  await connector.withTransaction(async (tx) => {
    // atomic operations
  });
}
```

## Method Responsibilities

### File CRUD

**`getFileByUid`**

- Return the full `FmFileRow` for a UID, or `null` if not found.
- Must include all schema fields.

**`insertFile`**

- Receive an `FmFileInsert` object with all required fields.
- Persist and return the full inserted row.
- Map API field names to DB column names if they differ.

**`updateFileByUid`**

- Apply only the fields present in `patch`.
- Return the full updated row, or `null` if not found.
- Do not filter, add, or remove patch fields -- the core controls the patch shape.

**`deleteFileByUid`**

- Permanently delete the file row. The core enforces archive-first semantics before calling this.
- Also clean up associated variants and links if your DB does not cascade.

**`listFiles`**

- Accept `FmFileListFilters`: `search`, `limit`, `offset`, `includeArchived`, `isPublic`, `orderBy`, `orderDirection`, `ownerUserUid`.
- Return `FmFileListResult`: `{ items: FmFileRow[], totalCount: number, limit: number, offset: number }`.
- If `includeArchived` is false, exclude files with `archived_at IS NOT NULL`.
- If `ownerUserUid` is set, filter to files owned by that user.
- `search` should match against `title`, `original_filename`, and optionally `tags`.
- `totalCount` is the count matching filters (not page size).

### Variant CRUD

**`getVariantByUid`**

- Return a single variant row by its UID, or `null`.

**`listVariantsForFile`**

- Return all variant rows for a given file UID.

**`insertVariant`**

- Persist a new variant row and return it.

**`updateVariantByUid`**

- Partial update; return updated row or `null`.

**`deleteVariantsForFile`**

- Delete all variant rows for a file UID. Called during file deletion.

### Link CRUD

**`countLinksForFile`**

- Return the count of entity links for a file. Used by the core to decide soft-delete vs hard-delete.

**`createLink`**

- Create a link between a file and an entity. Return the created link row.

**`deleteLink`**

- Delete a specific link by matching params (`fileUid`, `linkedEntityType`, `linkedEntityUid`, optionally `linkedField`).

**`listLinksForFile`**

- List links for a file with pagination.

## Error Handling

Connectors should throw plain `Error` instances for database-level failures. Return `null` for "not found" cases; let the core decide whether that constitutes an error.

Do **not** throw FM error classes (`FmNotFoundError`, etc.) from the connector.

## Column Aliasing

If your database uses different column names than the FM API fields, the connector is responsible for mapping in both directions.

Example from the Supabase connector:

| API field (`FmFileRow`) | DB column           |
| ----------------------- | ------------------- |
| `uid`                   | `uid`               |
| `owner_user_uid`        | `owner_user_uid`    |
| `original_filename`     | `original_filename` |
| `mime_type`             | `mime_type`         |
| `sha256`                | `sha256`            |
| `is_public`             | `is_public`         |
| `archived_at`           | `archived_at`       |

The core always speaks in API field names. Your connector translates at the persistence boundary.

## Using Your Connector

```ts
import {
  FmServiceCore,
  parseFmServerConfig,
  createFmStorage,
} from "@user27828/shared-utils/fm/server";
import { MyCustomConnector } from "./MyCustomConnector";

const connector = new MyCustomConnector(dbClient);
const fmConfig = parseFmServerConfig(process.env);
const storage = await createFmStorage(fmConfig);

const service = new FmServiceCore({
  config: fmConfig,
  connector,
  storage,
  onWrite: (event) => console.log("FM write:", event.action, event.fileUid),
});

// Use with Express routers
import {
  createFmAuthz,
  createFmRouter,
  createFmPublicRouter,
  createFmContentRouter,
} from "@user27828/shared-utils/fm/server";

const authz = createFmAuthz({ resolveContext: myResolver });

app.use(
  "/api/fm",
  authMiddleware,
  authz.middleware,
  createFmRouter({ service, authz }),
);
app.use(
  "/fm",
  authMiddleware,
  authz.middleware,
  createFmContentRouter({ service, authz }),
);
app.use("/media", createFmPublicRouter({ service }));
```

## Conformance Tests

shared-utils ships a reusable test harness that validates any connector against the expected contract:

```ts
import { runFmConnectorConformanceTests } from "@user27828/shared-utils/fm/server";
import { MyCustomConnector } from "./MyCustomConnector";

runFmConnectorConformanceTests({
  name: "MyCustomConnector",
  factory: async () => {
    const connector = new MyCustomConnector(testDbClient);
    return { connector };
  },
  cleanup: async (connector) => {
    // Optional: tear down test data
  },
  ownerUid: "test-user-001",
});
```

### What the conformance harness tests

| Section          | Tests | What it validates                                                                   |
| ---------------- | ----- | ----------------------------------------------------------------------------------- |
| **File CRUD**    | 4     | insert+get, update patch, delete, null for nonexistent                              |
| **File Listing** | 4     | Owner filter, archived filter, search term, pagination                              |
| **Variant CRUD** | 4     | insert+get, list for file, update patch, delete all for file                        |
| **Link CRUD**    | 5     | create+count, list for file, delete specific, delete by field, count=0 for unlinked |

### Integrating with your test runner

The harness auto-detects `describe`, `it`, `expect`, `beforeAll`, and `afterAll` from `globalThis`. If your test framework uses different globals, pass them explicitly:

```ts
runFmConnectorConformanceTests({
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

The FM core is schema-agnostic, but your connector's backing database must support the following logical tables:

### `fm_files` (file table)

| Column              | Type                  | Notes                                             |
| ------------------- | --------------------- | ------------------------------------------------- |
| `uid`               | text, PK              | Unique file identifier                            |
| `owner_user_uid`    | uuid                  | File owner                                        |
| `original_filename` | text                  | Original upload filename                          |
| `mime_type`         | text                  | Detected MIME type                                |
| `size_bytes`        | bigint                | File size in bytes                                |
| `sha256`            | text                  | Content hash (computed by core)                   |
| `bucket`            | text                  | Storage bucket name                               |
| `object_key`        | text                  | Storage object key/path                           |
| `title`             | text, nullable        | User-assigned title                               |
| `alt_text`          | text, nullable        | Accessibility text                                |
| `tags`              | text[]                | Tag array                                         |
| `purpose`           | text                  | Upload purpose (e.g., `general`, `avatar`, `cms`) |
| `is_public`         | boolean               | Whether file is publicly accessible               |
| `width`             | int, nullable         | Image width in pixels                             |
| `height`            | int, nullable         | Image height in pixels                            |
| `storage_provider`  | text                  | `local` or `s3`                                   |
| `archived_at`       | timestamptz, nullable | Soft-archive timestamp                            |
| `created_at`        | timestamptz           |                                                   |
| `updated_at`        | timestamptz           |                                                   |

### `fm_file_variants` (variant table)

| Column             | Type          | Notes                                   |
| ------------------ | ------------- | --------------------------------------- |
| `uid`              | text, PK      | Unique variant identifier               |
| `file_uid`         | text, FK      | References `fm_files.uid`               |
| `kind`             | text          | Variant kind: `thumb`, `preview`, `web` |
| `mime_type`        | text          |                                         |
| `size_bytes`       | bigint        |                                         |
| `sha256`           | text          |                                         |
| `bucket`           | text          |                                         |
| `object_key`       | text          |                                         |
| `width`            | int, nullable |                                         |
| `height`           | int, nullable |                                         |
| `storage_provider` | text          |                                         |
| `created_at`       | timestamptz   |                                         |

### `fm_file_links` (entity link table)

| Column               | Type           | Notes                                |
| -------------------- | -------------- | ------------------------------------ |
| `id`                 | serial, PK     | Auto-increment                       |
| `file_uid`           | text, FK       | References `fm_files.uid`            |
| `linked_entity_type` | text           | Entity type (e.g., `cms`, `profile`) |
| `linked_entity_uid`  | text           | Entity UID                           |
| `linked_field`       | text, nullable | Specific field name                  |
| `created_at`         | timestamptz    |                                      |

Exact column names may differ. The connector is responsible for mapping between API field names and database columns.

## Checklist for a New Connector

1. [ ] Implement all 14 `FmConnector` methods (5 file, 5 variant, 4 link)
2. [ ] Optionally implement `FmConnectorWithTransaction` for atomic operations
3. [ ] Optionally implement `FmConnectorWithBatchVariantDelete` for bulk variant removal
4. [ ] Handle column aliasing in both directions (API -> DB, DB -> API)
5. [ ] Return `null` for not-found cases (do not throw FM error classes)
6. [ ] Support `FmFileListFilters` filtering: search, archived, is_public, owner, pagination, ordering
7. [ ] Implement cascade delete or handle variant/link cleanup in `deleteFileByUid`
8. [ ] Implement atomic `replaceCollaborators`-style patterns where applicable
9. [ ] Pass the conformance test harness (17 tests across 4 sections)
10. [ ] Document any database-specific setup requirements (schema, extensions, permissions)
