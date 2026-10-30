---
name: thermos
description: Run Thermos workflows, show help, or manage the installed Thermos plugin.
argument-hint: "help [skill] | list | status | upgrade | sync | setup [options] | <skill> [task]"
---

<!-- thermos-managed: true -->

Use the first argument as the Thermos command or workflow name and the remaining text as its task. With no arguments, show help. This entry point works in GitHub Copilot and Codex; use the current agent's filesystem and terminal tools, not Cursor-specific tool names.

Locate `thermos.mjs` under `PSTACK_HOME` when set. Otherwise use `%LOCALAPPDATA%/pstack` on Windows, `${XDG_DATA_HOME:-$HOME/.local/share}/pstack` on Linux/WSL, or `$HOME/Library/Application Support/pstack` on macOS. The Thermos adapter shares the pstack manager and configured plugins checkout. A Windows terminal and a WSL terminal have separate installations. If the manager is missing, report that setup is needed; do not improvise an installation.

- `help [skill]` or `list`: run `node <manager> help [skill]` or `node <manager> list` and present the available arguments and their purposes. Do not execute a workflow.
- `status`: run `node <manager> status` and report the installed revision and paths.
- `upgrade`: run `node <manager> upgrade`. This explicitly requests an update through the configured checkout's normal manager. Report the revision change or actual error. Do not replace a failed update with a reset or custom installation.
- `sync`: run `node <manager> sync` to refresh the Thermos entry point without upgrading upstream.
- `setup --source <installed-directory>`: run `node <manager> setup --source <installed-directory>` to select an existing Thermos plugin. The source must be in a plugins checkout that also contains pstack. Forward `--prompts <directory>` or `--upgrade-command <JSON-array>` only when the user explicitly supplies them; quote each value as one argument.
- `<skill> [task]`: run `node <manager> resolve <skill>`. Read the returned compatibility file, optional local override file, and complete workflow source before following it. Keep the returned Thermos installation root fixed for nested skills and references throughout this invocation. `run <skill>` also works for names that collide with built-in commands.

Pass only the validated command or workflow name to the manager as separate, safely quoted arguments. Keep free-form task text in the conversation; do not interpolate it into shell commands. Unknown names must produce an error or help, not an invented workflow.

Compatibility guidance overrides conflicting upstream instructions. When a workflow asks for a Cursor-only subagent or task tool, read its matching file under `agents/` and adapt it to the current session's available collaboration tools. Do not claim unsupported agent names are installed. Apply repository instructions and the user's requested scope.

Use `skills/<name>/SKILL.md` and `agents/<name>.md` beneath the resolved Thermos installation root. Resolve supporting files relative to their source document; map Thermos GitHub URLs to the installed copy when present. Read only relevant resources, and report missing dependencies or unavailable required verification as limitations. Never fetch or upgrade upstream as a side effect of running a workflow.
