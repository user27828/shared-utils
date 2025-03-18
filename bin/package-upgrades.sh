#!/bin/bash
# This script will run an interactive package upgrade and prompt for server upgrade
# This allows for using yarn upgrade-interactive on SPAs destined for Cloudflare and
# similar servers that do not support yarn plugins
# Usage: bash scripts/package-upgrades.sh [--skip-server]
# @param {string} --skip-server - If a monorepo is 100% yarn/npm, the interactive-tools
#    plugin already handles the server directory
# 1. Enable interactive plugin
# 2. Run interactive upgrade
# 3. Prompt for server upgrade
# 4. Remove the interactive plugin

# Parse CLI arguments
SKIP_SERVER=false
for arg in "$@"; do
  if [ "$arg" == "--skip-server" ]; then
    SKIP_SERVER=true
  fi
done

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
YARNRC_FILE="$PROJECT_ROOT/.yarnrc.yml"

# Check if interactive-tools plugin is already installed
PLUGIN_INSTALLED=false
if [ -f "$YARNRC_FILE" ] && grep -q "plugin-interactive-tools" "$YARNRC_FILE"; then
  echo "Interactive tools plugin already installed, using existing version"
  PLUGIN_INSTALLED=true
else
  echo "Installing interactive tools plugin temporarily"
  yarn plugin import interactive-tools
fi

# Run interactive upgrade
yarn upgrade-interactive

# Prompt for server upgrade
if [ "$SKIP_SERVER" = true ]; then
  echo "Skipping server upgrade (--skip-server flag provided)"
elif [ -d "$SCRIPT_DIR/../server" ]; then
  read -p "Proceed with server upgrade? (Y/n) " answer
  if [[ $answer == "Y" || $answer == "y" || $answer == "" ]]; then
    echo "Starting server upgrade..."
    yarn server upgrade
  else
    echo "Server upgrade skipped"
  fi
else
  echo "Server directory not found, skipping server upgrade"
fi

# Remove the interactive plugin only if we installed it
if [ "$PLUGIN_INSTALLED" = false ]; then
  echo "Removing temporarily installed interactive tools plugin"
  yarn plugin remove @yarnpkg/plugin-interactive-tools
fi
