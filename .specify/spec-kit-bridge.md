# Spec-Kit Bridge

This file is the shared Spec-Kit instruction bridge for both GitHub Copilot Chat and Codex.

## Source of truth

- `AGENTS.md` remains the repository-wide instruction layer.
- `.specify/` remains the Spec-Kit runtime and workflow layer.
- `.github/copilot-instructions.md` should stay as a thin Copilot shim.
- Repository prompts are mirrored into the active repository's `.agents/skills` when that directory is writable, keeping project commands out of the shared global namespace.
- If `.agents/skills` is unavailable or read-only, Codex should use the global `spec-kit-bridge` skill and this bridge file, or explicitly opt into the legacy global repository fallback with `--global-repository`.
- Global VS Code prompts are mirrored into `CODEX_HOME/skills/<prompt-id>/SKILL.md` so they work as bare Codex skills such as `/implement` and `/audit`.
- The native Codex prompt mirror in `CODEX_HOME/prompts/<prompt-id>.md` is retained for user-global prompts and explicit repository fallback only.
- Generated global mirrors carry an owner identity. A repository sync cannot overwrite another owner, unmanaged file, symlink, or legacy generated file without ownership metadata.
- A legacy global mirror is adopted only when its recorded source is an existing prompt in a detected global VS Code prompt directory; repository-derived legacy mirrors remain protected because their ownership cannot be proven.
- Normal sync does not prune global mirrors. Use `--prune` to remove only this repository's generated entries, or explicitly use `--prune-global` for global-source cleanup.

## Preferred bootstrap

- New Spec-Kit projects should start with `specify init --here --integration copilot`.
- Add Codex with `specify integration install codex` on repositories where `.agents/skills` is writable.
- If Codex installation fails because `.agents/skills` cannot be written, keep the global `spec-kit-bridge` skill as the fallback; do not claim generic global prompt IDs unless `--global-repository` is explicitly requested.

## Shared workflow

When working on Spec-Kit tasks in this repository:

- Read `AGENTS.md` first for durable repo rules when it exists.
- Read `.specify/integration.json` and `.specify/init-options.json` for the current Spec-Kit setup.
- Read `.specify/workflows/workflow-registry.json` and the active workflow definition before assuming behavior.
- Read `specs/product_spec.md`, `specs/technical_spec.md`, and `specs/constitution.md` for brownfield context.
- If a feature is active, read the feature directory under `specs/<feature>/` before planning or implementing.

## Slash-command mapping

Codex does not expose GitHub Copilot slash commands directly. Use the equivalent workflow intent instead:

- `/speckit.specify` -> create or update the feature spec and checklist
- `/speckit.plan` -> generate the implementation plan and research artifacts
- `/speckit.tasks` -> break the plan into tasks
- `/speckit.implement` -> execute the task list
- `/speckit.checklist` -> validate the generated spec or plan
- `/speckit.analyze` -> inspect the current feature and surface gaps
- `/speckit.constitution` -> update or review governance rules

## Sync path

In this repository, run `yarn speckit:sync`; in consuming repositories, run `yarn exec shared-utils-speckit-sync` after Spec-Kit metadata or prompt changes to keep the Copilot shim, project Codex skills, and user-global Codex adapters aligned. This package-owned runner reads the current repository's `.github/prompts/speckit.*` files as that project's Spec-Kit sources. Automatic folder-open tasks should pass `--no-global`; that mode updates project skills without mutating user-level Codex state.
