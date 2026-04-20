#!/usr/bin/env bash
# Software Development Pipeline v4.1 — Install Script
#
# Usage (interactive):
#   ./install.sh
#
# Usage (non-interactive):
#   ./install.sh --platform opencode  --scope global
#   ./install.sh --platform opencode  --scope project --target /path/to/project
#   ./install.sh --platform copilot   --scope global
#   ./install.sh --platform copilot   --scope project --target /path/to/project

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
echo "Software Development Pipeline v4.1 — Installer"
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
  echo "  1) Global   — available in all sessions (recommended)"
  echo "  2) Project  — available only in one specific project directory"
  read -rp "Scope [1]: " _choice
  case "${_choice:-1}" in
    1|global)  SCOPE="global"  ;;
    2|project) SCOPE="project" ;;
    *) echo "Invalid choice; defaulting to global."; SCOPE="global" ;;
  esac
fi

if [[ "$SCOPE" == "project" && -z "$TARGET" ]]; then
  echo ""
  read -rp "Path to your project directory: " TARGET
  TARGET="${TARGET/#\~/$HOME}"   # expand leading ~
fi

# --------------------------------------------------------------------------
# Validate target directory (project scope)
# --------------------------------------------------------------------------
if [[ "$SCOPE" == "project" ]]; then
  if [[ -z "$TARGET" ]]; then
    echo "Error: --target is required for project scope."
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
[[ "$SCOPE" == "project" ]] && echo "  Target   : $TARGET"
echo ""

# --------------------------------------------------------------------------
# Install functions
# --------------------------------------------------------------------------

install_opencode_global() {
  local dest="$HOME/.config/opencode"

  mkdir -p "$dest/agents/"
  cp "$PIPELINE_DIR/opencode/agents/"*.md "$dest/agents/"

  mkdir -p "$dest/skills/pipeline-orchestrator-advanced/"
  cp "$PIPELINE_DIR/opencode/skills/pipeline-orchestrator-advanced/SKILL.md" \
     "$dest/skills/pipeline-orchestrator-advanced/"

  mkdir -p "$dest/plugins/"
  cp "$PIPELINE_DIR/opencode/plugins/pipeline-compaction-controller.js" \
     "$dest/plugins/"

  cp "$PIPELINE_DIR/opencode/compaction-prompt.txt" "$dest/compaction-prompt.txt"
  cp "$PIPELINE_DIR/opencode/opencode.json"         "$dest/opencode.json"

  echo "Installed to $dest/"
}

install_opencode_project() {
  local dest="$TARGET/.opencode"

  mkdir -p "$dest/agents/"
  cp "$PIPELINE_DIR/opencode/agents/"*.md "$dest/agents/"

  mkdir -p "$dest/skills/pipeline-orchestrator-advanced/"
  cp "$PIPELINE_DIR/opencode/skills/pipeline-orchestrator-advanced/SKILL.md" \
     "$dest/skills/pipeline-orchestrator-advanced/"

  mkdir -p "$dest/plugins/"
  cp "$PIPELINE_DIR/opencode/plugins/pipeline-compaction-controller.js" \
     "$dest/plugins/"

  cp "$PIPELINE_DIR/opencode/compaction-prompt.txt" "$dest/compaction-prompt.txt"

  # opencode.json must live at the project root, not inside .opencode/
  cp "$PIPELINE_DIR/opencode/opencode.json" "$TARGET/opencode.json"

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
  opencode-global)  install_opencode_global  ;;
  opencode-project) install_opencode_project ;;
  copilot-global)   install_copilot_global   ;;
  copilot-project)  install_copilot_project  ;;
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
  echo "  1. (Re)start OpenCode to load the new agents."
  echo "  2. Open any project directory in OpenCode."
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
