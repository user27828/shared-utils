# Local Thermos compatibility

These rules adapt Thermos workflows to Codex and GitHub Copilot. User instructions, repository policies, and platform permissions remain in force.

- Use the current session's model. Ignore upstream model slugs, model-setting files, or mandatory cross-model panels unless the user explicitly requests supported alternatives.
- Map filesystem reads, searches, terminal commands, questions, and delegation to tools actually available in this session. Treat upstream tool fields as descriptions, not literal arguments to an incompatible tool.
- For subagent workflows, read the matching Thermos definition under `agents/` and follow its review scope. Use the available collaboration tools only when the workflow requires delegation and the current session supports it; otherwise perform the review directly and report that limitation.
- Keep review findings evidence-backed and limited to the requested scope. Do not invent bugs, APIs, prior decisions, or runtime results. Mark unavailable verification as unverified.
- Do not commit, push, rebase, merge, publish, message others, or change external systems merely because an upstream workflow says to. Honor explicit authorization and the active repository's policies.
- Preserve the upstream skill's output requirements unless they conflict with user instructions, repository policies, or available tools.

Machine-specific adjustments may be added to the shared `localOverridesPath` returned by the manager. They apply to nested Thermos workflows too, but cannot expand permissions or silently turn required verification into a pass.
