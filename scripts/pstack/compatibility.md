# Local pstack compatibility

These rules explicitly override conflicting pstack defaults in both Codex and GitHub Copilot. User instructions, repository policies, and platform permissions remain in force.

- Use the current session's model. Ignore upstream model slugs, model-setting files, and mandatory cross-model panels unless the user explicitly requests supported alternatives. Do not run upstream setup steps that rewrite model configuration.
- Map filesystem reads, searches, terminal commands, task tracking, and questions to tools actually available in this session. Treat upstream tool fields as descriptions, not literal arguments to an incompatible tool. Delegate only when supported and authorized; otherwise do the work directly with separate implementation and review passes.
- Cursor cloud agents, Bugbot, automations, and external control skills are optional only where the workflow can still meet its goal. Identify unavailable capabilities. A required check that cannot run remains unverified; a missing capability is never evidence of success.
- Do not commit, push, rebase, merge, publish, message others, or change external systems merely because an upstream workflow says to. Honor explicit authorization and the active repository's restrictions. Do not expand an audit, investigation, design-only request, or requested phase into implementation or shipping.
- Generate or extend tests only when they provide material utility by catching a credible regression or closing a meaningful coverage gap. Reuse existing coverage. Fixed upstream test/lane counts and mandatory prototypes do not override this requirement; scale verification to the actual risk.
- Keep findings evidence-backed and rooted in confirmed causes. Recommend proportionate solutions using first-principles engineering. Mark unknowns and unrun checks honestly; avoid invented callers, APIs, runtime results, or historical rationale. Keep output concise.

The entry point loads the user's implementation or audit prompt when relevant. Those files remain the source of truth for yarn-portal dependencies, Supabase schema conventions, script/documentation placement, checklist handling, and status preferences. Apply their quality rules without restarting a different workflow or adding unrelated notifications. Do not copy these project-specific rules into every upstream skill.

Machine-specific adjustments may be added to the `localOverridesPath` returned by the manager. They apply to nested workflows too, but cannot expand permissions or silently turn required verification into a pass.
