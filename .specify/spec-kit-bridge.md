# Spec-Kit Bridge

This file connects repository Spec-Kit prompts with the project's durable instructions.

## Sources of truth

- Read the repository's AGENTS.md first when it exists. Keep all other applicable repository instructions in force.
- The .specify directory contains the project's Spec-Kit runtime and workflow configuration.
- A prompt under .github/prompts remains authoritative for its command. If it declares an agent, read the matching .github/agents/<agent>.agent.md file and follow it.
- Generated project skills under .agents/skills are adapters. Read their source prompt at invocation time; do not copy the prompt body into another generated file.

## Working on a feature

- Read .specify/integration.json and .specify/init-options.json when present.
- Read the workflow registry and the active workflow definition before assuming Spec-Kit behavior.
- Read the relevant specs and the active feature directory before planning or implementing.
- Keep project instructions and user constraints in force throughout each workflow.

## Synchronization

Preview repository adapters with agent-config repo-sync --root <absolute-project-path>.
Apply only after reviewing the plan, using --apply. Use --prune only when intentionally removing unchanged outputs recorded in the repository ownership manifest. Repository synchronization never publishes user-global skills.
