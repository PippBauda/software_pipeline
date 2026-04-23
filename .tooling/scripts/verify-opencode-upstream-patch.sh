#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/opencode-checkout" >&2
  exit 2
fi

TARGET="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATCH_FILE="$ROOT/opencode/upstream-patches/opencode-mid-session-compaction.patch"
TEMP_DIR=""

if ! git -C "$TARGET" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: '$TARGET' is not a git checkout." >&2
  exit 1
fi

if [[ ! -f "$PATCH_FILE" ]]; then
  echo "Error: patch file not found: $PATCH_FILE" >&2
  exit 1
fi

cleanup() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    git -C "$TARGET" worktree remove --force "$TEMP_DIR" >/dev/null 2>&1 || true
    rm -rf "$TEMP_DIR"
  fi
}

trap cleanup EXIT

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/opencode-patch-check.XXXXXX")"
git -C "$TARGET" rev-parse --verify HEAD >/dev/null
git -C "$TARGET" worktree add --detach "$TEMP_DIR" HEAD >/dev/null
git -C "$TEMP_DIR" apply --check "$PATCH_FILE"

echo "OpenCode upstream patch applies cleanly to a fresh HEAD worktree derived from $TARGET"
