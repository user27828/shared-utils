---
name: pstack
description: Run an installed pstack workflow, show help, or upgrade the local pstack installation.
argument-hint: "help [skill] | list | status | upgrade | sync | <skill> [task]"
---

<!-- pstack-managed: true -->

Use the first argument as the pstack command or skill name and the remaining text as its task. With no arguments, show help. This entry point works in GitHub Copilot and Codex; use the current agent's filesystem and terminal tools, not Cursor-specific tool names.

Locate `pstack.mjs` under `PSTACK_HOME` when set. Otherwise use `%LOCALAPPDATA%/pstack` on Windows, `${XDG_DATA_HOME:-$HOME/.local/share}/pstack` on Linux/WSL, or `$HOME/Library/Application Support/pstack` on macOS. Resolve these paths using the terminal host's environment. A Windows terminal and a WSL terminal have separate installations. If the manager is missing, report that setup is needed; do not improvise an installation.

- `help [skill]` or `list`: run `node <manager> help [skill]` and present the available arguments and their purposes. Do not execute a workflow.
- `status`: run `node <manager> status` and report the installed revision and paths.
- `upgrade`: run `node <manager> upgrade`. This explicitly requests an update through the existing installation's normal manager; it does not authorize product changes. Report the revision change or the actual error. Do not replace a failed update with a reset or a custom installation.
- `sync`: run `node <manager> sync` to refresh managed entry points without upgrading pstack.
- `setup --source <installed-directory>`: run `node <manager> setup --source <installed-directory>` to select an existing installation. Forward `--prompts <directory>` or `--upgrade-command <JSON-array>` only when the user explicitly supplies them; quote each value as one argument.
- `<skill> [task]`: run `node <manager> resolve <skill>`. Read the returned compatibility file, optional local override file, and complete skill source before following the workflow. Keep the returned installation root fixed for nested skills and references throughout this invocation. `run <skill> [task]` also works and disambiguates any skill named like a built-in command.

Pass only the validated command/skill/ref to the manager as separate, safely quoted arguments. Keep free-form task text in the conversation; do not interpolate it into shell commands. Unknown names must produce an error or help, not an invented workflow.

Compatibility guidance explicitly overrides conflicting upstream instructions. Load the adjacent `implement.prompt.md` for implementation, bug-fix, refactoring, or performance-change work; load `audit.prompt.md` for audits and reviews. Apply their relevant quality rules without changing the user's chosen workflow or scope. Resolve them from the `promptDirectory` returned by the manager. If an applicable prompt is missing, report it rather than silently omitting its rules.

Use `skills/<name>/SKILL.md` beneath the resolved installation root for nested pstack skills. Resolve supporting files relative to their source document; map upstream pstack GitHub URLs to the installed copy when present. Read only relevant resources, and report missing dependencies or unavailable required verification as limitations. Never fetch or upgrade upstream as a side effect of running a skill.
