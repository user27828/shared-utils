# FM Consumer Guide

How to use the shared-utils File Manager (FM) module in a consuming application. Covers the client SDK, admin UI, and server composition.

## Overview

The FM module is split across three export paths:

| Export path                         | Contents                                                                         | Used by                |
| ----------------------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| `@user27828/shared-utils/fm`        | Isomorphic types, Zod schemas, error classes                                     | Both client and server |
| `@user27828/shared-utils/fm/server` | `FmServiceCore`, connector interface, Express router factories, storage adapters | Server only            |
| `@user27828/shared-utils/fm/client` | `FmClient`, React hooks, media library UI, file picker, image variant utilities  | Client only            |

## 1. Server Composition

### 1.1 Create a connector

A connector adapts a specific database to the FM core. The Supabase connector ships with `@user27828/db-supabase`:

```ts
import { getSupabaseClient } from "@user27828/db-supabase/server";
import { FmConnectorSupabase } from "@user27828/db-supabase/server/fm";

const supabase = getSupabaseClient({ envRole: "service" });
const connector = new FmConnectorSupabase(supabase);
```

If you are writing your own connector, implement the `FmConnector` interface (see the Connector Authoring Guide).

### 1.2 Create storage adapter

FM supports local disk and S3-compatible storage. Use the async factory:

```ts
import {
  parseFmServerConfig,
  createFmStorage,
  FmStorageLocal,
  resolveFmLocalUploadRootAbsPath,
} from "@user27828/shared-utils/fm/server";

// Parse config from environment variables
const fmConfig = parseFmServerConfig(process.env);

// Async factory — auto-detects local vs. S3 from config
let storage;
try {
  storage = await createFmStorage(fmConfig);
} catch {
  // Fallback to local in development
  storage = new FmStorageLocal({
    dataRootAbsPath: resolveFmLocalUploadRootAbsPath(fmConfig),
  });
}
```

> **Note:** `FmStorageS3` requires `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` as peer dependencies. Import it directly from `@user27828/shared-utils/fm/server/s3` if needed.

### 1.3 Create the service core

`FmServiceCore` orchestrates uploads, lifecycle, and content resolution:

```ts
import { FmServiceCore } from "@user27828/shared-utils/fm/server";

const fmService = new FmServiceCore({
  config: fmConfig,
  connector,
  storage,
  onWrite: (event) => {
    console.log("FM write:", event.action, event.fileUid);
  },
});
```

### 1.4 Set up authorization

The auth middleware factory decouples FM user resolution from your app's auth system. FM uses an **owner-or-admin** model (simpler than CMS's role-based approach):

```ts
import { createFmAuthz } from "@user27828/shared-utils/fm/server";
import type { FmContext } from "@user27828/shared-utils/fm";

const fmAuthz = createFmAuthz({
  resolveContext: (req) => {
    const user = (req as any).user;
    if (!user?.auth?.id) {
      throw new Error("Not authenticated");
    }
    return {
      userUid: user.auth.id,
      isAdmin: (user.profile?.roles || []).includes("admin"),
      createdBy: user.auth.id,
    };
  },
});
```

The returned object has two members:

- `fmAuthz.middleware` -- Express middleware; resolves `FmContext` and attaches it via a private Symbol key
- `fmAuthz.getActorContext(req)` -- Extract the `FmContext` from a request (throws if unauthenticated)

### 1.5 Mount Express routers

FM provides four router factories for different access patterns:

```ts
import express from "express";
import {
  createFmRouter,
  createFmPublicRouter,
  createFmContentRouter,
} from "@user27828/shared-utils/fm/server";

const app = express();

// ── Admin/user CRUD routes (authenticated) ────────────────────────────
app.use(
  "/api/fm",
  authMiddleware, // your auth middleware
  fmAuthz.middleware, // resolves FmContext
  createFmRouter({
    service: fmService,
    authz: fmAuthz,
    allowLinks: false, // disable entity links for user router
    enableContentStreaming: true,
    jsonBodyLimit: "2mb",
    proxiedUploadBodyLimit: "25mb",
  }),
);

// ── Admin routes (with links enabled) ─────────────────────────────────
app.use(
  "/api/admin/fm",
  authMiddleware,
  adminRoleCheck,
  fmAdminAuthz.middleware,
  createFmRouter({
    service: fmService,
    authz: fmAdminAuthz,
    allowLinks: true, // enable entity link management
    enableContentStreaming: true,
    jsonBodyLimit: "2mb",
    proxiedUploadBodyLimit: "25mb",
  }),
);

// ── Authenticated content delivery (short URLs) ───────────────────────
app.use(
  "/fm",
  authMiddleware,
  fmContentAuthz.middleware,
  createFmContentRouter({
    service: fmService,
    authz: fmContentAuthz,
    enableVariantFallback: true,
  }),
);

// ── Public media (unauthenticated) ────────────────────────────────────
app.use(
  "/media",
  rateLimitMiddleware,
  createFmPublicRouter({
    service: fmService,
    cacheControl: "public, max-age=86400, immutable",
    enableVariantFallback: true,
    cache: {
      maxEntries: 5000,
      ttlMs: 60_000, // S3 signed-URL cache TTL
      enabled: true,
    },
  }),
);
```

### 1.6 Lazy initialization pattern

If your database client is not available at import time (common with Supabase), use a lazy-init wrapper with promise deduplication:

```ts
let _service: FmServiceCore | null = null;
let _initPromise: Promise<void> | null = null;

const ensureInit = async (): Promise<void> => {
  if (_service) {
    return;
  }
  if (!_initPromise) {
    _initPromise = initFm(); // your init function
  }
  await _initPromise;
};

// Lazy gateway router
const fmUserRouter = express.Router();
fmUserRouter.use(async (req, res, next) => {
  try {
    await ensureInit();
    innerAuthz.middleware(req, res, (err) => {
      if (err) {
        return next(err);
      }
      innerRouter(req, res, next);
    });
  } catch (err) {
    next(err);
  }
});
```

> See `server/src/routes/fm.ts` in AgentM.Resume for a full working example.

### Admin router endpoints

The admin router (`createFmRouter`) exposes these endpoints (all relative to mount path):

| Method | Path                                 | Description                                                                                                                 |
| ------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/upload/init`                       | Begin a new file upload (returns presigned PUT or proxy instructions)                                                       |
| POST   | `/upload/finalize`                   | Finalize a direct (S3) upload after client PUT completes                                                                    |
| POST   | `/upload/:fileUid/proxy`             | Upload file bytes through the server proxy                                                                                  |
| POST   | `/variants/upload/init`              | Begin a variant (thumb/preview/web) upload                                                                                  |
| POST   | `/variants/upload/finalize`          | Finalize a direct variant upload                                                                                            |
| POST   | `/variants/upload/:variantUid/proxy` | Upload variant bytes through the server proxy                                                                               |
| GET    | `/files`                             | List files (query: `search`, `limit`, `offset`, `includeArchived`, `isPublic`, `orderBy`, `orderDirection`, `ownerUserUid`) |
| GET    | `/files/:fileUid`                    | Get a single file by UID                                                                                                    |
| PATCH  | `/files/:fileUid`                    | Patch mutable fields (title, alt_text, tags, is_public)                                                                     |
| GET    | `/files/:fileUid/content`            | Stream file content (query: `variantKind`, `download`)                                                                      |
| GET    | `/files/:fileUid/url`                | Resolve a read URL (public, signed, or canonical)                                                                           |
| GET    | `/files/:fileUid/object-metadata`    | Get storage-level metadata                                                                                                  |
| GET    | `/files/:fileUid/variants`           | List all variants for a file                                                                                                |
| POST   | `/files/:fileUid/archive`            | Soft-archive a file                                                                                                         |
| POST   | `/files/:fileUid/restore`            | Restore an archived file                                                                                                    |
| DELETE | `/files/:fileUid`                    | Delete a file (query: `force=true` for permanent delete)                                                                    |
| POST   | `/files/:fileUid/move`               | Move file to different bucket/folder                                                                                        |
| GET    | `/files/:fileUid/links`              | List entity links (when `allowLinks: true`)                                                                                 |
| POST   | `/files/:fileUid/links`              | Create a file-entity link (when `allowLinks: true`)                                                                         |
| DELETE | `/files/:fileUid/links`              | Delete a file-entity link (when `allowLinks: true`)                                                                         |

### Content router endpoint

The content router (`createFmContentRouter`) exposes a single endpoint designed for embedding in `<img src>`, previews, and downloads:

| Method | Path    | Description                      |
| ------ | ------- | -------------------------------- |
| GET    | `/:uid` | Serve authenticated file content |

**Query parameters:**

| Param | Long form  | Description                                                             |
| ----- | ---------- | ----------------------------------------------------------------------- |
| `v`   | `variant`  | Variant kind: `thumb`, `preview`, `web`. Default: original              |
| `w`   | --         | Responsive width: `<=400` -> thumb, `<=1000` -> preview, `>1000` -> web |
| `dl`  | `download` | Set to `1` to force `Content-Disposition: attachment`                   |

**URL examples:**

```
/fm/abc-123-uuid              → original file
/fm/abc-123-uuid?v=thumb      → thumbnail variant
/fm/abc-123-uuid?v=preview    → preview variant
/fm/abc-123-uuid?w=200        → responsive: resolves to thumb
/fm/abc-123-uuid?dl=1         → download original
/fm/abc-123-uuid?v=thumb&dl=1 → download thumbnail
```

**Access control:**

- Public files (`is_public: true`): accessible to any authenticated user
- Private files: owner or admin only
- Returns 403 for unauthorized access, 404 for missing files

**Variant fallback:** When `enableVariantFallback` is true (default), if the requested variant does not exist, the original file is served instead.

### Public router endpoint

The public router (`createFmPublicRouter`) serves files marked `is_public: true` without authentication:

| Method | Path    | Description               |
| ------ | ------- | ------------------------- |
| GET    | `/:uid` | Serve public file content |

Same query parameters as the content router (`v`, `w`, `dl`). Includes:

- Built-in LRU redirect cache for S3 signed URLs (configurable TTL/size)
- ETag + Cache-Control headers
- Variant fallback support

## 2. Route Topology

A typical consuming application mounts four distinct paths:

```
Route          Auth        Purpose
────────────── ─────────── ──────────────────────────────────────────
/fm/:uid       Authenticated  Short content URLs for <img src>, previews, downloads
/media/:uid    Public         Public media serving (is_public files)
/api/fm/*      Authenticated  User-scoped CRUD (upload, list, patch, archive, delete)
/api/admin/fm/* Admin         Admin CRUD + entity links
```

Content delivery is decoupled from admin CRUD:

- **Admin URLs** (`/api/fm/files/:uid/content?variantKind=thumb`) are verbose -- suitable for API consumers
- **Content URLs** (`/fm/:uid?v=thumb`) are short -- designed for `<img src>` and URL bars
- **Public URLs** (`/media/:uid`) serve publicly-flagged files without auth

### Vite proxy configuration

When using Vite for development, the content router's mount path (e.g. `/fm`) must be proxied to the Express backend. If the mount path collides with a client-side SPA route, use a `bypass` function:

```ts
// vite.config.ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiServerUrl = env.VITE_API_SERVER_URL || "http://localhost:3000";

  return {
    server: {
      proxy: {
        "/api": { target: apiServerUrl, changeOrigin: true, secure: false },
        "/media": { target: apiServerUrl, changeOrigin: true, secure: false },
        "/fm": {
          target: apiServerUrl,
          changeOrigin: true,
          secure: false,
          // Only proxy sub-paths like /fm/:uid — not bare /fm (SPA page route)
          bypass(req) {
            const url = req.url || "";
            // Strip query string for path check
            const path = url.split("?")[0];
            // Bare /fm or /fm/ is a client-side SPA route — let Vite handle it
            if (path === "/fm" || path === "/fm/") {
              return url; // bypass: serve via Vite (SPA)
            }
            // Everything else (e.g. /fm/abc-123-uuid?v=thumb) goes to Express
            return undefined;
          },
        },
      },
    },
  };
});
```

> **Why bypass?** If `/fm` is both a client-side SPA page and the content router mount, Vite must distinguish between navigating to the FM page (`/fm`) and fetching file content (`/fm/some-uuid`). The bypass function ensures bare `/fm` stays with Vite while `/fm/:uid` routes to Express.

## 3. Client SDK

### 3.1 FmClient

`FmClient` is the default `FmApi` implementation. It communicates via `fetch()` (with XHR fallback for upload progress):

```ts
import { FmClient } from "@user27828/shared-utils/fm/client";

const client = new FmClient({
  adminBaseUrl: "/api/fm", // admin CRUD endpoint
  contentBaseUrl: "/fm", // short content URLs
  publicBaseUrl: "/media", // public media endpoint
});
```

**Configuration fields:**

| Field            | Default                      | Description                                     |
| ---------------- | ---------------------------- | ----------------------------------------------- |
| `adminBaseUrl`   | `"/api/fm"`                  | Base URL for admin CRUD endpoints               |
| `contentBaseUrl` | falls back to `adminBaseUrl` | Base URL for content delivery (short URLs)      |
| `publicBaseUrl`  | `"/media"`                   | Base URL for public media endpoints             |
| `fetchFn`        | `fetch`                      | Custom fetch implementation (for testing / SSR) |

> **Key pattern:** `contentBaseUrl` decouples content delivery from admin CRUD. When configured, `getContentUrl()` produces short URLs like `/fm/{uid}?v=thumb` instead of `/api/fm/files/{uid}/content?variantKind=thumb`.

**URL builders (synchronous):**

```ts
// Authenticated content URL (for <img src>, previews, downloads)
client.getContentUrl({ fileUid: "abc-123", variantKind: "thumb" });
// → "/fm/abc-123?v=thumb"

client.getContentUrl({ fileUid: "abc-123", download: true });
// → "/fm/abc-123?dl=1"

// Public media URL (unauthenticated, cacheable)
client.getPublicMediaUrl("abc-123");
// → "/media/abc-123"

// Proxy upload URLs
client.getProxyUploadUrl("abc-123");
// → "/api/fm/upload/abc-123/proxy"

client.getVariantProxyUploadUrl("variant-uid");
// → "/api/fm/variants/upload/variant-uid/proxy"
```

**CRUD operations:**

```ts
// List files
const list = await client.listFiles({
  search: "photo",
  limit: 20,
  offset: 0,
  orderBy: "created_at",
  orderDirection: "desc",
});

// Get a file
const file = await client.getFile("file-uid");

// Patch metadata
const updated = await client.patchFile({
  fileUid: "file-uid",
  patch: { title: "New Title", is_public: true },
});

// Upload via proxy (with progress)
const result = await client.uploadProxied({
  fileUid: "file-uid",
  body: fileBlob,
  contentType: "image/jpeg",
  onUploadProgress: ({ loaded, total }) => {
    console.log(`${Math.round((loaded / total) * 100)}%`);
  },
});

// Archive / restore / delete
await client.archiveFile("file-uid");
await client.restoreFile("file-uid");
await client.deleteFile({ fileUid: "file-uid", force: true });
```

Errors throw `FmClientError` with `statusCode` and `code` properties.

### 3.2 React hooks

**`useFmListFiles`** -- reactive file list with filtering and pagination:

```tsx
import { useFmListFiles } from "@user27828/shared-utils/fm/client";

const MyFileList: React.FC = () => {
  const { items, totalCount, isLoading, error, reload } = useFmListFiles({
    search: "",
    limit: 20,
    offset: 0,
    orderBy: "created_at",
    orderDirection: "desc",
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {items.map((file) => (
        <li key={file.uid}>{file.title || file.original_filename}</li>
      ))}
    </ul>
  );
};
```

### 3.3 Dependency injection

Use `FmClientProvider` to inject a custom `FmApi` implementation for the entire component tree:

```tsx
import {
  FmClientProvider,
  useFmApi,
  FmClient,
} from "@user27828/shared-utils/fm/client";

const client = new FmClient({
  adminBaseUrl: "/api/admin/fm",
  contentBaseUrl: "/fm",
  publicBaseUrl: "/media",
});

// Provider
<FmClientProvider api={client}>
  <App />
</FmClientProvider>;

// Consumer
const MyComponent: React.FC = () => {
  const api = useFmApi();
  // api is the FmClient instance from the nearest provider
};
```

### 3.4 Standalone function adapter

For non-React usage or direct function calls:

```ts
import { createFmApiFunctions } from "@user27828/shared-utils/fm/client";

const fm = createFmApiFunctions(client);

const files = await fm.listFiles({ limit: 10 });
const url = fm.getContentUrl({ fileUid: "abc", variantKind: "thumb" });
```

## 4. Admin UI Components

### 4.1 FmMediaLibrary

A full media library UI with grid/list view, search, bulk operations, and upload:

```tsx
import { FmMediaLibrary } from "@user27828/shared-utils/fm/client";

<FmMediaLibrary
  api={client}
  onSelect={(file) => console.log("Selected:", file.uid)}
/>;
```

### 4.2 FmFilePicker

A dialog-based file picker for selecting files from the media library:

```tsx
import { FmFilePicker } from "@user27828/shared-utils/fm/client";

<FmFilePicker
  open={isPickerOpen}
  onClose={() => setPickerOpen(false)}
  onSelect={(file) => {
    setSelectedFile(file);
    setPickerOpen(false);
  }}
/>;
```

### 4.3 Image variant utilities

Client-side image variant generation for thumbnails and previews:

```ts
import {
  generateImageVariants,
  constrainToCanvasLimits,
  supportsOffscreenCanvas,
  DEFAULT_VARIANT_WIDTHS,
  MAX_CANVAS_DIMENSION,
} from "@user27828/shared-utils/fm/client";

// Generate thumb, preview, web variants from a source image
const variants = await generateImageVariants(sourceBlob, {
  widths: DEFAULT_VARIANT_WIDTHS, // { thumb: 200, preview: 600, web: 1200 }
});

// Each variant: { kind: "thumb", blob: Blob, width: 200, height: 150 }
for (const variant of variants.variants) {
  await client.variantUploadProxied({
    variantUid: variant.uid,
    body: variant.blob,
    contentType: "image/webp",
  });
}
```

## 5. Types and Error Classes

### 5.1 Import path

All FM types are available from the base `@user27828/shared-utils/fm` export:

```ts
import type {
  FmFileRow,
  FmFileVariantRow,
  FmFileLinkRow,
  FmFileListFilters,
  FmFileListResult,
  FmFileLinkListResult,
  FmUploadInitRequest,
  FmUploadInitResponse,
  FmUploadFinalizeResponse,
  FmContext,
  FmUploadProgressCallback,
} from "@user27828/shared-utils/fm";
```

### 5.2 Error classes

```ts
import {
  FmError,
  FmNotFoundError, // 404
  FmValidationError, // 400
  FmAuthenticationError, // 401
  FmAuthorizationError, // 403
  FmStorageError, // 500 — storage operation failure
  isFmError,
  sendFmError, // Express helper: serialize to JSON envelope
} from "@user27828/shared-utils/fm";
```

All errors extend `FmError` which carries `statusCode` and `code` properties. Use `sendFmError(res, err)` in Express handlers.

### 5.3 Client error class

```ts
import { FmClientError } from "@user27828/shared-utils/fm/client";

try {
  await client.getFile("nonexistent");
} catch (err) {
  if (err instanceof FmClientError && err.statusCode === 404) {
    // File not found
  }
}
```

## 6. FmServiceCore Method Reference

| Method                              | Description                                                          |
| ----------------------------------- | -------------------------------------------------------------------- |
| `uploadInit(request, ctx)`          | Begin a new file upload (returns presigned URL or proxy instruction) |
| `uploadFinalize(params)`            | Finalize a direct upload after client PUT                            |
| `uploadProxied(params)`             | Process proxied upload bytes                                         |
| `variantUploadInit(request, ctx)`   | Begin a variant upload                                               |
| `variantUploadFinalize(params)`     | Finalize a direct variant upload                                     |
| `variantUploadProxied(params)`      | Process proxied variant upload bytes                                 |
| `listFiles(filters, ctx)`           | List files with search, filtering, pagination                        |
| `getFile(fileUid, ctx)`             | Get a single file by UID                                             |
| `patchFile(fileUid, patch, ctx)`    | Patch mutable fields (title, alt_text, tags, is_public)              |
| `archiveFile(fileUid, ctx)`         | Soft-archive a file                                                  |
| `restoreFile(fileUid, ctx)`         | Restore an archived file                                             |
| `deleteFile(fileUid, options, ctx)` | Delete (soft or hard with `force: true`)                             |
| `moveFile(fileUid, target, ctx)`    | Move file to different bucket/folder                                 |
| `resolveContentAccess(params)`      | Resolve content streaming access (path, content-type, redirect URL)  |
| `resolveReadUrl(params)`            | Resolve a read URL (public, signed, or canonical)                    |
| `getObjectMetadata(params)`         | Get storage-level object metadata                                    |
| `listVariants(fileUid, ctx)`        | List all variants for a file                                         |
| `listLinks(params, ctx)`            | List entity links for a file                                         |
| `createLink(params, ctx)`           | Create a file-entity link                                            |
| `deleteLink(params, ctx)`           | Delete a file-entity link                                            |

## 7. onWrite Hook

The `onWrite` callback fires after every successful write operation:

```ts
interface FmWriteEvent {
  action: "create" | "update" | "archive" | "restore" | "delete" | "move";
  fileUid: string;
  file?: FmFileRow;
  actorUserUid?: string;
}
```

Use for side effects without modifying the core:

- Cache invalidation
- Search index updates
- Audit logging
- CMS file-link synchronization

## 8. Storage Adapters

### FmStorageLocal

Development-friendly local file storage:

```ts
import { FmStorageLocal } from "@user27828/shared-utils/fm/server";

const storage = new FmStorageLocal({
  dataRootAbsPath: "/absolute/path/to/.data/uploads",
});
```

> **Dotfile paths:** Local storage typically uses `.data/uploads/` (dot-prefixed). Express's `res.sendFile()` silently rejects dot-prefixed paths by default. All FM routers pass `{ dotfiles: "allow" }` automatically.

### FmStorageS3

S3-compatible storage (requires optional peer dependencies):

```bash
yarn add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

```ts
import { FmStorageS3 } from "@user27828/shared-utils/fm/server/s3";

const storage = new FmStorageS3({
  region: "us-east-1",
  bucket: "my-bucket",
  // credentials from env or IAM role
});
```

### Async factory

The `createFmStorage()` factory reads config and dynamically imports the appropriate adapter:

```ts
import {
  createFmStorage,
  parseFmServerConfig,
} from "@user27828/shared-utils/fm/server";

const config = parseFmServerConfig(process.env);
const storage = await createFmStorage(config);
// Returns FmStorageLocal or FmStorageS3 based on config
```

## 9. Environment Variables

Key FM-related environment variables:

| Variable                    | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `FM_STORAGE_PROVIDER`       | `"local"` or `"s3"` (default: `"local"`)                   |
| `FM_UPLOAD_ROOT`            | Relative path for local uploads (default: `.data/uploads`) |
| `DATA_ROOT_PATH`            | Absolute base for resolving FM_UPLOAD_ROOT                 |
| `FM_MAX_UPLOAD_BYTES_IMAGE` | Max upload size for images                                 |
| `FM_MAX_UPLOAD_BYTES_DOC`   | Max upload size for documents                              |
| `FM_S3_BUCKET`              | S3 bucket name                                             |
| `FM_S3_REGION`              | S3 region                                                  |
| `FM_S3_ENDPOINT`            | S3-compatible endpoint URL (for MinIO, R2, etc.)           |
