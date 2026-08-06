# Spec-Kit Bridge

This file is the shared Spec-Kit instruction bridge for both GitHub Copilot Chat and Codex.

## Source of truth

- `AGENTS.md` remains the repository-wide instruction layer.
- `.specify/` remains the Spec-Kit runtime and workflow layer.
- `.github/copilot-instructions.md` should stay as a thin Copilot shim.
- Codex should use the native Spec-Kit Codex integration when the repo can write `.agents/skills`.
- If `.agents/skills` is unavailable or read-only, Codex should use the global `spec-kit-bridge` skill and this bridge file.
- Global VS Code prompts are mirrored into `CODEX_HOME/skills/<prompt-id>/SKILL.md` so they work as bare Codex skills such as `/implement` and `/audit`.
- The native Codex prompt mirror in `CODEX_HOME/prompts/<prompt-id>.md` is retained for clients that use the `/prompts:<prompt-id>` namespace.

## Preferred bootstrap

- New Spec-Kit projects should start with `specify init --here --integration copilot`.
- Add Codex with `specify integration install codex` on repositories where `.agents/skills` is writable.
- If Codex installation fails because `.agents/skills` cannot be written, keep the global Codex skill as the fallback.

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

In this repository, run `yarn speckit:sync`; in consuming repositories, run `yarn exec shared-utils-speckit-sync` after Spec-Kit metadata or prompt changes to keep the Copilot shim, Codex prompt aliases, and global Codex skill adapters aligned. This package-owned runner reads the current repository's `.github/prompts/speckit.*` files as that project's Spec-Kit sources.
