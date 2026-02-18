# CMS Consumer Guide

How to use the shared-utils CMS module in a consuming application. Covers the client SDK, admin UI, and server composition.

## Overview

The CMS is split across three export paths:

| Export path                          | Contents                                                                              | Used by                |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------- |
| `@user27828/shared-utils/cms`        | Zod schemas, TypeScript types, error classes                                          | Both client and server |
| `@user27828/shared-utils/cms/server` | `CmsServiceCore`, connector interface, Express router factories, middleware factories | Server only            |
| `@user27828/shared-utils/cms/client` | `CmsClient`, React hooks, portable admin UI pages/components                          | Client only            |

## 1. Server Composition

### 1.1 Create a connector

A connector adapts a specific database to the CMS core. The Supabase connector ships with `@user27828/db-supabase`:

```ts
import { CmsService } from "@user27828/db-supabase/server/cms";
import { getSupabaseClient } from "@user27828/db-supabase/server";

const cmsSvc = new CmsService({
  client: getSupabaseClient({ envRole: "service" }),
  reservedSlugs: ["admin", "api", "auth"],
  onAfterWrite: async (event) => {
    // Optional: sync file-links, flush caches, etc.
    console.log("CMS write:", event.type, event.uid);
  },
});
```

`CmsService` (db-supabase) is a compatibility wrapper. It internally creates a `SupabaseCmsConnector` and a `CmsServiceCore`. Access the core via:

```ts
const core = cmsSvc.cmsServiceCore; // CmsServiceCore instance
```

If you are writing your own connector (see the Connector Authoring Guide), construct the core directly:

```ts
import { CmsServiceCore } from "@user27828/shared-utils/cms/server";

const core = new CmsServiceCore({
  connector: myCustomConnector,
  reservedSlugs: ["admin", "api"],
  onAfterWrite: async (event) => {
    /* ... */
  },
  lockTtlMs: 10 * 60 * 1000, // optional, default: 10 minutes
});
```

### 1.2 Set up authorization

The auth middleware factory decouples CMS role checks from your app's ACL system:

```ts
import { createCmsAuthz } from "@user27828/shared-utils/cms/server";
import type { CmsActorContext } from "@user27828/shared-utils/cms/server";

export const cmsAuthz = createCmsAuthz({
  hasPermission: (permission, roles) => {
    // Your ACL check. Example: "cms-author" in roles array
    return roles.includes(permission);
  },
  resolveUser: (req): CmsActorContext => {
    const user = (req as any).user;
    if (!user?.profile?.uid) {
      throw new Error("Not authenticated");
    }
    return {
      userUid: user.profile.uid,
      roles: user.profile.roles || [],
      isSuperadmin: (user.profile.roles || []).includes("superadmin"),
    };
  },
});
```

The returned object has three members:

- `cmsAuthz.requireAuthor` -- Express middleware; rejects with 403 if the user lacks the `cms-author` permission
- `cmsAuthz.requirePublisher` -- Express middleware; rejects with 403 if the user lacks the `cms-publisher` permission
- `cmsAuthz.getActorContext(req)` -- Extract the `CmsActorContext` from a request (throws if unauthenticated)

### 1.3 Set up rate limiting

```ts
import {
  createCmsAdminRateLimitMiddleware,
  createCmsPublicRateLimitMiddleware,
} from "@user27828/shared-utils/cms/server";

const getUserKey = (req) => {
  const uid = req.user?.profile?.uid || req.user?.auth?.id;
  return uid ? `u:${uid}` : `ip:${req.ip}`;
};

export const cmsAdminRateLimit = createCmsAdminRateLimitMiddleware({
  redisUrl: process.env.REDIS_URL, // optional; falls back to in-memory
  getUserKey,
  adminRules: {
    read: { maxRequests: 240, windowMs: 60_000 },
    write: { maxRequests: 30, windowMs: 60_000 },
  },
});

export const cmsPublicRateLimit = createCmsPublicRateLimitMiddleware({
  redisUrl: process.env.REDIS_URL,
  getUserKey,
  publicRules: {
    read: { maxRequests: 120, windowMs: 60_000 },
    write: { maxRequests: 60, windowMs: 60_000 },
    unlock: { maxRequests: 10, windowMs: 60_000 },
  },
});
```

### 1.4 Set up unlock tokens (for password-protected content)

```ts
import { createCmsUnlockTokenUtils } from "@user27828/shared-utils/cms/server";

const unlockToken = createCmsUnlockTokenUtils({
  signingKey: process.env.EXPRESS_SECRET_KEY,
});
```

The returned object has `sign()` and `verify()` methods using HMAC-SHA256. Pass an adapter to `createCmsPublicRouter` (see below).

### 1.5 Mount Express routers

The preferred approach is to mount the shared router factories. This centralizes the HTTP contract (status codes, envelopes, ETag/If-Match handling) in one place.

```ts
import express from "express";
import {
  createCmsAdminRouter,
  createCmsPublicRouter,
} from "@user27828/shared-utils/cms/server";

const app = express();

// Admin routes (authenticated)
app.use(
  "/api/admin/cms",
  express.json({ limit: "1mb" }),
  authMiddleware, // your auth middleware
  cmsAdminRateLimit, // from step 1.3
  createCmsAdminRouter({
    service: core, // CmsServiceCore from step 1.1
    authz: cmsAuthz, // from step 1.2
    onAfterWrite: async ({ uid, event, actorUid, row, req }) => {
      // Optional: app-specific side effects (file-link sync, etc.)
    },
  }),
);

// Public routes (unauthenticated)
app.use(
  "/api/public/cms",
  express.json({ limit: "4kb" }),
  cmsPublicRateLimit, // from step 1.3
  createCmsPublicRouter({
    service: core,
    unlockToken: {
      sign: (claims, ttl) =>
        unlockToken.sign({ ...claims, ttlSeconds: ttl }).token,
      verify: (token) => {
        const result = unlockToken.verify({
          token,
          uid: "",
          postType: "",
          locale: "",
          slug: "",
          passwordVersion: 0,
        });
        return result.ok ? result.claims : null;
      },
    },
    unlockTtlSeconds: 1800, // 30 minutes
  }),
);
```

### 1.6 Lazy initialization pattern

If your database client is not available at import time (common with Supabase), use a lazy-init wrapper:

```ts
let _router: express.Router | null = null;

const getRouter = (): express.Router => {
  if (!_router) {
    const cmsSvc = new CmsService({
      /* ... */
    });
    _router = createCmsAdminRouter({
      service: cmsSvc.cmsServiceCore,
      authz: cmsAuthz,
    });
  }
  return _router;
};

const router = express.Router();
router.use((req, res, next) => getRouter()(req, res, next));
export default router;
```

### Admin router endpoints

The admin router exposes these endpoints (all relative to mount path):

| Method | Path                                   | Description                                                                                                                                |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/`                                    | List CMS items (query params: `q`, `status`, `post_type`, `locale`, `tag`, `limit`, `offset`, `orderBy`, `orderDirection`, `includeTrash`) |
| GET    | `/:uid`                                | Get a single item by UID                                                                                                                   |
| POST   | `/`                                    | Create a new item                                                                                                                          |
| PUT    | `/:uid`                                | Update an item (requires `If-Match` header)                                                                                                |
| POST   | `/:uid/publish`                        | Publish an item (requires `If-Match` header)                                                                                               |
| POST   | `/:uid/trash`                          | Trash an item (requires `If-Match` header)                                                                                                 |
| POST   | `/:uid/restore`                        | Restore from trash (requires `If-Match` header)                                                                                            |
| DELETE | `/:uid`                                | Permanently delete (must be trashed first)                                                                                                 |
| POST   | `/empty-trash`                         | Delete all trashed items                                                                                                                   |
| POST   | `/:uid/lock`                           | Lock an item                                                                                                                               |
| DELETE | `/:uid/lock`                           | Unlock an item                                                                                                                             |
| GET    | `/:uid/collaborators`                  | List collaborators                                                                                                                         |
| PUT    | `/:uid/collaborators`                  | Replace collaborators                                                                                                                      |
| GET    | `/:uid/history`                        | List history revisions                                                                                                                     |
| POST   | `/:uid/history/:historyId/restore`     | Restore a history revision (requires `If-Match`)                                                                                           |
| POST   | `/:uid/history/:historyId/soft-delete` | Soft-delete a history revision                                                                                                             |
| DELETE | `/:uid/history/:historyId`             | Hard-delete a history revision                                                                                                             |

### Public router endpoints

| Method | Path                              | Description                                                |
| ------ | --------------------------------- | ---------------------------------------------------------- |
| GET    | `/:postType/:locale/:slug`        | Fetch published content (supports `If-None-Match` for 304) |
| POST   | `/:postType/:locale/:slug/unlock` | Exchange password for unlock token                         |

## 2. Client SDK

### 2.1 CmsClient

`CmsClient` is the default `CmsApi` implementation. It communicates via `fetch()`:

```ts
import { CmsClient } from "@user27828/shared-utils/cms/client";

const client = new CmsClient({
  adminBaseUrl: "/api/admin/cms", // default
  publicBaseUrl: "/api/public/cms", // default
});

// Admin operations
const list = await client.adminList({ status: "published", limit: 10 });
const item = await client.adminGet("item-uid");
const created = await client.adminCreate({
  title: "My Post",
  slug: "my-post",
  content: "<p>Hello</p>",
  content_type: "text/html",
  post_type: "page",
  locale: "en",
});
const updated = await client.adminUpdate({
  uid: "item-uid",
  patch: { title: "Updated Title" },
  ifMatch: item.etag,
});
```

Errors throw `CmsClientError` with `statusCode` and `code` properties.

### 2.2 React hooks

**`useCmsAdmin`** -- reactive list with filtering and pagination:

```tsx
import { useCmsAdmin } from "@user27828/shared-utils/cms/client";

const MyList: React.FC = () => {
  const { items, totalCount, isLoading, error, reload } = useCmsAdmin({
    status: "published",
    limit: 20,
    offset: 0,
    orderBy: "updated_at",
    orderDirection: "desc",
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {items.map((item) => (
        <li key={item.uid}>{item.title}</li>
      ))}
    </ul>
  );
};
```

**`useCmsPublic`** -- fetch a single published page:

```tsx
import { useCmsPublic } from "@user27828/shared-utils/cms/client";

const PageContent: React.FC<{ slug: string }> = ({ slug }) => {
  const { data, isLoading, error } = useCmsPublic({
    postType: "page",
    locale: "en",
    slug,
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Not found</p>;

  return (
    <div dangerouslySetInnerHTML={{ __html: data?.sanitized_html || "" }} />
  );
};
```

Both hooks accept an optional `api` prop to override the default `CmsClient`. Both support `enabled: false` to disable auto-fetching.

## 3. Admin UI

### 3.1 Shared pages

The CMS ships two page-level components ready for mounting:

- **`CmsListPage`** -- tabbed list (All/Draft/Published/Trash), search, bulk operations (restore, delete, empty trash)
- **`CmsEditPage`** -- full editor with metadata fields, content editor, history panel, preview link, conflict resolution

Both accept a `config: CmsAdminUiConfig` prop.

### 3.2 CmsAdminUiConfig

Build a config object that provides app-specific adapters:

```tsx
import {
  CmsClient,
  CMS_POST_TYPES,
  type CmsAdminUiConfig,
} from "@user27828/shared-utils/cms/client";

const config: CmsAdminUiConfig = {
  // API client (defaults to CmsClient with default URLs)
  api: new CmsClient(),

  // Slug validation
  reservedSlugs: ["admin", "api", "auth"],

  // Locale selector options
  localeOptions: [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
  ],

  // Post type selector options (falls back to CMS_POST_TYPES)
  postTypeOptions: CMS_POST_TYPES.map((t) => ({ value: t, label: t })),

  // Toast notifications (defaults to console)
  toast: {
    success: (msg) => showSnackbar(msg, "success"),
    error: (msg) => showSnackbar(msg, "error"),
    info: (msg) => showSnackbar(msg, "info"),
  },

  // Navigation callbacks
  navigation: {
    goToList: () => navigate("/cms"),
    goToEdit: (uid) => navigate(`/cms/${uid}`),
    goToCreate: () => navigate("/cms/new"),
  },

  // Media picker (optional; if omitted, media buttons are disabled)
  renderMediaPicker: (props) => (
    <MyMediaPickerDialog
      open={props.open}
      onClose={props.onClose}
      onSelect={props.onSelect}
    />
  ),

  // File content URLs (for image previews)
  getContentUrl: (fileUid, variant) => `/api/files/${fileUid}/${variant || ""}`,

  // WYSIWYG editor preference: "ckeditor" | "tinymce"
  editorPreference: "ckeditor",
};
```

#### Automatic image paste/drop upload

When an image is pasted or dropped into the CMS editor, it is automatically uploaded to FM and the inline base64 data-URI is replaced with the FM content URL. **No additional configuration is required** — `CmsEditPage` uses the FM client from `FmClientProvider` context (or the default `FmClient` if no provider is present).

- Pasted/dropped images → `folderPath: "cms-b64"`
- Editor file-picker uploads → `folderPath: "cms"`

To override the FM instance used for uploads, set `fmApi` in the config:

```tsx
const config: CmsAdminUiConfig = {
  // ... other config ...
  fmApi: myCustomFmClient, // overrides the context/default FM client
};
```

#### Custom upload handler (advanced)

If you need full control over the upload pipeline (e.g. custom storage, resizing, or non-FM backends), provide `onUploadImage`. When present, it takes precedence over the automatic FM upload.

```tsx
const config: CmsAdminUiConfig = {
  // ... other config ...

  // Optional explicit image upload adapter (overrides fmApi for uploads).
  // context.source is:
  //   - "editor-upload" for direct editor uploads
  //   - "pasted-data-uri" for embedded base64 images rewritten by CmsBodyEditor
  onUploadImage: async (file, context) => {
    const folderPath =
      context?.source === "pasted-data-uri" ? "cms-b64" : "cms";

    const init = await fmApi.uploadInit({
      request: {
        purpose: "cms_asset",
        originalFilename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        visibility: "public",
        folderPath,
      },
    });

    await fmApi.uploadProxied({
      fileUid: init.fileUid,
      body: file,
      contentType: file.type || "application/octet-stream",
    });

    return fmApi.getContentUrl({
      fileUid: init.fileUid,
    });
  },
};
```

### 3.3 Mounting pages

```tsx
import { CmsListPage, CmsEditPage } from "@user27828/shared-utils/cms/client";

// Route definitions (React Router example)
<Route path="/cms" element={<CmsListPage config={config} />} />
<Route path="/cms/:uid" element={<CmsEditPageWrapper config={config} />} />
<Route path="/cms/new" element={<CmsEditPage uid={null} config={config} defaultPostType="page" defaultLocale="en" />} />
```

Where the edit wrapper extracts the UID from the URL:

```tsx
const CmsEditPageWrapper: React.FC<{ config: CmsAdminUiConfig }> = ({
  config,
}) => {
  const { uid } = useParams();
  return (
    <CmsEditPage
      uid={uid === "new" ? null : uid}
      config={config}
      defaultPostType="page"
      defaultLocale="en"
    />
  );
};
```

### 3.4 Using a React hook for config

For a cleaner pattern, build the config inside a React hook so it can depend on app state (user preferences, router, snackbar context):

```tsx
import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const useCmsAdminUiConfig = (): CmsAdminUiConfig => {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const editorPref = user?.profile?.optionsJson?.admin?.cmsEditor ?? "ckeditor";

  // Persist the editor preference when changed via the dev-only switcher.
  const handleEditorPrefChange = useCallback(
    (editor: CmsEditorPreference) => {
      dispatch(
        updateUserOptions({
          admin: { ...user?.profile?.optionsJson?.admin, cmsEditor: editor },
        }),
      );
    },
    [dispatch, user?.profile?.optionsJson?.admin],
  );

  return useMemo(
    (): CmsAdminUiConfig => ({
      api: new CmsClient(),
      reservedSlugs: ["admin", "api", "auth"],
      localeOptions: LOCALE_OPTIONS,
      toast: {
        success: (m) => snackbar.success(m),
        error: (m) => snackbar.error(m),
        info: (m) => snackbar.info(m),
      },
      navigation: {
        goToList: () => navigate("/cms"),
        goToEdit: (uid) => navigate(`/cms/${uid}`),
        goToCreate: () => navigate("/cms/new"),
      },
      renderMediaPicker: (props) => <MyMediaPicker {...props} />,
      getContentUrl: (uid) => `/api/files/${uid}`,
      editorPreference: editorPref,
      onEditorPreferenceChange: handleEditorPrefChange,
    }),
    [navigate, snackbar, editorPref, handleEditorPrefChange],
  );
};
```

> **Note:** In development mode, a dev-only "Editor" dropdown (with orange
> border) appears next to "Post type" for HTML content. Changing it calls
> `onEditorPreferenceChange` so your app can persist the choice.

### 3.5 Additional shared components

- **`CmsBodyEditor`** -- multi-format content editor (HTML via TinyMCE/CKEditor, Markdown via MDXEditor, JSON/plain text via Monaco). Reuses `@user27828/shared-utils/client/wysiwyg` primitives.
- **`CmsConflictDialog`** -- ETag 412 resolution dialog offering reload/overwrite/keep-editing choices.

Both are exported from `@user27828/shared-utils/cms/client` and used internally by `CmsEditPage`.

## 4. Types and Error Classes

### 4.1 Import path

All CMS types are available from the base `@user27828/shared-utils/cms` export:

```ts
import type {
  CmsHeadRow,
  CmsHistoryRow,
  CmsCreateRequest,
  CmsUpdateRequest,
  CmsListRequest,
  CmsListResponse,
  CmsPublicPayload,
  CmsPublicHead,
  CmsCollaboratorRow,
  CmsAfterWriteEvent,
} from "@user27828/shared-utils/cms";

import {
  CmsCreateRequestSchema,
  CmsUpdateRequestSchema,
  CmsHeadRowSchema,
  CMS_POST_TYPES,
  CMS_STATUS,
  CMS_CONTENT_TYPES,
} from "@user27828/shared-utils/cms";
```

### 4.2 Error classes

```ts
import {
  CmsError,
  CmsPreconditionFailedError, // 412 — ETag mismatch
  CmsConflictError, // 409 — slug change needs confirmation
  CmsNotFoundError, // 404
  CmsValidationError, // 400 — invalid input
  CmsLockedError, // 423 — locked by another user
  CmsAuthenticationError, // 401
  CmsAuthorizationError, // 403
  isCmsError,
  cmsErrorToResponse,
} from "@user27828/shared-utils/cms";
```

All errors extend `CmsError` which carries `statusCode` and `code` properties. Use `cmsErrorToResponse(err)` to serialize them to a standard JSON envelope.

## 5. CmsServiceCore Method Reference

| Method                                                                       | Description                                   |
| ---------------------------------------------------------------------------- | --------------------------------------------- |
| `list(params)`                                                               | List items with filtering, search, pagination |
| `getByUid(uid)`                                                              | Get a single item (throws 404 if missing)     |
| `create({ request, actorUserUid })`                                          | Create a new item (draft status)              |
| `updateByUid({ uid, patch, ifMatchHeader, actorUserUid })`                   | Update with ETag concurrency check            |
| `publishByUid({ uid, publishedAt?, ifMatchHeader, actorUserUid })`           | Publish (sets status, published_at)           |
| `trashByUid({ uid, ifMatchHeader, actorUserUid })`                           | Move to trash                                 |
| `restoreByUid({ uid, ifMatchHeader, actorUserUid })`                         | Restore from trash to draft                   |
| `deleteByUid({ uid, actorUserUid })`                                         | Permanent delete (must be trashed first)      |
| `emptyTrash({ limit?, actorUserUid })`                                       | Bulk-delete all trashed items                 |
| `lockByUid({ uid, actorUserUid })`                                           | Lock for editing                              |
| `unlockByUid({ uid, actorUserUid, force? })`                                 | Unlock                                        |
| `listHistory({ cmsUid, limit?, offset?, includeSoftDeleted? })`              | List history revisions                        |
| `restoreHistoryRevision({ cmsUid, historyId, ifMatchHeader, actorUserUid })` | Restore a revision to head                    |
| `softDeleteHistoryRevision({ historyId, actorUserUid })`                     | Soft-delete a revision                        |
| `hardDeleteHistoryRevision(historyId)`                                       | Permanently delete a revision                 |
| `listCollaborators(cmsUid)`                                                  | List collaborators for an item                |
| `replaceCollaborators(cmsUid, collaborators)`                                | Replace all collaborators                     |
| `getPublicPayloadBySlug({ postType, locale, slug })`                         | Render published content (sanitized)          |
| `getPublicHead({ postType, locale, slug })`                                  | Lightweight read for 304/password checks      |

All write methods that accept `ifMatchHeader` enforce optimistic concurrency. Callers must pass the ETag from the last read.

## 6. onAfterWrite Hook

The `onAfterWrite` callback fires after every successful write:

```ts
type CmsWriteEventType =
  | "create"
  | "update"
  | "publish"
  | "trash"
  | "restore"
  | "delete"
  | "history_restore";

interface CmsAfterWriteEvent {
  type: CmsWriteEventType;
  uid: string;
  row?: CmsHeadRow; // present for all except "delete"
  actorUserUid?: string | null;
}
```

Use this to trigger app-specific side effects without modifying the core:

- File-link synchronization
- Cache invalidation
- Search index updates
- Audit logging
