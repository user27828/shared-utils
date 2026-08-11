#!/usr/bin/env bash

# Legacy interactive Yarn workflow. Use package-upgrade for the non-interactive,
# audit-first automation workflow.
set -euo pipefail

skip_server=false
keep_plugin=false
force_remove=false

for argument in "$@"; do
  case "$argument" in
    --skip-server)
      skip_server=true
      ;;
    --keep)
      keep_plugin=true
      ;;
    --remove)
      force_remove=true
      ;;
    *)
      printf 'Unknown option: %s\n' "$argument" >&2
      exit 2
      ;;
  esac
done

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_root=$(cd -- "$script_dir/.." && pwd)
yarnrc_file="$project_root/.yarnrc.yml"
plugin_was_present=false
plugin_added=false

cleanup_plugin() {
  if [[ "$force_remove" == true || ("$plugin_added" == true && "$keep_plugin" == false) ]]; then
    yarn --cwd "$project_root" plugin remove @yarnpkg/plugin-interactive-tools || true
  fi
}

upgrade_interactive_available() {
  yarn --cwd "$project_root" upgrade-interactive --help >/dev/null 2>&1
}

trap cleanup_plugin EXIT

if upgrade_interactive_available; then
  printf 'Using Yarn built-in upgrade-interactive command.\n'
elif [[ -f "$yarnrc_file" ]] && grep -Fq 'plugin-interactive-tools' "$yarnrc_file"; then
  plugin_was_present=true
else
  yarn --cwd "$project_root" plugin import interactive-tools
  plugin_added=true
fi

yarn --cwd "$project_root" upgrade-interactive

if [[ "$skip_server" == true ]]; then
  printf 'Skipping server upgrade (--skip-server).\n'
elif [[ -d "$project_root/server" ]]; then
  read -r -p 'Proceed with server upgrade? (Y/n) ' answer
  if [[ "$answer" == "Y" || "$answer" == "y" || -z "$answer" ]]; then
    yarn --cwd "$project_root" server upgrade
  else
    printf 'Server upgrade skipped.\n'
  fi
else
  printf 'Server directory not found, skipping server upgrade.\n'
fi

if [[ "$keep_plugin" == true ]]; then
  trap - EXIT
  printf 'Keeping interactive tools plugin (--keep).\n'
elif [[ "$plugin_was_present" == true && "$force_remove" == false ]]; then
  trap - EXIT
  printf 'Keeping interactive tools plugin (it was already installed).\n'
fi
