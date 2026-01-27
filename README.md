# shared-utils

Collection of common utilities for web applications. Features centralized configuration through **OptionsManager** and environment-aware utilities that work across client/server contexts.

## 📋 Table of Contents

- [shared-utils](#shared-utils)
  - [📋 Table of Contents](#-table-of-contents)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
    - [Import Paths](#import-paths)
    - [Basic Setup](#basic-setup)
  - [Available Modules](#available-modules)
    - [📋 Utils](#-utils)
    - [🎨 Client Components](#-client-components)
      - [📝 WYSIWYG Editor Components](#-wysiwyg-editor-components)
    - [🚀 Server](#-server)
  - [Configuration](#configuration)
    - [Centralized Configuration (Recommended)](#centralized-configuration-recommended)
    - [Framework Examples](#framework-examples)
      - [Next.js](#nextjs)
      - [Express.js](#expressjs)
  - [Command Line Tools](#command-line-tools)
    - [Dependency Manager](#dependency-manager)
    - [Package Scripts Integration](#package-scripts-integration)
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

# Using npm
npm install @user27828/shared-utils@https://github.com/user27828/shared-utils.git#master
```

[🔝 Back to Top](#shared-utils)

## Quick Start

### Import Paths

Use specific import paths for clarity:

```typescript
// ✅ Utils and configuration
import { log, turnstile, optionsManager } from "@user27828/shared-utils/utils";

// ✅ Client components (React/Next.js)
import {
  CountrySelect,
  LanguageSelect,
  FileIcon,
} from "@user27828/shared-utils/client";

// ✅ WYSIWYG Editors (requires peer dependencies)
// TinyMCE: yarn add @tinymce/tinymce-react tinymce
// CKEditor 5: yarn add ckeditor5 @ckeditor/ckeditor5-react
// MDXEditor: yarn add @mdxeditor/editor
import {
  TinyMceEditor,
  CKEditor5Classic,
  MDXEditor,
} from "@user27828/shared-utils/client/wysiwyg";

// ✅ Server functionality
import { verifyTurnstileTokenEnhanced } from "@user27828/shared-utils/server";
```

### Basic Setup

```typescript
import { optionsManager } from "@user27828/shared-utils/utils";

// Configure utilities
optionsManager.setGlobalOptions({
  log: {
    type: "client",
    client: { production: ["warn", "error"] },
  },
  turnstile: {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    secretKey: process.env.TURNSTILE_SECRET_KEY,
  },
});
```

[🔝 Back to Top](#shared-utils)

## Available Modules

### 📋 [Utils](/utils/README.md)

Core utilities with environment detection and centralized configuration:

- **Logging**: Production-safe console wrapper
- **Turnstile**: Cloudflare bot protection integration
- **OptionsManager**: Unified configuration system
- **isDev**: Development environment detection utility

### 🎨 [Client Components](/client)

React components and client-side helpers:

- **Form Components**: `CountrySelect`, `LanguageSelect`
- **File Icons**: `FileIcon` - MUI icons for 70+ file types and MIME types
- **Helper Functions**: Country/language utilities, CSV helpers

#### 📝 WYSIWYG Editor Components

WYSIWYG components are available as an optional separate import to avoid forcing editor dependencies on projects that don't need them. Three editors are available:

**TinyMCE Editor** (Rich HTML editor):

```bash
# Install required peer dependencies
yarn add @tinymce/tinymce-react tinymce
```

````typescript
import { TinyMceEditor } from "@user27828/shared-utils/client/wysiwyg";

<TinyMceEditor
  data={htmlContent}
  onChange={(event, editor) => setContent(editor.getData())}
  onUploadImage={async (request) => {
    // Upload image and return URL
    return { url: "https://example.com/image.png" };
  }}
/>

**CKEditor 5 Classic** (Rich HTML editor):

```bash
# Install required peer dependencies
yarn add ckeditor5 @ckeditor/ckeditor5-react
````

```typescript
import { CKEditor5Classic } from "@user27828/shared-utils/client/wysiwyg";

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

````

**MDXEditor** (Markdown editor):

```bash
# Install required peer dependencies
yarn add @mdxeditor/editor
````

```typescript
import { MDXEditor } from "@user27828/shared-utils/client/wysiwyg";

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

### 🚀 [Server](/server/README-SERVER.md)

Server-side functionality and Cloudflare Workers:

- **Turnstile Verification**: Token validation service
- **Deployment Scripts**: Automated Cloudflare Worker deployment
- **Configuration Templates**: Ready-to-use examples

Server utilities

- **getClientIp(req)**: Robust helper to extract the client's IP address from a Request-like object. It checks common proxy headers (x-forwarded-for, x-real-ip, cf-connecting-ip, etc.), handles IPv6 formats (including bracketed addresses and IPv4-mapped IPv6 ::ffff:), and falls back to socket properties such as `req.ip`, `req.connection.remoteAddress`, or `req.socket.remoteAddress`.

Usage example:

```typescript
import { getClientIp } from "@user27828/shared-utils/server";

const ip = getClientIp(req);
```

[🔝 Back to Top](#shared-utils)

## Configuration

### Centralized Configuration (Recommended)

```typescript
import { optionsManager } from "@user27828/shared-utils/utils";

optionsManager.setGlobalOptions({
  log: {
    type: "client",
    client: { production: ["warn", "error"] },
  },
  turnstile: {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    widget: { theme: "auto", size: "normal" },
  },
});
```

### Framework Examples

#### Next.js

```typescript
// app/lib/utils-config.ts
import { optionsManager } from "@user27828/shared-utils/utils";

export function initializeUtils() {
  optionsManager.setGlobalOptions({
    turnstile: {
      siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
    },
  });
}
```

#### Express.js

```typescript
// server.js
import { optionsManager } from "@user27828/shared-utils/utils";

optionsManager.setGlobalOptions({
  log: { type: "server" },
  turnstile: { secretKey: process.env.TURNSTILE_SECRET_KEY! },
});
```

[🔝 Back to Top](#shared-utils)

## Command Line Tools

- **`killnode`** - Kills Express server node processes (ignores VS Code, Electron, etc.)
- **`yarn-upgrade`** - Interactive yarn upgrade with Cloudflare Pages compatibility
- **`dependency-manager`** - Manages portal: resolutions for local development vs. production builds

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
    "enable:portal": "dependency-manager --enable",
    "disable:portal": "dependency-manager --disable",
    "dev": "yarn enable:portal && yarn dev",
    "build": "yarn disable:portal && yarn build"
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
    "upgrade": "npx yarn-upgrade-interactive --skip-server",
    "dev": "dependency-manager && npx killnode && your-dev-command",
    "build": "dependency-manager && your-build-command",
    "cf:deploy": "dependency-manager && wrangler deploy"
  }
}
```

[🔝 Back to Top](#shared-utils)

## Usage Examples

Complete examples are available in the [`/utils/examples/`](/utils/examples/) directory:

- **`client-init.js`** - Client-side setup
- **`server-init.js`** - Server-side configuration
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
- **[TinyMCE Setup Guide](./doc/TINYMCE_SETUP.md)** - Notes for bundlers (especially Vite)
- **[CKEditor 5 Setup Guide](./doc/CKEDITOR_SETUP.md)** - Peer deps, upload/picker hooks, extensibility
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
