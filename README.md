# shared-utils

Collection of common utilities for web applications. Features centralized configuration through **OptionsManager**, environment-aware utilities that work across client/server contexts, a portable **CMS** (Content Management System) with pluggable DB connectors, and a portable **FM** (File Manager) with pluggable DB connectors and storage adapters.

## 📋 Table of Contents

- [shared-utils](#shared-utils)
  - [📋 Table of Contents](#-table-of-contents)
  - [Installation](#installation)
    - [Optional Feature Dependencies](#optional-feature-dependencies)
    - [Node.js CommonJS Interoperability](#nodejs-commonjs-interoperability)
  - [Quick Start](#quick-start)
    - [Upgrade from 0.70.69 to 0.71.69](doc/upgrades/0.70.69-to-0.71.69.md)
    - [Import Paths](#import-paths)
    - [Utility Entry Point Migration](#utility-entry-point-migration)
    - [Basic Setup](#basic-setup)
  - [Available Modules](#available-modules)
    - [📋 Utils](#-utils)
    - [🎨 Client Components](#-client-components)
      - [Clipboard Buttons](#clipboard-buttons)
      - [📝 WYSIWYG Editor Components](#-wysiwyg-editor-components)
      - [⏱️ Debounce Hooks](#️-debounce-hooks)
    - [🚀 Server](#-server)
    - [📝 CMS (Content Management System)](#-cms-content-management-system)
    - [📁 FM (File Manager)](#-fm-file-manager)
  - [Configuration](#configuration)
    - [Centralized Configuration (Recommended)](#centralized-configuration-recommended)
    - [Framework Examples](#framework-examples)
      - [Next.js](#nextjs)
      - [Express.js](#expressjs)
  - [Command Line Tools](#command-line-tools)
    - [Consumer Efficiency Audit](#consumer-efficiency-audit)
    - [Options Hot Path Benchmark](#options-hot-path-benchmark)
    - [Dependency Manager](#dependency-manager)
    - [Package Scripts Integration](#package-scripts-integration)
    - [Shared Spec-Kit and Codex synchronization](#shared-spec-kit-and-codex-synchronization)
  - [Graphify Knowledge Graph](#graphify-knowledge-graph)
    - [Install Graphify](#install-graphify)
    - [Build and query the graph](#build-and-query-the-graph)
    - [Update the graph](#update-the-graph)
  - [Usage Examples](#usage-examples)
  - [Deployment Guide](#deployment-guide)
    - [📖 Documentation](#-documentation)
    - [Quick Setup](#quick-setup)
  - [Documentation](#documentation)
    - [Package Structure](#package-structure)

## Installation

Add to your `package.json`:

```json
{
  "dependencies": {
    "@user27828/shared-utils": "https://github.com/user27828/shared-utils.git#master"
  }
}
```

Or install via command line:

```bash
# Using yarn (recommended)
yarn add @user27828/shared-utils@https://github.com/user27828/shared-utils.git#master

```

### Optional Feature Dependencies

The only mandatory runtime dependencies are `lodash-es`, `nanoid`, and `zod`.
Pure helpers and client SDKs need no optional peers. Install React/ReactDOM for
hooks and UI, then add the capability dependencies below. Broad barrels combine
features and require all their runtime peers; prefer the focused entrypoints.

| Capability / entrypoint                             | Additional Yarn install (combine rows when composing features)                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| React hooks and UI                                  | `yarn add react@^19 react-dom@^19`                                                        |
| MUI components, CMS public/admin UI, FM/email UI    | `yarn add @mui/material@^9 @mui/icons-material@^9 @emotion/react@^11 @emotion/styled@^11` |
| CMS history calendar (in addition to MUI/date rows) | `yarn add @mui/lab@^9.0.0-beta.9 @mui/x-date-pickers@^9`                                  |
| Client dates/timezones and calendar URL/ICS helpers | `yarn add date-fns@^4 date-fns-tz@^3`                                                     |
| Contact CSV and vCard serialization                 | None                                                                                      |
| Client CSV helpers                                  | `yarn add papaparse@^5`                                                                   |
| Country/language selectors (in addition to MUI)     | `yarn add prop-types@^15`                                                                 |
| TinyMCE base                                        | `yarn add @tinymce/tinymce-react@^6 tinymce@^8`                                           |
| TinyMCE full/code preset                            | `yarn add prismjs@^1`                                                                     |
| CKEditor 5                                          | `yarn add @ckeditor/ckeditor5-react@^11 ckeditor5@^48`                                    |
| EasyMDE                                             | `yarn add easymde@^2`                                                                     |
| MDXEditor                                           | `yarn add @mdxeditor/editor@^4 @codemirror/language@^6 @lezer/highlight@^1 yjs@^13.6.32`  |
| Express routers (CMS, FM, email webhooks)           | `yarn add express@^5`                                                                     |
| CMS core/password/HTML sanitization                 | `yarn add bcryptjs@^3 sanitize-html@^2 marked@^18`                                        |
| Redis-backed CMS rate limiting                      | `yarn add ioredis@^6`                                                                     |
| FM S3 storage                                       | `yarn add @aws-sdk/client-s3@^3 @aws-sdk/s3-request-presigner@^3`                         |
| SES provider / email marketing                      | `yarn add @aws-sdk/client-sesv2@^3`                                                       |
| Gmail provider                                      | `yarn add nodemailer@^10`                                                                 |
| Server env / email marketing                        | `yarn add dotenv@^18 dotenv-expand@^13`                                                   |

TypeScript server applications using Express or Gmail declarations also need
`yarn add -D @types/express@^5 @types/node`.
React TypeScript applications need `@types/react` and `@types/react-dom`.
All these integrations are optional root peers and are no longer installed by
default. Importing the combined `server` surface does not load `.env` files or
attach a global logger. The explicit `server/env` path loads environment data;
the explicit `server/init` path attaches `globalThis.log` when no logger is
already present. An individual worker import needs neither Express nor dotenv.

Local FM keeps `createFmStorage(config)` and requires no AWS SDK. S3 callers
must import `createFmS3Storage` from `fm/server/s3` and pass it as the second
argument. CMS callers providing `redisUrl` must also provide `redisFactory:
createCmsRedisClient`, imported from `cms/server/redis`; omitting the factory
raises a configuration error. In-memory rate limiting needs neither URL nor
factory. These explicit seams keep bundlers from resolving unused vendors.

### Node.js CommonJS Interoperability

The package publishes native ESM. Export maps use the same ESM targets for
`import` and Node's `module-sync` condition; they do not publish separate
CommonJS files. Synchronous `require()` of those ESM targets works on Node
22.12 and later when the selected module graph has no top-level `await`.
Node 22.0 through 22.11 do not enable `require(esm)` by default; CommonJS
applications on those versions must use dynamic `import()` or move to a
supported Node version. See the [Node 22.10 release notes](https://nodejs.org/en/blog/release/v22.10.0)
for the `module-sync` condition and the [Node 22.12 release notes](https://nodejs.org/en/blog/release/v22.12.0)
for default `require(esm)` support.

For the API and initialization changes in this release, see the
[0.70.69 to 0.71.69 upgrade guide](doc/upgrades/0.70.69-to-0.71.69.md).

[🔝 Back to Top](#shared-utils)

## Quick Start

### Import Paths

Use specific import paths for clarity:

```typescript
// Pure helpers do not initialize global utilities or feature integrations.
import { isValidEmail, normalizeUrl } from "@user27828/shared-utils/utils";

// Configured utilities are explicit opt-ins.
import { optionsManager } from "@user27828/shared-utils/utils/options";
import log from "@user27828/shared-utils/utils/log";
import turnstile from "@user27828/shared-utils/utils/turnstile";

// ✅ Client components (React/Next.js)
import {
  CountrySelect,
  LanguageSelect,
  FileIcon,
  CopyButton,
  PasteButton,
} from "@user27828/shared-utils/client";

// ✅ Client initialization (import once in your app entry point)
// Sets up window.log and disables MUI X telemetry.
import "@user27828/shared-utils/client/init";

// ✅ WYSIWYG Editors (requires peer dependencies)
// TinyMCE: yarn add @tinymce/tinymce-react tinymce
// CKEditor 5: yarn add ckeditor5 @ckeditor/ckeditor5-react
// EasyMDE: yarn add easymde
// MDXEditor: yarn add @mdxeditor/editor
import { TinyMceEditor } from "@user27828/shared-utils/client/wysiwyg/tinymce";
import { CKEditor5Classic } from "@user27828/shared-utils/client/wysiwyg/ckeditor";
import { EasyMDEEditor } from "@user27828/shared-utils/client/wysiwyg/easymde";
import { MDXEditor } from "@user27828/shared-utils/client/wysiwyg/mdx";

// ✅ Server functionality
import { verifyTurnstileToken } from "@user27828/shared-utils/server";

// Optional server setup: load environment data or attach globalThis.log.
import env from "@user27828/shared-utils/server/env";
import "@user27828/shared-utils/server/init";

// ✅ Shared email types + validation helpers
import { assertEmailRenderResult } from "@user27828/shared-utils/email";
import type { EmailTemplatePreviewResponse } from "@user27828/shared-utils/email";

// ✅ Server email utilities
import {
  syncMarketingSubscriptions,
  createWebhookRouter,
} from "@user27828/shared-utils/email/server";

// ✅ Server email provider errors and built-in providers
import {
  EmailProviderError,
  isEmailError,
} from "@user27828/shared-utils/email/server/errors";
import {
  CloudflareEmailProvider,
  GmailEmailProvider,
  ResendEmailProvider,
  SesEmailProvider,
  TestEmailProvider,
} from "@user27828/shared-utils/email/server/providers";

// ✅ Client email preview SDK, hooks, and UI
import {
  EmailTemplateClient,
  useEmailTemplates,
  EmailTemplateListPage,
} from "@user27828/shared-utils/email/client";

// ✅ CMS - browser-safe contracts, schemas, validation, concurrency
import {
  CmsHeadRow,
  CmsPublicPayload,
  CMS_POST_TYPES,
} from "@user27828/shared-utils/cms";

// ✅ CMS — server core service, Express routers, connector interface
import {
  CmsServiceCore,
  createCmsAdminRouter,
  createCmsPublicRouter,
} from "@user27828/shared-utils/cms/server";

// ✅ CMS — client SDK, React hooks, admin UI pages
import {
  CmsClient,
  useCmsAdmin,
  CmsEditPage,
  CmsListPage,
} from "@user27828/shared-utils/cms/client";

// ✅ CMS — public-facing hook + render helpers without admin/editor UI deps
import {
  useCmsPublic,
  CmsBodyRenderer,
  CmsPasswordGate,
} from "@user27828/shared-utils/cms/client/public";

// ✅ FM — types, error classes
import type { FmFileRow, FmContext } from "@user27828/shared-utils/fm";

// ✅ FM — server core service, Express routers, storage adapters
import {
  FmServiceCore,
  createFmRouter,
  createFmContentRouter,
  createFmPublicRouter,
} from "@user27828/shared-utils/fm/server";

// ✅ FM — client SDK, React hooks, media library UI
import {
  FmClient,
  useFmListFiles,
  FmMediaLibrary,
  FmFilePicker,
} from "@user27828/shared-utils/fm/client";
```

### CMS and FM Contract Entry Points

Import constants without constructing Zod schemas, and use erased types for
DTOs. Runtime schemas remain available at the shared domain roots or dedicated
`schemas` paths. Both domains also expose direct `validation` and `errors` paths.

```typescript
import {
  CMS_POST_TYPES,
  CMS_STATUS,
} from "@user27828/shared-utils/cms/constants";
import { FM_PURPOSES } from "@user27828/shared-utils/fm/constants";
import type { CmsCreateRequest } from "@user27828/shared-utils/cms/types";
import type { FmFileRow } from "@user27828/shared-utils/fm/types";
import { CmsCreateRequestSchema } from "@user27828/shared-utils/cms/schemas";
import { FmUploadInitRequestSchema } from "@user27828/shared-utils/fm/schemas";
```

CMS password and sanitizer helpers have moved out of the shared `cms` barrel.
Migrate old imports (including raw `utils/src/cms` imports) to the server paths:

```typescript
import {
  hashCmsPassword,
  verifyCmsPassword,
} from "@user27828/shared-utils/cms/server/password";
import {
  sanitizeCmsHtml,
  renderMarkdownToSanitizedHtml,
} from "@user27828/shared-utils/cms/server/sanitization";
```

The password path requires `bcryptjs`; the sanitizer path requires
`sanitize-html` and uses `marked` for Markdown rendering. The CMS service core
and routers retain these security dependencies and behavior. Browser contracts
and constant consumers need neither password nor sanitizer peers. DTO types
remain derived from the canonical Zod schemas, so their declarations need Zod
(the package's runtime dependency), plus no React, MUI, or editor declarations.

### Utility Entry Point Migration

The root and `./utils` entrypoints now expose only dependency-free helpers and
types. Move configured utilities and integrations to explicit subpaths:

```typescript
import { isDev, isValidEmail } from "@user27828/shared-utils/utils";
import {
  formatFileSize,
  sanitizeFilename,
} from "@user27828/shared-utils/utils/files";
import { formatDate } from "@user27828/shared-utils/utils/dates";
import { optionsManager } from "@user27828/shared-utils/utils/options";
import log from "@user27828/shared-utils/utils/log";
import turnstile from "@user27828/shared-utils/utils/turnstile";
```

Contact serialization, calendar helpers, meeting-provider data, and text
format detection are available from `utils/contact` (CSV/vCard),
`utils/calendar`, `utils/meeting-providers`, and `utils/detect-format`. Browser applications should continue importing
`client/init` once when they need `window.log` and the MUI X telemetry opt-out.

The `client/countries` and `client/languages` helpers and the default selector
components keep their bundled full-data behavior. Consumers with their own
tables can use `client/countries/core` and `client/languages/core`, or the
`client/components/form/CountrySelect/custom-data` and
`client/components/form/LanguageSelect/custom-data` selectors. The core
selectors take rows matching the exported `CountryDataRow` or `LanguageDataRow`
types and do not import the bundled tables. Add the dataset's empty-code row
when the empty/other option is needed. Helpers do not mutate or cache supplied
rows. Pass a new array identity to a mounted selector when its data changes so
its memoized options are rebuilt.

Calendar APIs moved out of `utils/contact` so contact serialization does not
resolve date libraries. Import calendar operations and types from
`utils/calendar`:

```typescript
import { generateVCard } from "@user27828/shared-utils/utils/contact";
import {
  buildCalendarUrl,
  type CalendarEvent,
} from "@user27828/shared-utils/utils/calendar";
```

### Basic Setup

```typescript
import { optionsManager } from "@user27828/shared-utils/utils/options";

// Configure utilities
optionsManager.setGlobalOptions({
  log: {
    type: "client",
    client: { production: ["warn", "error"] },
  },
  turnstile: {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
  },
});
```

[🔝 Back to Top](#shared-utils)

## Available Modules

### 📋 [Utils](./utils/README.md)

Core utilities with environment detection and centralized configuration:

- **Logging**: Production-safe console wrapper
- **Turnstile**: Cloudflare bot protection integration
- **OptionsManager**: Unified configuration system
- **isDev**: Development environment detection utility

### 🎨 [Client Components](./client)

React components and client-side helpers:

- **Form Components**: `CountrySelect`, `LanguageSelect`, `FileUploadList`, `TagsInput`
- **Layout Components**: `BackdropLoader`, `CheckChip`, `Disconnected`, `ProcessStatusChip`, `SelectChip`, `SplitChip`
- **File Icons**: `FileIcon` - MUI icons for 70+ file types and MIME types
- **Clipboard Buttons**: `CopyButton`, `PasteButton` - IconButtons with visual feedback
- **Helper Functions**: Country/language utilities, CSV helpers

The `@user27828/shared-utils/client` barrel remains available. Consumers that
want a smaller module graph can import focused helpers from
`@user27828/shared-utils/client/debounce`, `/csv`, `/countries`, `/languages`,
`/timezones`, or `/dates`. General components also have direct paths, for
example `@user27828/shared-utils/client/components/CopyButton` and
`@user27828/shared-utils/client/components/form/CountrySelect`.

The default country and language selectors use the complete bundled datasets.
For host-managed datasets, import the data-driven components from
`@user27828/shared-utils/client/components/form/CountrySelect/custom-data` or
`@user27828/shared-utils/client/components/form/LanguageSelect/custom-data`
and pass the corresponding `countries` or `languages` rows.

#### Clipboard Buttons

Drop-in MUI `IconButton` wrappers for copy and paste with built-in visual feedback (icon swap, green success color, tooltip change). Both support an optional built-in MUI Snackbar.

```tsx
import { CopyButton, PasteButton } from "@user27828/shared-utils/client";

// Copy — minimal
<CopyButton value={someText} />

// Copy — with custom tooltips and snackbar
<CopyButton
  value={email}
  tooltip="Copy email"
  copiedTooltip="Email copied!"
  snackbar
  snackbarMessage="Email copied to clipboard"
/>

// Copy — with external callback (e.g. notistack)
<CopyButton
  value={id}
  onCopy={() => enqueueSnackbar("Copied!", { variant: "success" })}
/>

// Paste — minimal
<PasteButton onPaste={(text) => setValue(text)} />

// Paste — with snackbar
<PasteButton
  onPaste={handlePaste}
  tooltip="Paste job description"
  snackbar
  snackbarMessage="Content pasted!"
/>
```

**CopyButton props**: `value`, `tooltip`, `copiedTooltip`, `successDuration`, `size`, `sx`, `iconFontSize`, `onCopy`, `onError`, `disabled`, `snackbar`, `snackbarMessage`, `snackbarDuration`, `color`

**PasteButton props**: `onPaste`, `tooltip`, `pastedTooltip`, `successDuration`, `size`, `sx`, `iconFontSize`, `onError`, `disabled`, `snackbar`, `snackbarMessage`, `snackbarDuration`, `color`

**CheckChip** renders a real checkbox input inside a chip-styled control, so it keeps native checkbox semantics while fitting chip-based UIs. It supports controlled or uncontrolled usage plus the native indeterminate state.

```tsx
import { CheckChip } from "@user27828/shared-utils/client";

const [enabled, setEnabled] = useState(false);

<CheckChip
  label="Email notifications"
  checked={enabled}
  onChange={(_event, nextChecked) => {
    setEnabled(nextChecked);
  }}
/>;
```

#### 📝 WYSIWYG Editor Components

WYSIWYG engines have separate entrypoints. The shared switcher imports no engine; the host supplies stable adapters for only the engines it installs. The explicit `client/wysiwyg/all` convenience entry includes every engine and TinyMCE's full preset.

For a full guide (recommended), see [doc/WYSIWYG_SETUP.md](./doc/WYSIWYG_SETUP.md).

| Entry point               | Contents                                                              |
| ------------------------- | --------------------------------------------------------------------- |
| `client/wysiwyg`          | Engine-neutral switcher, adapter contract, and shared types           |
| `client/wysiwyg/tinymce`  | TinyMCE adapter and minimal plugin preset                             |
| `client/wysiwyg/ckeditor` | CKEditor 5 adapter                                                    |
| `client/wysiwyg/easymde`  | EasyMDE adapter                                                       |
| `client/wysiwyg/mdx`      | MDXEditor adapter                                                     |
| `client/wysiwyg/all`      | Convenience switcher with all four adapters and TinyMCE's full preset |

**Lean switcher with one selected engine**:

```typescript
import WysiwygEditor from "@user27828/shared-utils/client/wysiwyg";
import { TinyMceWysiwygAdapter } from "@user27828/shared-utils/client/wysiwyg/tinymce";

const adapters = { tinymce: TinyMceWysiwygAdapter };

<WysiwygEditor
  adapters={adapters}
  editor="tinymce" // "tinymce" | "ckeditor" | "easymde" | "mdx"
  value={content}
  readOnly={false}
  height={420}
  onChange={(nextValue) => setContent(nextValue)}
  onPickAsset={async ({ kind }) => {
    // kind: "file" | "image" | "media"
    return null;
  }}
  onUploadImage={async ({ file, blob, filename }) => {
    // Upload and return URL
    return { url: "https://example.com/image.png" };
  }}
/>
```

**Key behavior**:

- `value` stays in each editor's native format: HTML for TinyMCE/CKEditor, Markdown for EasyMDE.
- Use `onPickAsset` for inserting images/files/media with TinyMCE, CKEditor, and EasyMDE.
- Use `onUploadImage` for paste/drag-drop uploads.
- An absent adapter displays a configuration alert. `CmsBodyEditor` uses its textarea fallback until an adapter is supplied in `CmsAdminUiConfig.editorAdapters`.
- MDXEditor code blocks are not enabled by default. Add the desired MDXEditor plugins through `additionalPlugins`; TinyMCE's code preset initializes Prism only when explicitly imported.

CMS editor engines are supplied through the admin UI config:

```tsx
import type { CmsAdminUiConfig } from "@user27828/shared-utils/cms/client/ui";
import { TinyMceWysiwygAdapter } from "@user27828/shared-utils/client/wysiwyg/tinymce/full";

const cmsConfig = {
  editorPreference: "tinymce",
  editorAdapters: { tinymce: TinyMceWysiwygAdapter },
} satisfies CmsAdminUiConfig;
```

Use the `/tinymce/full` adapter when you want CMS's current toolbar plugins.
Use `/tinymce` with a custom `editorProps.tinymce.init` config when you want
the smaller default preset.

The `/all` entrypoint is intended for applications that install all editor peers. It provides the previous unified usage without a separate `adapters` prop:

```typescript
import WysiwygEditor from "@user27828/shared-utils/client/wysiwyg/all";
```

**TinyMCE Editor** (Rich HTML editor):

```bash
# Install required peer dependencies
yarn add @tinymce/tinymce-react tinymce
```

```typescript
import { TinyMceEditor } from "@user27828/shared-utils/client/wysiwyg/tinymce";

<TinyMceEditor
  data={htmlContent}
  onChange={(event, editor) => setContent(editor.getData())}
  onUploadImage={async (request) => {
    // Upload image and return URL
    return { url: "https://example.com/image.png" };
  }}
/>
```

**CKEditor 5 Classic** (Rich HTML editor):

```bash
# Install required peer dependencies
yarn add ckeditor5 @ckeditor/ckeditor5-react
```

```typescript
import { CKEditor5Classic } from "@user27828/shared-utils/client/wysiwyg/ckeditor";

<CKEditor5Classic
  data={htmlContent}
  onChange={(_event, editor) => setContent(editor.getData())}
  onPickFile={async (request) => {
    // Provide custom picker UI for image/file/media and return a URL.
    return null;
  }}
  onUploadImage={async (request) => {
    // Upload image and return URL
    return { url: "https://example.com/image.png" };
  }}
/>
```

**EasyMDE** (Markdown editor):

```bash
# Install required peer dependencies
yarn add easymde
```

```typescript
import { EasyMDEEditor } from "@user27828/shared-utils/client/wysiwyg/easymde";

<EasyMDEEditor
  value={markdownContent}
  onChange={(nextValue) => setContent(nextValue)}
  onPickAsset={async ({ kind }) => {
    // kind: "file" | "image" | "media"
    return null;
  }}
  onUploadImage={async (request) => {
    // Upload image and return URL
    return { url: "https://example.com/image.png" };
  }}
  options={{
    spellChecker: false,
    status: false,
  }}
/>
```

**MDXEditor** (Markdown editor):

```bash
# Install required peer dependencies
yarn add @mdxeditor/editor
```

```typescript
import { MDXEditor } from "@user27828/shared-utils/client/wysiwyg/mdx";

<MDXEditor
  data={markdownContent}
  onChange={(event, editor) => setContent(editor.getData())}
  darkMode={true}
  height={400}
  onUploadImage={async (request) => {
    // Upload image and return URL
    return { url: "https://example.com/image.png" };
  }}
/>
```

**MDXEditor Props:**

| Prop               | Type                          | Description                                             |
| ------------------ | ----------------------------- | ------------------------------------------------------- |
| `data`             | `string`                      | Initial markdown content                                |
| `onChange`         | `(event, editor) => void`     | Change handler (use `editor.getData()` to get markdown) |
| `onEditorInstance` | `(editor) => void`            | Callback to receive editor methods reference            |
| `onUploadImage`    | `(request) => Promise<{url}>` | Image upload handler                                    |
| `darkMode`         | `boolean`                     | Enable dark theme styling                               |
| `height`           | `string \| number`            | Editor height (default: 400)                            |
| `showToolbar`      | `boolean`                     | Show/hide toolbar (default: true)                       |
| `placeholder`      | `string`                      | Placeholder text                                        |
| `readOnly`         | `boolean`                     | Read-only mode                                          |

**Features:**

- **Conditional Loading**: Components gracefully handle missing dependencies
- **Lightweight**: Main client export doesn't include editor bundles
- **Consistent API**: Both editors use similar `data`/`onChange` patterns
- **Dark Mode**: Built-in dark theme support for both editors
- **Image Upload**: Unified image upload handler interface

#### ⏱️ Debounce Hooks

Zero-dependency React hooks for debouncing values and callbacks:

```tsx
import {
  useDebouncedValue,
  useDebouncedCallback,
} from "@user27828/shared-utils/client";

// Debounce a search query — fires 300ms after the user stops typing
const [debouncedQuery] = useDebouncedValue(query, { wait: 300 });

// Debounce a save function with maxWait cap and flush-on-unmount
const [debouncedSave, { cancel, flush, isPending }] = useDebouncedCallback(
  save,
  { wait: 1000, maxWait: 5000, flushOnUnmount: true },
);
```

| Option           | Default     | Description                                         |
| ---------------- | ----------- | --------------------------------------------------- |
| `wait`           | `0`         | Delay in ms before executing                        |
| `leading`        | `false`     | Execute immediately on first call                   |
| `trailing`       | `true`      | Execute after wait period                           |
| `maxWait`        | `undefined` | Maximum delay (ms) before forced invocation         |
| `flushOnUnmount` | `false`     | Flush pending work on unmount instead of cancelling |

`useDebouncedValue` also accepts `equalityFn` (default `Object.is`) to skip debounce when values are equal.

Both hooks return `[result, { cancel, flush, isPending }]` controls.

### 🚀 [Server](./server/README-SERVER.md)

Server-side functionality and Cloudflare Workers:

- **Turnstile Verification**: Token validation service
- **Email Utilities**: Marketing sync, webhook handlers, provider abstractions, and typed provider errors
- **Deployment Scripts**: Automated Cloudflare Worker deployment
- **Configuration Templates**: Ready-to-use examples

**Import paths:**

| Path                                                        | Contents                                                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `@user27828/shared-utils/server`                            | Turnstile verification, Express middleware, IP helpers, and general server utilities; no env or logger bootstrap     |
| `@user27828/shared-utils/server/env`                        | Explicit server environment loader and `getClientUrl`; importing it performs environment discovery and loading       |
| `@user27828/shared-utils/server/init`                       | Explicit global logger setup; preserves an existing `globalThis.log`                                                 |
| `@user27828/shared-utils/server/turnstile/worker`           | Turnstile Cloudflare Worker factory                                                                                  |
| `@user27828/shared-utils/server/turnstile/middleware`       | Turnstile Express middleware                                                                                         |
| `@user27828/shared-utils/email`                             | Shared email preview/request/response types and validation helpers                                                   |
| `@user27828/shared-utils/email/client`                      | Email template preview client, hooks, and preview/admin UI components                                                |
| `@user27828/shared-utils/email/client/api`                  | Email template SDK and erased contracts, without React hooks or UI                                                   |
| `@user27828/shared-utils/email/client/hooks`                | Email template React hooks, without preview/admin UI components                                                      |
| `@user27828/shared-utils/email/client/ui`                   | Email preview and admin UI components                                                                                |
| `@user27828/shared-utils/email/server`                      | Email template registry, attachment helpers, marketing sync, webhook router factories, and shared email server types |
| `@user27828/shared-utils/email/server/registry`             | Template registry factory and contracts, without provider adapters                                                   |
| `@user27828/shared-utils/email/server/marketing`            | Marketing sync integration                                                                                           |
| `@user27828/shared-utils/email/server/webhooks`             | Webhook router and built-in webhook handlers                                                                         |
| `@user27828/shared-utils/email/server/providers/contracts`  | Provider contracts without built-in provider implementations                                                         |
| `@user27828/shared-utils/email/server/providers/contracts`  | Provider contracts only, without built-in provider adapters                                                          |
| `@user27828/shared-utils/email/server/errors`               | `EmailError`, `EmailProviderError`, and `isEmailError`                                                               |
| `@user27828/shared-utils/email/server/providers`            | Provider contracts plus built-in Gmail, Cloudflare, Resend, SES, and `_test_` providers                              |
| `@user27828/shared-utils/email/server/providers/_test_`     | Deep import for the file-backed `_test_` provider                                                                    |
| `@user27828/shared-utils/email/server/providers/cloudflare` | Deep import for the Cloudflare Email Service provider                                                                |
| `@user27828/shared-utils/email/server/providers/gmail`      | Deep import for the Gmail provider                                                                                   |
| `@user27828/shared-utils/email/server/providers/resend`     | Deep import for the Resend provider                                                                                  |
| `@user27828/shared-utils/email/server/providers/ses`        | Deep import for the Amazon SES provider                                                                              |

Note: email template descriptors may emit `from` / `replyTo` setting refs such as `{ setting: "noReplyEmail" }` and `{ setting: "supportEmail" }`. Those refs are consumer-resolved metadata; the consuming server must map them to concrete addresses before composing or sending provider messages.

Server utilities

- **getClientIp(req)**: Robust helper to extract the client's IP address from a Request-like object. It checks common proxy headers (x-forwarded-for, x-real-ip, cf-connecting-ip, etc.), handles IPv6 formats (including bracketed addresses and IPv4-mapped IPv6 ::ffff:), and falls back to socket properties such as `req.ip`, `req.connection.remoteAddress`, or `req.socket.remoteAddress`.

Usage example:

```typescript
import { getClientIp } from "@user27828/shared-utils/server";

const ip = getClientIp(req);
```

### 📝 CMS (Content Management System)

A portable, full-featured CMS with pluggable DB connectors. The CMS core is DB-agnostic; persistence is provided by connector packages (e.g. `@user27828/db-supabase`).

**Import paths:**

| Path                                         | Contents                                                                                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@user27828/shared-utils/cms`                | Browser-safe shared types, Zod schemas, validation, concurrency, error classes                                                                                          |
| `@user27828/shared-utils/cms/server`         | `CmsServiceCore`, `CmsConnector` interface, Express router factories, rate limiter, authz, cache-control, unlock tokens, conformance test harness                       |
| `@user27828/shared-utils/cms/server/core`    | `CmsServiceCore` and connector contracts without Express routers                                                                                                        |
| `@user27828/shared-utils/cms/server/express` | CMS Express routers and transfer helpers                                                                                                                                |
| `@user27828/shared-utils/cms/client`         | Full client surface: `CmsClient`, `useCmsAdmin`/`useCmsPublic`, admin UI pages (`CmsListPage`, `CmsEditPage`, `CmsHistoryDrawer`, `CmsBodyEditor`, `CmsConflictDialog`) |
| `@user27828/shared-utils/cms/client/api`     | `CmsClient`, `CmsClientError`, and API contracts without React or UI dependencies                                                                                       |
| `@user27828/shared-utils/cms/client/hooks`   | CMS React hooks without admin/editor UI                                                                                                                                 |
| `@user27828/shared-utils/cms/client/ui`      | CMS admin and rendering UI components                                                                                                                                   |
| `@user27828/shared-utils/cms/client/public`  | Public-only client surface: `useCmsPublic`, `CmsBodyRenderer`, `CmsPasswordGate`, `CmsContentNotes`, and related types without admin/editor UI dependencies             |

Use `cms/client/api` for non-UI consumers that only call CMS endpoints. The
existing `cms/client` path intentionally remains the combined hooks and UI
surface.

**Key features:**

- ETag/If-Match optimistic concurrency
- HTML/Markdown sanitization (server-side)
- Password protection with bcrypt + unlock tokens
- Full revision history with restore
- Configurable rate limiting (Redis + memory fallback)
- Role-based authorization middleware factory
- Drop-in admin UI with injectable media picker
- Connector conformance test harness for new DB adapters

**Documentation:**

- [CMS Consumer Guide](doc/CMS_CONSUMER_GUIDE.md): SDK, admin UI, and server composition
- [CMS Connector Guide](doc/CMS_CONNECTOR_GUIDE.md): How to write a new DB connector

### 📁 FM (File Manager)

A portable file manager with pluggable DB connectors and storage adapters (local disk, S3). The FM core is DB-agnostic and storage-agnostic; persistence and object storage are provided by connector and adapter packages.

**Import paths:**

| Path                                        | Contents                                                                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `@user27828/shared-utils/fm`                | Shared types, Zod schemas, error classes                                                                                                       |
| `@user27828/shared-utils/fm/server`         | `FmServiceCore`, `FmConnector` interface, Express router factories (admin, content, public), authz, storage adapters, conformance test harness |
| `@user27828/shared-utils/fm/client/api`     | `FmClient`, `FmClientError`, and API contracts without React or UI dependencies                                                                |
| `@user27828/shared-utils/fm/client/hooks`   | FM hooks and provider without FM UI components                                                                                                 |
| `@user27828/shared-utils/fm/client/ui`      | FM media library, picker, and viewer components                                                                                                |
| `@user27828/shared-utils/fm/server/core`    | `FmServiceCore` and connector contracts without Express routers                                                                                |
| `@user27828/shared-utils/fm/server/express` | FM Express authorization and router factories                                                                                                  |
| `@user27828/shared-utils/fm/server/s3`      | `FmStorageS3` adapter (requires optional `@aws-sdk` peer deps)                                                                                 |
| `@user27828/shared-utils/fm/client`         | `FmClient` SDK, `useFmListFiles` hook, `FmMediaLibrary`/`FmFilePicker` UI components, image variant utilities                                  |

**Key features:**

- Two-phase upload: presigned URL (direct to S3) or proxy upload through Express
- Variant management: thumb, preview, web variants with client-side generation
- Three router factories: admin CRUD, authenticated content delivery (short URLs), and public media, with pluggable authz
- Owner-or-admin access control model
- Content URL decoupling: separate content delivery from admin CRUD (`contentBaseUrl`)
- Local + S3 storage adapters with async factory
- Connector conformance test harness for new DB adapters

**Documentation:**

- [FM Consumer Guide](doc/FM_CONSUMER_GUIDE.md): SDK, admin UI, and server composition
- [FM Connector Guide](doc/FM_CONNECTOR_GUIDE.md): How to write a new DB connector

[🔝 Back to Top](#shared-utils)

## Configuration

### Centralized Configuration (Recommended)

```typescript
import { optionsManager } from "@user27828/shared-utils/utils/options";

optionsManager.setGlobalOptions({
  log: {
    type: "client",
    client: { production: ["warn", "error"] },
  },
  turnstile: {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    widget: { theme: "auto", size: "normal" },
  },
  "turnstile-server": {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
  },
});
```

### Framework Examples

#### Next.js

```typescript
// app/lib/utils-config.ts
import { optionsManager } from "@user27828/shared-utils/utils/options";

export function initializeUtils() {
  optionsManager.setGlobalOptions({
    turnstile: {
      siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
    },
    "turnstile-server": {
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
    },
  });
}
```

#### Express.js

```typescript
// server.js
import { optionsManager } from "@user27828/shared-utils/utils/options";

optionsManager.setGlobalOptions({
  log: { type: "server" },
  "turnstile-server": { secretKey: process.env.TURNSTILE_SECRET_KEY! },
});
```

[🔝 Back to Top](#shared-utils)

## Command Line Tools

- **`killnode`** - Kills Express server node processes (ignores VS Code, Electron, etc.)
- **`package-upgrade`** - Audit-first, age-gated dependency upgrade planning for Yarn, npm, and pnpm
- **`dependency-manager`** - Manages portal: resolutions for local development vs. production builds

### Consumer Efficiency Audit

After `yarn build`, run the maintained diagnostic to inspect published runtime
imports, JavaScript and declaration export targets, export closures, and
representative consumer bundles:

```bash
node scripts/dev/audit-efficiency.mjs --out /tmp/shared-utils-efficiency.json
node scripts/dev/audit-efficiency.mjs --vite --only easy-editor --out /tmp/shared-utils-editor-efficiency.json
node scripts/dev/audit-efficiency.mjs --help
```

Use `--json --only <fixture>` for a small machine-readable report. The audit
uses the installed workspace dependencies through a cleaned temporary mirror;
it does not install packages or measure isolated consumer installation costs.
Editor fixtures fail if an unselected editor or Prism module enters resolution;
these checks do not install packages or measure isolated consumer costs. Bundle
sizes and import counts are diagnostics, not performance budgets.
The `cms-constants` and `fm-constants` fixtures reject Zod/password/sanitizer
imports during resolution; the shared CMS/schema fixtures reject server helpers.

### Options Hot Path Benchmark

After `yarn build`, compare file/date formatting and logging with normal and
large unrelated `ENV` configuration:

```bash
node scripts/dev/benchmark-options.mjs
node scripts/dev/benchmark-options.mjs --iterations 1000 --samples 5 --large-env-keys 5000
node scripts/dev/benchmark-options.mjs --help
```

The report uses median milliseconds per operation and the large/small ratio.
Logger output is muted. It also counts reads of the unrelated `ENV` manager and
includes an all-options snapshot control. Timings are diagnostic and have no
absolute CI gate; compare runs on the same machine and Node version.

### Geographic Data and Selector Benchmark

After `yarn build`, measure country/language lookup and option generation,
timezone list/offset generation for winter and summer dates, and optionally
server-rendered selectors:

```bash
node scripts/dev/benchmark-geographic.mjs
node scripts/dev/benchmark-geographic.mjs --include-ui --samples 5 --duration-ms 150
node scripts/dev/benchmark-geographic.mjs --only timezone-options-winter --json
node scripts/dev/benchmark-geographic.mjs --help
```

The UI fixtures need the optional React, PropTypes, and MUI client dependencies.
Results report median milliseconds per operation and are diagnostic, with no
absolute CI gate. Compare runs on the same Node version and host.

To verify real packed installs with only one editor's documented peers, then
typecheck and build each editor entry in an isolated Yarn project, run:

```bash
node scripts/dev/verify-editor-isolation.mjs --out /tmp/shared-utils-editor-isolation.json
```

To check packed CMS/FM contracts with feature dependencies absent:

```bash
node scripts/dev/verify-contract-isolation.mjs --out /tmp/shared-utils-contract-isolation.json
# Reuse an existing freshly built archive:
node scripts/dev/verify-contract-isolation.mjs --tarball /tmp/shared-utils.tgz
```

This script extracts into a cleaned temporary project, checks native constants
and erased type modules with no dependencies, then supplies only Zod for shared
schemas and NodeNext/Bundler declaration checks. It uses the checkout's
TypeScript executable and does not install packages or access the network.

### Release artifacts and isolated installs

Workspace builds clean only their compiler-owned dist output before compiling.
The publish allowlist includes runtime JS, declarations, supported assets,
server JS maps with embedded source, and explicit CLI/support files. It omits
unit tests, dev scripts, build caches, and declaration maps pointing to
unpublished sources. The installed artifact check reads exports/bins and only
warns on missing files; it never builds or downloads anything.

```bash
yarn pack --out /tmp/shared-utils.tgz
node scripts/dev/verify-package-isolation.mjs --tarball /tmp/shared-utils.tgz --out /tmp/shared-utils-package-isolation.json
node scripts/dev/verify-package-isolation.mjs --tarball /tmp/shared-utils.tgz --only pure --samples 3 --cold-cache --out /tmp/shared-utils-cold-install.json
```

The maintained verifier checks the archive allowlist, every export/bin and
relative runtime/type/worker reference, embedded maps, and installed feature
fixtures. Each fixture is a real extracted Yarn install with only documented
peers, fresh Node probes or esbuild/Vite builds, and NodeNext/Bundler types.
`--only` narrows the matrix; `--samples` repeats fresh projects. Default install
timings share a warm download cache. `--cold-cache` starts each sample with an
empty download cache and requires registry access. Package counts, archive
bytes, and install timings are reported separately; none prove dev-server or
browser latency. Editor isolation remains a separate verifier and accepts
`--tarball` to reuse this archive.

The worker setup CLI generates `turnstile-worker.js` importing the public
worker factory and copies the packaged deployment helper. It does not depend
on unpublished TypeScript sources. Install Wrangler as a development dependency
in the consuming project before deployment.

### Dependency Manager

The `dependency-manager.js` script automatically handles portal: resolutions in package.json files based on the environment. This is essential for Cloudflare Workers which fail when portal: references exist in production.

**Key Features:**

- Auto-detects development vs. production environments
- Enables portal resolutions for local development
- Removes portal resolutions for production builds and CI/CD
- Supports monorepo structures (packages/, apps/, workers/, etc.)
- Works with both npm and yarn

**Usage in Consuming Projects:**

Option A - Automatic detection (recommended):

```json
{
  "scripts": {
    "dev": "dependency-manager && yarn dev",
    "build": "dependency-manager && yarn build",
    "cf:deploy": "dependency-manager && wrangler deploy"
  }
}
```

Option B - Explicit control:

```json
{
  "scripts": {
    "portal:enable": "dependency-manager --enable",
    "portal:disable": "dependency-manager --disable",
    "app:dev": "vite",
    "app:build": "vite build",
    "dev": "yarn portal:enable && yarn app:dev",
    "build": "yarn portal:disable && yarn app:build"
  }
}
```

**Configuration:**

Add a `_portalConfig` section to your package.json:

```json
{
  "dependencies": {
    "@user27828/shared-utils": "https://github.com/user27828/shared-utils.git#master"
  },
  "_portalConfig": {
    "@user27828/shared-utils": "../path/to/shared-utils"
  }
}
```

**Command Line Options:**

- No args: Auto-detects environment
- `--enable`: Force enable portal resolutions
- `--disable`: Force disable portal resolutions

### Package Scripts Integration

Add useful scripts to your `package.json`:

```json
{
  "scripts": {
    "kill": "npx killnode -9",
    "upgrade:plan": "yarn exec package-upgrade --json",
    "upgrade:apply": "yarn exec package-upgrade --apply --verify test",
    "dev": "dependency-manager && npx killnode && your-dev-command",
    "build": "dependency-manager && your-build-command",
    "cf:deploy": "dependency-manager && wrangler deploy"
  }
}
```

### Package upgrade safety

`package-upgrade` is a project-aware companion to the legacy interactive
`yarn upgrade` workflow. It resolves the nearest caller `package.json`, never
changes files without `--apply`, and only accepts registry package names plus
exact published versions. It uses argument-array process execution, disables
dependency lifecycle scripts, reads only structured registry/audit JSON, and
keeps its output compact for automated upgrade workflows.

The default manager is Yarn. Yarn 3/4, npm 10/11, and pnpm 9/10 are supported;
newer compatible major releases are accepted. For an age-gated Yarn project,
the tool reads `npmMinimalAgeGate` from that caller project's `.yarnrc.yml` and
rejects newer packages before any write.

```bash
# Plan every direct dependency upgrade from a nested directory; no files change.
yarn exec package-upgrade --project-dir packages/web

# Plan specific packages with compact machine-readable output.
yarn exec package-upgrade --json vite @types/node

# Triage selected exact versions in one low-token compatibility summary request.
yarn exec package-upgrade --inspect --summary --json typescript@7.0.2 vite@8.2.0

# Request full bounded compatibility and provenance metadata only when needed.
yarn exec package-upgrade --inspect --json typescript@7.0.2

# Summarize current advisories without returning the full audit payload.
yarn exec package-upgrade --audit --json

# Apply exact, eligible upgrades, audit afterwards, then run a trusted project test.
yarn exec package-upgrade --apply --verify test vite@8.2.0

# Use npm or pnpm in projects that use them.
npm exec -- package-upgrade --manager npm --apply --verify test eslint
pnpm exec package-upgrade --manager pnpm --apply --verify lint typescript

# Upgrade only the caller project's Corepack package-manager pin after its age check.
yarn exec package-upgrade --upgrade-package-manager --apply
```

The package-manager flag updates only `package.json`'s `packageManager` field;
it does not alter a global package-manager installation. Corepack obtains the
pinned manager on the next project invocation.

An age-gated package may be allowed only for a previously discovered major
security issue. Supply the exact candidate and advisory identifier; the current
audit must contain that high/critical CVE or GHSA, and the post-upgrade audit
must no longer contain it or the tool restores the original package manifest
and lockfile.

```bash
yarn exec package-upgrade --apply \
  --security-exception dompurify@3.4.12=CVE-2025-12345 \
  dompurify@3.4.12
```

Replace the example CVE with the exact high/critical advisory reported by the
current project audit; the example is syntax only, not a security claim.

Only `test`, `lint`, and `build` are allowed after `--verify`; this prevents
arbitrary command text from being executed by the CLI. The project commands
themselves remain trusted code selected by the caller.

`--inspect` is read-only and accepts one to 32 exact package versions. A
single result is returned as `inspection`; a batch is returned as
`inspections`. `--summary` omits dependency maps and integrity hashes, returning
only compact compatibility signals and bounded dependency counts; use it for
the first pass. Full results include publication time, age-gate outcome,
deprecation status, engines, bounded dependency/peer-dependency maps, and
validated integrity hashes. Every result includes the active Node version to
evaluate engine requirements without a separate environment command. All
inspection forms exclude descriptions, maintainers, repository/tarball URLs,
and other free-form registry text.
`--audit` is also read-only and emits severity counts plus high/critical CVE
and GHSA identifiers instead of the raw audit document.

`yarn upgrade` remains the interactive Yarn workflow and calls
`yarn upgrade-interactive`. Use it when selecting upgrades manually; use
`package-upgrade` for repeatable, audit-first automation.

### Using `/yarn-upgrade` in consuming projects

When a consuming project has the `/yarn-upgrade` GHCP/Codex prompt or skill,
the agent should use the `package-upgrade` binary provided by the installed
`@user27828/shared-utils` package from the target project's directory. If the
binary is not available, add or link this package using the consuming
project's normal package-manager workflow before planning upgrades.

The agent should begin with a read-only plan, review each eligible candidate's
release notes, actual usage, downstream impact, and current audit, then apply
only the reviewed exact specs. It must not apply `rejected-age-gate`
candidates. Patch and minor upgrades may use `--apply --verify test` (or an
equivalent trusted verification); major upgrades require a confirmed
compatibility plan or the user's decision before application. The prompt's
workflow is the authority for this process; the package-owned CLI is the
execution mechanism.

### Shared Spec-Kit and Codex synchronization

The package owns the synchronization implementation in
`scripts/speckit-sync.sh` and publishes it as the
`shared-utils-speckit-sync` executable. Consuming repositories should invoke
that package executable instead of copying the script.

Add a folder-open task to a consuming repository's `.vscode/tasks.json`:

```json
{
  "label": "sync-speckit-bridge",
  "type": "shell",
  "command": "yarn",
  "args": ["exec", "shared-utils-speckit-sync", "--no-global"],
  "runOptions": {
    "runOn": "folderOpen"
  },
  "problemMatcher": [],
  "presentation": {
    "reveal": "silent",
    "panel": "dedicated",
    "close": true
  }
}
```

The consuming repository must also enable automatic tasks with
`"task.allowAutomaticTasks": "on"` in `.vscode/settings.json`. The runner
uses the consuming repository as its Git root and reads its Spec-Kit prompts.
Before syncing, it detects whether GitHub Copilot or Codex is installed. If
neither client is available, the task exits without creating or changing any
bridge, prompt, or skill files.
The runner has separate repository and user-global scopes:

- Repository prompts under `.github/prompts/` are written to the repository's
  `.agents/skills/` when that directory is writable. This is the default and
  keeps project commands out of the shared global namespace.
- User-global VS Code prompts are mirrored into `CODEX_HOME/prompts/` and are
  exposed as bare Codex skills under `CODEX_HOME/skills/<prompt-id>/SKILL.md`.
  This is how a global `yarn-upgrade.prompt.md` becomes `/yarn-upgrade`, along
  with existing global `/implement` and `/audit` adapters.
- If project-local `.agents/skills/` is unavailable, repository prompts are
  skipped unless `--global-repository` is explicitly supplied. That flag is a
  deliberate compatibility fallback and may update `CODEX_HOME`.

Use `--no-global` for automatic or project-only synchronization. It updates
repository bridge files and project-local skills without changing `CODEX_HOME`.
Normal synchronization never prunes generated entries. Use `--prune` to remove
only entries owned by the current repository, or add `--prune-global` when
intentionally cleaning entries generated from global VS Code prompts.

Global writes are serialized with a lock under `CODEX_HOME`. Generated entries
carry owner and source metadata; the runner preserves unmanaged files,
symlinks, non-file collisions, entries owned by another repository or scope,
and legacy entries whose ownership cannot be proven. A legacy global mirror is
adopted only when its recorded source is an existing prompt in a detected
global VS Code prompt directory. The generated adapters read their source
prompt at invocation time, so the source prompt remains authoritative and
repository instructions remain in force.

Within this repository, the equivalent command is `yarn speckit:sync`.

[🔝 Back to Top](#shared-utils)

## Graphify Knowledge Graph

This repository maintains a navigable codebase graph in [`graphify-out/`](./graphify-out/). The graph is useful for finding architecture relationships, tracing callers, and orienting yourself before editing unfamiliar code. Generated graph files are disposable outputs; do not edit them manually.

### Install Graphify

The `graphify` command is provided by the `graphifyy` Python package. Install it with `uv` when available:

```bash
uv tool install --upgrade graphifyy
```

Or install it into the current user's Python environment:

```bash
python3 -m pip install --user --upgrade graphifyy
```

The repository's code graph does not require an API key. `GEMINI_API_KEY` or `GOOGLE_API_KEY` is optional when richer semantic extraction is wanted for documents, papers, or images.

### Build and query the graph

Run a full graph build from the repository root when `graphify-out/graph.json` does not exist or a clean rebuild is needed:

```bash
graphify .
```

The build writes `graph.json`, `graph.html`, and `GRAPH_REPORT.md` under `graphify-out/`. Use the existing graph for focused navigation:

```bash
# Broad relationship traversal
graphify query "How does the CMS client reach the server service core?"

# Focused traversal and shortest-path analysis
graphify query "How are test consumer suites run?" --dfs
graphify path "App.tsx" "testSuiteAutomation.ts"
graphify explain "OptionsManager"
```

### Update the graph

After adding or modifying source files, run the incremental update from the repository root:

```bash
graphify update .
```

This re-extracts changed files and refreshes the graph outputs while preserving the existing manifest. Run it after code changes so `graphify-out/` stays aligned with the working tree. If the graph does not exist yet, use `graphify .` first.

[🔝 Back to Top](#shared-utils)

## Usage Examples

Complete examples are available in the [`utils/examples/`](./utils/examples/) directory:

- **`turnstile-client-init.js`** - Client-side Turnstile setup
- **`turnstile-server-init.js`** - Direct server-side verification example
- **`express-middleware.js`** - Express.js integration
- **`turnstile-react-component.tsx`** - React component integration

[🔝 Back to Top](#shared-utils)

## Deployment Guide

For deploying Turnstile workers in your own projects:

### 📖 Documentation

- **[Worker Deployment Guide](./doc/WORKER_DEPLOYMENT_GUIDE.md)** - Complete deployment strategies
- **[Example Integration](./examples/CONSUMING_PROJECT_EXAMPLE.md)** - Step-by-step example

### Quick Setup

```bash
# Set up Turnstile worker in your project
npx cf:setup-turnstile-worker --name "myapp-turnstile" --origins "https://myapp.com"

# Configure and deploy
cd workers/turnstile
wrangler secret put TURNSTILE_SECRET_KEY
./deploy-turnstile-worker.sh production
```

[🔝 Back to Top](#shared-utils)

## Documentation

- **[Utils Documentation](./utils/README.md)** - Complete API reference for logging, Turnstile, and OptionsManager
- **[Server Documentation](./server/README-SERVER.md)** - Server-side integration and Cloudflare Workers
- **[Deployment Guide](./doc/WORKER_DEPLOYMENT_GUIDE.md)** - Complete deployment strategies
- **[WYSIWYG Setup Guide](./doc/WYSIWYG_SETUP.md)** - Unified editor API, picker/upload hooks, and per-editor configuration
- **[TinyMCE Setup Guide](./doc/TINYMCE_SETUP.md)** - Notes for bundlers (especially Vite)
- **[CKEditor 5 Setup Guide](./doc/CKEDITOR_SETUP.md)** - Peer deps, upload/picker hooks, extensibility
- **[FM Consumer Guide](./doc/FM_CONSUMER_GUIDE.md)** - File Manager SDK, admin UI, and server composition
- **[FM Connector Guide](./doc/FM_CONNECTOR_GUIDE.md)** - How to write a new FM DB connector
- **[Example Integration](./examples/CONSUMING_PROJECT_EXAMPLE.md)** - Step-by-step integration example

[🔝 Back to Top](#shared-utils)

---

### Package Structure

```
├── utils/           # Core utilities (log, turnstile, OptionsManager)
├── client/          # React components and helpers
├── server/          # Cloudflare Workers and deployment scripts
├── bin/             # Command-line tools
└── examples/        # Complete integration examples
```

---

Thx "AI" for writing the tests and parts of the readme files. Now, plz don't kill me during the revolution. Thx!

---

_Love, User27828_ ❤️

[🔝 Back to Top](#shared-utils)
