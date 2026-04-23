#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/opencode-checkout" >&2
  exit 2
fi

TARGET="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH_FILE="$SCRIPT_DIR/opencode-mid-session-compaction.patch"

if ! git -C "$TARGET" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: '$TARGET' is not a git checkout." >&2
  exit 1
fi

if [[ ! -f "$PATCH_FILE" ]]; then
  echo "Error: patch file not found: $PATCH_FILE" >&2
  exit 1
fi

git -C "$TARGET" apply --check "$PATCH_FILE"
git -C "$TARGET" apply "$PATCH_FILE"

echo "Applied OpenCode mid-session compaction patch to $TARGET"
echo "Next: run upstream verification commands before building/installing OpenCode."
