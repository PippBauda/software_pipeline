#!/usr/bin/env bash
# Software Development Pipeline v4.2 — Install Script
#
# Usage (interactive):
#   ./install.sh
#
# Usage (non-interactive):
#   ./install.sh --platform opencode  --scope global
#   ./install.sh --platform opencode  --scope workspace --target /path/to/project
#   ./install.sh --platform opencode  --scope project   --target /path/to/project
#   ./install.sh --platform copilot   --scope global
#   ./install.sh --platform copilot   --scope project   --target /path/to/project
#
# Scopes (OpenCode):
#   global    — agents, skills, plugins to ~/.config/opencode/ (safe, no behavior change)
#   workspace — compaction prompt + config to project root (activates pipeline compaction)
#   project   — everything local to the project (full isolation)

set -euo pipefail

PIPELINE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM=""
SCOPE=""
TARGET=""

# --------------------------------------------------------------------------
# Parse arguments
# --------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORM="$2"; shift 2 ;;
    --scope)    SCOPE="$2";    shift 2 ;;
    --target)   TARGET="$2";   shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--platform opencode|copilot] [--scope global|project] [--target DIR]"
      exit 0 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# --------------------------------------------------------------------------
# Interactive prompts (only when value not already set via flags)
# --------------------------------------------------------------------------
echo ""
echo "Software Development Pipeline v4.2 — Installer"
echo "================================================"
echo ""

if [[ -z "$PLATFORM" ]]; then
  echo "Choose platform:"
  echo "  1) OpenCode  (recommended)"
  echo "  2) GitHub Copilot"
  read -rp "Platform [1]: " _choice
  case "${_choice:-1}" in
    1|opencode) PLATFORM="opencode" ;;
    2|copilot)  PLATFORM="copilot"  ;;
    *) echo "Invalid choice; defaulting to opencode."; PLATFORM="opencode" ;;
  esac
fi

if [[ -z "$SCOPE" ]]; then
  echo ""
  echo "Choose deployment scope:"
  echo "  1) Global    — agents, skills, plugins to ~/.config/opencode (recommended)"
  echo "  2) Workspace — activate pipeline compaction in a specific project"
  echo "  3) Project   — everything local to one project (full isolation)"
  read -rp "Scope [1]: " _choice
  case "${_choice:-1}" in
    1|global)    SCOPE="global"    ;;
    2|workspace) SCOPE="workspace" ;;
    3|project)   SCOPE="project"   ;;
    *) echo "Invalid choice; defaulting to global."; SCOPE="global" ;;
  esac
fi

if [[ "$SCOPE" == "project" && -z "$TARGET" ]] || [[ "$SCOPE" == "workspace" && -z "$TARGET" ]]; then
  echo ""
  read -rp "Path to your project directory: " TARGET
  TARGET="${TARGET/#\~/$HOME}"   # expand leading ~
fi

# --------------------------------------------------------------------------
# Validate target directory (project scope)
# --------------------------------------------------------------------------
if [[ "$SCOPE" == "project" || "$SCOPE" == "workspace" ]]; then
  if [[ -z "$TARGET" ]]; then
    echo "Error: --target is required for $SCOPE scope."
    exit 1
  fi
  if [[ ! -d "$TARGET" ]]; then
    echo "Error: directory '$TARGET' does not exist."
    exit 1
  fi
fi

echo ""
echo "Installing:"
echo "  Platform : $PLATFORM"
echo "  Scope    : $SCOPE"
[[ "$SCOPE" == "project" || "$SCOPE" == "workspace" ]] && echo "  Target   : $TARGET"
echo ""

# --------------------------------------------------------------------------
# Install functions
# --------------------------------------------------------------------------

install_opencode_global() {
  local dest="$HOME/.config/opencode"

  mkdir -p "$dest/agents/"
  cp "$PIPELINE_DIR/opencode/agents/"*.md "$dest/agents/"

  for skill in pipeline-orchestrator-preflight pipeline-orchestrator-advanced pipeline-orchestrator-startup pipeline-orchestrator-o3 pipeline-orchestrator-validation pipeline-orchestrator-finalization; do
    mkdir -p "$dest/skills/$skill/"
    cp "$PIPELINE_DIR/opencode/skills/$skill/SKILL.md" "$dest/skills/$skill/"
  done

  mkdir -p "$dest/plugins/"
  cp "$PIPELINE_DIR/opencode/plugins/pipeline-compaction-controller.js" \
     "$dest/plugins/"

  # Global config without compaction prompt override — safe for all workspaces
  cp "$PIPELINE_DIR/opencode/opencode-global.json" "$dest/opencode.json"

  echo "Installed to $dest/"
  echo ""
  echo "  Note: to activate pipeline-aware compaction in a specific project,"
  echo "  run again with --scope workspace --target /path/to/project"
}

install_opencode_workspace() {
  # Only the compaction prompt override — activates pipeline compaction
  # for this workspace without affecting other workspaces
  cp "$PIPELINE_DIR/opencode/opencode-workspace.json" "$TARGET/opencode.json"
  cp "$PIPELINE_DIR/opencode/compaction-prompt.txt"    "$TARGET/compaction-prompt.txt"

  echo "Installed workspace config to $TARGET/"
  echo "  - opencode.json         (compaction prompt override)"
  echo "  - compaction-prompt.txt (pipeline-aware compaction rules)"
}

install_opencode_project() {
  local dest="$TARGET/.opencode"

  mkdir -p "$dest/agents/"
  cp "$PIPELINE_DIR/opencode/agents/"*.md "$dest/agents/"

  for skill in pipeline-orchestrator-preflight pipeline-orchestrator-advanced pipeline-orchestrator-startup pipeline-orchestrator-o3 pipeline-orchestrator-validation pipeline-orchestrator-finalization; do
    mkdir -p "$dest/skills/$skill/"
    cp "$PIPELINE_DIR/opencode/skills/$skill/SKILL.md" "$dest/skills/$skill/"
  done

  mkdir -p "$dest/plugins/"
  cp "$PIPELINE_DIR/opencode/plugins/pipeline-compaction-controller.js" \
     "$dest/plugins/"

  cp "$PIPELINE_DIR/opencode/compaction-prompt.txt" "$TARGET/compaction-prompt.txt"

  # Project-level config with compaction prompt override
  cp "$PIPELINE_DIR/opencode/opencode-workspace.json" "$TARGET/opencode.json"

  echo "Installed to $dest/ (config: $TARGET/opencode.json)"
}

install_copilot_global() {
  local dest="$HOME/.copilot/agents"

  mkdir -p "$dest"
  cp "$PIPELINE_DIR/copilot/agents/"*.agent.md "$dest/"

  echo "Installed to $dest/"
}

install_copilot_project() {
  local dest="$TARGET/.copilot/agents"

  mkdir -p "$dest"
  cp "$PIPELINE_DIR/copilot/agents/"*.agent.md "$dest/"

  echo "Installed to $dest/"
}

# --------------------------------------------------------------------------
# Dispatch
# --------------------------------------------------------------------------
case "$PLATFORM-$SCOPE" in
  opencode-global)    install_opencode_global    ;;
  opencode-workspace) install_opencode_workspace ;;
  opencode-project)   install_opencode_project   ;;
  copilot-global)     install_copilot_global     ;;
  copilot-project)    install_copilot_project    ;;
  *) echo "Unknown platform/scope combination: $PLATFORM/$SCOPE"; exit 1 ;;
esac

# --------------------------------------------------------------------------
# Next steps
# --------------------------------------------------------------------------
echo ""
echo "Installation complete."
echo ""

if [[ "$PLATFORM" == "opencode" ]]; then
  echo "Next steps:"
  if [[ "$SCOPE" == "global" ]]; then
    echo "  1. Activate pipeline compaction in your project:"
    echo "       ./install.sh --platform opencode --scope workspace --target /path/to/project"
    echo "  2. (Re)start OpenCode to load the new agents."
  elif [[ "$SCOPE" == "workspace" ]]; then
    echo "  1. Run global install first (if not done already):"
    echo "       ./install.sh --platform opencode --scope global"
    echo "  2. (Re)start OpenCode in $TARGET"
  else
    echo "  1. (Re)start OpenCode to load the new agents."
  fi
  echo "  3. Describe your project idea to the Orchestrator:"
  echo '       "I want to build a web app that manages tasks with user authentication."'
  echo "  4. The pipeline starts automatically — follow the Orchestrator's prompts."
  echo ""
  echo "  Tip: after requirements are confirmed, type 'automode on' to let the"
  echo "  pipeline run fully autonomously through build, test, and release."
fi

if [[ "$PLATFORM" == "copilot" ]]; then
  echo "Next steps:"
  echo "  1. Open GitHub Copilot Chat in VS Code."
  echo "  2. Select the @orchestrator agent."
  echo "  3. Describe your project idea:"
  echo '       "I want to build a web app that manages tasks with user authentication."'
  echo "  4. The pipeline starts automatically — follow the Orchestrator's prompts."
fi

echo ""
