# shared-utils

Collection of common utilities I use for various projects

 - `killnode` - Kills instances of node server processes that are likely to be running from an Express server.  It *should* ignore node processes from VS Code, Electron, Android Studio, etc.
 - `yarn-upgrade` - Wraps `yarn upgrade-interactive` to install the interactive-tools package on demand and remove it when complete.  This was a quick fix to make repos compatible with Cloudflare Pages, which barfs🤢 when yarn-based repos have plugins (as of 2025-03).  This will prompt you to upgrade the server directory seperately if you have yarn workspaces enabled for that directory, and a root-level alias for `yarn server upgrade`.
 This utility will automatically leave interactive-tools alone if it's already installed (it won't uninstall it at the end.)
 - Other scripts are undocumented because they're less refined or a ~two-off.
  
## Usage in your repository

- In your `package.json`, add this to your `dependencies` or `devDependencies` (usage varies):
  - `"@user27828/shared-utils": "@user27828/shared-utils": "github:user27828/shared-utils#master",` 
  - OR run `yarn add @user27828/shared-utils@github:user27828/shared-utils#master`
- Utilize the utilities in your `scripts`, for example:
  - `"kill": "npx killnode -9",`
  - `"upgrade": "npx yarn-upgrade-interactive --skip-server"` (remove `--skip-server` to prompt for server upgrades automatically - if you run yarn workspaces, this happens automatically)