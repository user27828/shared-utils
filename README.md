# shared-utils

Collection of common utilities I use for various projects

## Import Paths

**Important**: Use specific import paths for clarity and to avoid issues with JSX components in Node.js environments when not intended.

```typescript
// ✅ Recommended for Utils
import { log } from '@user27828/shared-utils/utils';

// 🚫 Importing from the root is NOT supported for specific utils or components.
// import { log } from '@user27828/shared-utils'; // This will not work.

// ✅ Recommended for Client components (React/Next.js apps)
import { CountrySelect, LanguageSelect } from '@user27828/shared-utils/client';

// 🚫 Importing client components from the root is NOT supported.
// import { CountrySelect } from '@user27828/shared-utils'; // This will not work.
```

## Available Modules

### Utils (`/utils`)
- **Logging utility**: Production-safe console wrapper with environment detection
- Auto-detects client/server environment
- Supports custom interceptors for analytics
- See `/utils/README.md` for detailed documentation

### Client Components (`/client`)
- **Form Components**: `CountrySelect`, `LanguageSelect`
- **WYSIWYG Editors**: `TinyMceEditor`, `TinyMceBundle`
- **Helper Functions**: Various utility functions
- Requires React environment (JSX support)

## Command Line Tools

 - `killnode` - Kills instances of node server processes that are likely to be running from an Express server.  It *should* ignore node processes from VS Code, Electron, Android Studio, etc.
 - `yarn-upgrade` - Wraps `yarn upgrade-interactive` to install the interactive-tools package on demand and remove it when complete.  This was a quick fix to make repos compatible with Cloudflare Pages, which barfs🤢 when yarn-based repos have plugins (as of 2025-03).  This will prompt you to upgrade the server directory seperately if you have yarn workspaces enabled for that directory, and a root-level alias for `yarn server upgrade`.
 This utility will automatically leave interactive-tools alone if it's already installed (it won't uninstall it at the end.)
 - Other scripts are undocumented because they're less refined or a ~two-off.
 - `client/*` - Client-related libraries.  Be aware that additional Babel or Vite configuration may be required for certain dev situations.
 - `client/components/*Editor.jsx` - WYSIWYG editor instances
  
## Usage in your repository

- In your `package.json`, add this to your `dependencies` or `devDependencies` (usage varies):
  - `"@user27828/shared-utils": "github:user27828/shared-utils#master",`
  - OR run `yarn add @user27828/shared-utils@github:user27828/shared-utils#master`
- Utilize the utilities in your `scripts`, for example:
  - `"kill": "npx killnode -9",`
  - `"upgrade": "npx yarn-upgrade-interactive --skip-server"` (remove `--skip-server` to prompt for server upgrades automatically - if you run yarn workspaces, this happens automatically)

## Usage in THIS repository

Instead of the usual `yarn ...`, run `npx ...`