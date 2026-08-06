#!/usr/bin/env bash

set -euo pipefail

# This is the single synchronization implementation distributed by the package.
# It must run with the consuming repository as the current Git workspace.
if ! ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  echo "Spec-Kit sync must run from inside a Git repository." >&2
  exit 1
fi
BRIDGE_FILE="$ROOT_DIR/.specify/spec-kit-bridge.md"
COPILOT_FILE="$ROOT_DIR/.github/copilot-instructions.md"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
CODEX_PROMPTS_DIR="$CODEX_HOME_DIR/prompts"
CODEX_SKILLS_DIR="$CODEX_HOME_DIR/skills"

has_github_copilot() {
  local extension_root extension_dir

  if [[ "${SHARED_UTILS_SYNC_GHCP_PRESENT:-}" == "0" ]]; then
    return 1
  fi

  if [[ "${SHARED_UTILS_SYNC_GHCP_PRESENT:-}" == "1" ]]; then
    return 0
  fi

  if command -v ghcp >/dev/null 2>&1 || command -v gh-copilot >/dev/null 2>&1; then
    return 0
  fi

  for extension_root in \
    "${VSCODE_EXTENSIONS_DIR:-}" \
    "$HOME/.vscode/extensions" \
    "$HOME/.vscode-server/extensions" \
    "${USERPROFILE:-}/.vscode/extensions"; do
    [[ -d "$extension_root" ]] || continue

    for extension_dir in \
      "$extension_root"/github.copilot-* \
      "$extension_root"/github.copilot-chat-*; do
      if [[ -d "$extension_dir" ]]; then
        return 0
      fi
    done
  done

  return 1
}

has_codex() {
  if [[ "${SHARED_UTILS_SYNC_CODEX_PRESENT:-}" == "0" ]]; then
    return 1
  fi

  if [[ "${SHARED_UTILS_SYNC_CODEX_PRESENT:-}" == "1" ]]; then
    return 0
  fi

  if command -v codex >/dev/null 2>&1; then
    return 0
  fi

  if [[ -d "$ROOT_DIR/.agents/skills" || -d "$CODEX_HOME_DIR" ]]; then
    return 0
  fi

  return 1
}

has_ghcp=0
if has_github_copilot; then
  has_ghcp=1
fi

has_codex_client=0
if has_codex; then
  has_codex_client=1
fi

if [[ "$has_ghcp" -eq 0 && "$has_codex_client" -eq 0 ]]; then
  echo "Spec-Kit sync skipped: neither GitHub Copilot nor Codex was detected."
  exit 0
fi

changed=0

declare -a PROMPT_SOURCE_DIRS=()
declare -A PROMPT_SOURCE_BY_ID=()
declare -A PROMPT_CURRENT_PROMPT_IDS=()
declare -A PROMPT_CURRENT_SKILL_IDS=()
declare -A PROMPT_SOURCE_DIR_SET=()

write_if_changed() {
  local path="$1"
  local renderer="$2"
  local tmp

  tmp="$(mktemp)"
  "$renderer" >"$tmp"

  if [[ -f "$path" ]] && cmp -s "$tmp" "$path"; then
    rm -f "$tmp"
    return 0
  fi

  mkdir -p "$(dirname "$path")"
  mv "$tmp" "$path"
  changed=1
}

trim_whitespace() {
  local value="$1"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

yaml_single_quote() {
  local value="$1"

  value="${value//\'/\'\'}"
  printf "'%s'" "$value"
}

normalize_prompt_id() {
  local filename="$1"
  local prompt_id="${filename%.md}"

  while [[ "$prompt_id" == *.prompt || "$prompt_id" == *.chatmode ]]; do
    if [[ "$prompt_id" == *.prompt ]]; then
      prompt_id="${prompt_id%.prompt}"
      continue
    fi

    if [[ "$prompt_id" == *.chatmode ]]; then
      prompt_id="${prompt_id%.chatmode}"
      continue
    fi
  done

  if [[ "$prompt_id" =~ ^[A-Za-z0-9._-]{1,128}$ ]]; then
    printf '%s' "$prompt_id"
    return 0
  fi

  prompt_id="$(printf '%s' "$prompt_id" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/-+/-/g; s/^[._-]+//; s/[._-]+$//')"
  prompt_id="${prompt_id:0:128}"
  prompt_id="$(printf '%s' "$prompt_id" | sed -E 's/^[._-]+//; s/[._-]+$//')"

  if [[ -z "$prompt_id" ]]; then
    prompt_id="prompt"
  fi

  printf '%s' "$prompt_id"
}

is_valid_prompt_id() {
  local prompt_id="$1"
  [[ "$prompt_id" =~ ^[A-Za-z0-9._-]{1,128}$ ]]
}

is_valid_skill_id() {
  local skill_id="$1"
  [[ "$skill_id" =~ ^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$ ]]
}

frontmatter_value() {
  local file="$1"
  local key="$2"

  awk -v key="$key" '
    function trim(value) {
      sub(/^[[:space:]]+/, "", value)
      sub(/[[:space:]]+$/, "", value)
      sub(/\r$/, "", value)
      return value
    }

    function dequote(value) {
      if (value ~ /^".*"$/ || value ~ /^'\''.*'\''$/) {
        return substr(value, 2, length(value) - 2)
      }
      return value
    }

    NR == 1 {
      if ($0 != "---") {
        exit
      }
      in_frontmatter = 1
      next
    }

    in_frontmatter && $0 == "---" {
      exit
    }

    in_frontmatter {
      line = $0
      sub(/\r$/, "", line)
      if (line ~ /^[[:space:]]*$/) {
        next
      }

      idx = index(line, ":")
      if (idx == 0) {
        next
      }

      current_key = trim(substr(line, 1, idx - 1))
      current_value = dequote(trim(substr(line, idx + 1)))

      if (current_key == key) {
        print current_value
        exit
      }
    }
  ' "$file"
}

add_prompt_source_dir() {
  local dir="$1"

  if [[ -d "$dir" && -z "${PROMPT_SOURCE_DIR_SET[$dir]+x}" ]]; then
    PROMPT_SOURCE_DIRS+=("$dir")
    PROMPT_SOURCE_DIR_SET["$dir"]=1
  fi
}

collect_prompt_source_dirs() {
  add_prompt_source_dir "$ROOT_DIR/.github/prompts"
  add_prompt_source_dir "$HOME/.vscode-server/data/User/prompts"
  add_prompt_source_dir "$HOME/.config/Code/User/prompts"
  add_prompt_source_dir "$HOME/AppData/Roaming/Code/User/prompts"

  if [[ -n "${APPDATA:-}" ]]; then
    add_prompt_source_dir "$APPDATA/Code/User/prompts"
  fi

  if [[ -n "${XDG_CONFIG_HOME:-}" ]]; then
    add_prompt_source_dir "$XDG_CONFIG_HOME/Code/User/prompts"
  fi
}

is_eligible_repository() {
  local prompt_file

  [[ -d "$ROOT_DIR/.specify" ]] || return 1
  [[ -f "$ROOT_DIR/AGENTS.md" || -f "$ROOT_DIR/.github/copilot-instructions.md" ]] || return 1
  [[ -d "$ROOT_DIR/.github/prompts" ]] || return 1

  for prompt_file in "$ROOT_DIR/.github/prompts"/speckit.*.prompt.md; do
    if [[ -f "$prompt_file" ]]; then
      return 0
    fi
  done

  return 1
}

render_bridge() {
  cat <<'EOF'
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
EOF
}

render_copilot() {
  local feature_dir=""
  local feature_plan=""

  if [[ -f "$ROOT_DIR/.specify/feature.json" ]]; then
    feature_dir="$(sed -nE 's/^[[:space:]]*"feature_directory"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$ROOT_DIR/.specify/feature.json" | head -n 1)"
    if [[ -n "$feature_dir" && -f "$ROOT_DIR/$feature_dir/plan.md" ]]; then
      feature_plan="$feature_dir/plan.md"
    fi
  fi

  cat <<'EOF'
<!-- SPECKIT START -->

For Spec-Kit workflows in this repository, read `AGENTS.md` and `.specify/spec-kit-bridge.md` first.
If a feature is active, also read `.specify/feature.json` and the documents under `specs/<feature>/`.

EOF

  if [[ -n "$feature_plan" ]]; then
    printf 'The active implementation plan is `%s`.\n' "$feature_plan"
  fi

  cat <<'EOF'

<!-- SPECKIT END -->

Refer to AGENTS.md = repository-wide source of truth for LLM instructions
EOF
}

render_codex_prompt() {
  {
    printf '%s\n' '---'
    printf 'description: %s\n' "$PROMPT_DESCRIPTION"
    if [[ -n "${PROMPT_ARGUMENT_HINT:-}" ]]; then
      printf 'argument-hint: %s\n' "$PROMPT_ARGUMENT_HINT"
    fi
    printf 'spec-kit-bridge-managed: true\n'
    printf 'spec-kit-bridge-prompt-id: %s\n' "$PROMPT_ID"
    printf 'spec-kit-bridge-source: %s\n' "$PROMPT_SOURCE_REFERENCE"
    printf 'spec-kit-bridge-kind: %s\n' "$PROMPT_KIND"
    if [[ -n "${PROMPT_AGENT:-}" ]]; then
      printf 'spec-kit-bridge-agent: %s\n' "$PROMPT_AGENT"
    fi
    printf '%s\n' '---'

    if [[ "$PROMPT_KIND" == "alias" ]]; then
      printf '%s\n' \
        "Use the repository source prompt for \`/prompts:$PROMPT_ID\` as the source of truth." \
        "" \
        "1. From the active repository root, read \`$PROMPT_SOURCE_REFERENCE\`." \
        "2. If that prompt declares \`agent: $PROMPT_AGENT\`, read \`$PROMPT_AGENT_PATH\` and follow that agent file as the operative instructions." \
        "3. Keep \`AGENTS.md\` and \`.specify/spec-kit-bridge.md\` in force when they exist." \
        "4. If the source prompt or agent file is missing, tell the user the prompt is unavailable in this repository."
    else
      printf '%s\n' \
        "Use the repository source prompt for \`/prompts:$PROMPT_ID\` as the source of truth." \
        "" \
        "1. Read \`$PROMPT_SOURCE\`." \
        "2. Follow its body exactly." \
        "3. Keep \`AGENTS.md\` in force when it exists." \
        "4. If the source prompt is missing, tell the user the prompt is unavailable in this repository."
    fi
  }
}

sync_codex_prompt() {
  local source_file="$1"
  local requested_prompt_id="${2:-}"
  local prompt_scope="${3:-repository}"
  local filename prompt_id dest_file
  local source_description source_argument_hint source_agent agent_description
  local prompt_kind prompt_agent_path

  filename="$(basename "$source_file")"
  prompt_id="$(normalize_prompt_id "$filename")"
  if [[ -n "$requested_prompt_id" ]]; then
    prompt_id="$requested_prompt_id"
  fi

  if ! is_valid_prompt_id "$prompt_id"; then
    printf 'WARN: skipping unsupported Codex prompt name "%s" from %s\n' "$prompt_id" "$source_file" >&2
    return 0
  fi

  if [[ -n "${PROMPT_SOURCE_BY_ID[$prompt_id]+x}" ]]; then
    if [[ "${PROMPT_SOURCE_BY_ID[$prompt_id]}" != "$source_file" ]]; then
      printf 'WARN: prompt /%s already sourced from %s; skipping %s\n' \
        "$prompt_id" "${PROMPT_SOURCE_BY_ID[$prompt_id]}" "$source_file" >&2
    fi
    return 0
  fi

  PROMPT_SOURCE_BY_ID["$prompt_id"]="$source_file"
  PROMPT_CURRENT_PROMPT_IDS["$prompt_id"]=1

  source_description="$(trim_whitespace "$(frontmatter_value "$source_file" description || true)")"
  source_argument_hint="$(trim_whitespace "$(frontmatter_value "$source_file" argument-hint || true)")"
  source_agent="$(trim_whitespace "$(frontmatter_value "$source_file" agent || true)")"

  if [[ -n "$source_agent" ]]; then
    prompt_kind="alias"
    prompt_agent_path="$ROOT_DIR/.github/agents/$source_agent.agent.md"
    agent_description=""
    if [[ -f "$prompt_agent_path" ]]; then
      agent_description="$(trim_whitespace "$(frontmatter_value "$prompt_agent_path" description || true)")"
    fi
    PROMPT_DESCRIPTION="${source_description:-${agent_description:-Execute /$prompt_id}}"
    PROMPT_AGENT="$source_agent"
    PROMPT_AGENT_PATH=".github/agents/$source_agent.agent.md"
    PROMPT_SOURCE_REFERENCE=".github/prompts/$filename"
  else
    prompt_kind="direct"
    prompt_agent_path=""
    PROMPT_DESCRIPTION="${source_description:-Run /$prompt_id}"
    PROMPT_AGENT=""
    PROMPT_AGENT_PATH=""
    PROMPT_SOURCE_REFERENCE="$source_file"
  fi

  PROMPT_ID="$prompt_id"
  PROMPT_SOURCE="$source_file"
  PROMPT_ARGUMENT_HINT="$source_argument_hint"
  PROMPT_KIND="$prompt_kind"

  dest_file="$CODEX_PROMPTS_DIR/$prompt_id.md"
  write_if_changed "$dest_file" render_codex_prompt

  if [[ "$prompt_scope" == "global" ]]; then
    sync_codex_skill
  fi

}

render_codex_skill() {
  {
    printf '%s\n' '---'
    printf 'name: %s\n' "$PROMPT_ID"
    printf 'description: %s\n' "$(yaml_single_quote "$PROMPT_DESCRIPTION")"
    printf '%s\n' '---'
    printf '\n'
    printf '%s\n' '<!-- spec-kit-bridge-managed: true -->'
    printf '<!-- spec-kit-bridge-prompt-id: %s -->\n' "$PROMPT_ID"
    printf '<!-- spec-kit-bridge-source: %s -->\n' "$PROMPT_SOURCE"
    printf '\n'
    printf '# `/%s` adapter\n\n' "$PROMPT_ID"
    printf 'Resolve `/%s` to `%s` as the source of truth.\n\n' "$PROMPT_ID" "$PROMPT_SOURCE"
    printf '%s\n' \
      '1. Read the source prompt completely at invocation time.' \
      '2. Follow its body exactly.' \
      '3. Pass the user text after the slash command as the prompt arguments.' \
      '4. Keep the active repository instructions in force.' \
      '5. If the source prompt is missing, report that the global prompt is unavailable.'
  }
}

skill_marker_value() {
  local file="$1"
  local key="$2"

  sed -nE "s/^<!-- ${key}: (.*) -->$/\1/p" "$file" | head -n 1
}

sync_codex_skill() {
  local skill_dir="$CODEX_SKILLS_DIR/$PROMPT_ID"
  local skill_file="$skill_dir/SKILL.md"
  local managed_marker

  if ! is_valid_skill_id "$PROMPT_ID"; then
    printf 'WARN: skipping bare Codex skill for unsupported skill name "%s" from %s\n' \
      "$PROMPT_ID" "$PROMPT_SOURCE" >&2
    return 0
  fi

  PROMPT_CURRENT_SKILL_IDS["$PROMPT_ID"]=1

  if [[ -e "$skill_dir" ]]; then
    if [[ ! -f "$skill_file" ]]; then
      printf 'WARN: preserving existing Codex skill directory without SKILL.md: %s\n' "$skill_dir" >&2
      return 0
    fi

    managed_marker="$(skill_marker_value "$skill_file" spec-kit-bridge-managed)"
    if [[ "$managed_marker" != "true" ]]; then
      return 0
    fi
  fi

  write_if_changed "$skill_file" render_codex_skill
}

sync_prompt_dir() {
  local source_dir="$1"
  local mode="$2"
  local prompt_scope="global"
  local find_expr=()

  if [[ "$source_dir" == "$ROOT_DIR/.github/prompts" ]]; then
    prompt_scope="repository"
  fi

  case "$mode" in
    alias)
      find_expr=(-type f -name '*.prompt.md')
      ;;
    direct)
      find_expr=(-type f -name '*.md' '!' -name '*.prompt.md')
      ;;
    *)
      printf 'WARN: unknown prompt sync mode "%s"\n' "$mode" >&2
      return 0
      ;;
  esac

  while IFS= read -r -d '' source_file; do
    sync_codex_prompt "$source_file" "" "$prompt_scope"
  done < <(find -L "$source_dir" -maxdepth 1 "${find_expr[@]}" -print0)
}

cleanup_stale_codex_prompts() {
  local prompt_file prompt_id_marker managed_marker

  shopt -s nullglob
  for prompt_file in "$CODEX_PROMPTS_DIR"/*.md; do
    [[ -f "$prompt_file" ]] || continue

    managed_marker="$(trim_whitespace "$(frontmatter_value "$prompt_file" spec-kit-bridge-managed || true)")"
    prompt_id_marker="$(trim_whitespace "$(frontmatter_value "$prompt_file" spec-kit-bridge-prompt-id || true)")"

    if [[ "$managed_marker" != "true" || -z "$prompt_id_marker" ]]; then
      continue
    fi

    if [[ -z "${PROMPT_CURRENT_PROMPT_IDS[$prompt_id_marker]+x}" ]]; then
      rm -f "$prompt_file"
      changed=1
    fi
  done
  shopt -u nullglob
}

cleanup_stale_codex_skills() {
  local skill_dir skill_file skill_id_marker managed_marker

  shopt -s nullglob
  for skill_dir in "$CODEX_SKILLS_DIR"/*; do
    [[ -d "$skill_dir" ]] || continue
    skill_file="$skill_dir/SKILL.md"
    [[ -f "$skill_file" ]] || continue

    managed_marker="$(skill_marker_value "$skill_file" spec-kit-bridge-managed)"
    skill_id_marker="$(skill_marker_value "$skill_file" spec-kit-bridge-prompt-id)"
    if [[ "$managed_marker" != "true" || -z "$skill_id_marker" ]]; then
      continue
    fi

    if [[ -z "${PROMPT_CURRENT_SKILL_IDS[$skill_id_marker]+x}" ]]; then
      rm -f "$skill_file"
      rmdir "$skill_dir" 2>/dev/null || true
      changed=1
    fi
  done
  shopt -u nullglob
}

sync_codex_prompts() {
  collect_prompt_source_dirs

  if [[ "${#PROMPT_SOURCE_DIRS[@]}" -eq 0 ]]; then
    cleanup_stale_codex_prompts
    cleanup_stale_codex_skills
    return 0
  fi

  mkdir -p "$CODEX_PROMPTS_DIR"

  for source_dir in "${PROMPT_SOURCE_DIRS[@]}"; do
    sync_prompt_dir "$source_dir" alias
    sync_prompt_dir "$source_dir" direct
  done

  cleanup_stale_codex_prompts
  cleanup_stale_codex_skills
}

has_specify=0
if is_eligible_repository; then
  has_specify=1
else
  echo "Spec-Kit bridge skipped: active repository is not eligible."
  exit 0
fi

if [[ "$has_specify" -eq 1 && "$has_ghcp" -eq 1 ]]; then
  write_if_changed "$BRIDGE_FILE" render_bridge
  write_if_changed "$COPILOT_FILE" render_copilot
fi

if [[ "$has_specify" -eq 1 && "$has_codex_client" -eq 1 ]]; then
  sync_codex_prompts
fi

if [[ "$changed" -eq 1 ]]; then
  echo "Synced available Spec-Kit bridge files and AI client adapters."
else
  echo "Available Spec-Kit bridge files and AI client adapters already in sync."
fi
