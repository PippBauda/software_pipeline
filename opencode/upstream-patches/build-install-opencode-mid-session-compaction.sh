#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/opencode-checkout" >&2
  echo "Optional env: OPENCODE_PATCH_VERSION=1.14.21-compaction-patch.2" >&2
  echo "Optional env: OPENCODE_INSTALL_TARGET=$HOME/.opencode/bin/opencode" >&2
  exit 2
fi

TARGET="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPLY_SCRIPT="$SCRIPT_DIR/apply-opencode-mid-session-compaction.sh"
INSTALL_TARGET="${OPENCODE_INSTALL_TARGET:-$HOME/.opencode/bin/opencode}"
CONFIG_FILE="${OPENCODE_CONFIG_FILE:-$HOME/.config/opencode/opencode.json}"

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: bun is required but not installed or not on PATH." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required but not installed or not on PATH." >&2
  exit 1
fi

if ! git -C "$TARGET" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: '$TARGET' is not a git checkout." >&2
  exit 1
fi

if [[ ! -f "$TARGET/packages/opencode/package.json" ]]; then
  echo "Error: '$TARGET' does not look like an OpenCode checkout." >&2
  exit 1
fi

if [[ ! -x "$APPLY_SCRIPT" ]]; then
  echo "Error: patch apply script not found or not executable: $APPLY_SCRIPT" >&2
  exit 1
fi

if ! grep -q 'experimental.assistant.message.complete' "$TARGET/packages/plugin/src/index.ts" || \
  ! grep -q 'ctx.needsCompaction = true' "$TARGET/packages/opencode/src/session/processor.ts"; then
  "$APPLY_SCRIPT" "$TARGET"
else
  echo "Patch already present in $TARGET"
fi

BASE_VERSION="$({
  node -e 'const fs = require("fs"); const file = process.argv[1]; process.stdout.write(JSON.parse(fs.readFileSync(file, "utf8")).version)' \
    "$TARGET/packages/opencode/package.json"
})"
PATCH_VERSION="${OPENCODE_PATCH_VERSION:-${BASE_VERSION}-compaction-patch.1}"

case "$(uname -s)" in
  Linux)
    DIST_OS="linux"
    ;;
  Darwin)
    DIST_OS="darwin"
    ;;
  *)
    echo "Error: unsupported host OS: $(uname -s)" >&2
    exit 1
    ;;
esac

case "$(uname -m)" in
  x86_64 | amd64)
    DIST_ARCH="x64"
    ;;
  arm64 | aarch64)
    DIST_ARCH="arm64"
    ;;
  *)
    echo "Error: unsupported host architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

BUILT_BINARY="$TARGET/packages/opencode/dist/opencode-${DIST_OS}-${DIST_ARCH}/bin/opencode"

echo "Installing OpenCode dependencies in $TARGET"
pushd "$TARGET" >/dev/null
bun install
popd >/dev/null

echo "Building patched OpenCode with channel=latest version=$PATCH_VERSION"
OPENCODE_CHANNEL=latest OPENCODE_VERSION="$PATCH_VERSION" \
  bun run --cwd="$TARGET/packages/opencode" build --single

if [[ ! -x "$BUILT_BINARY" ]]; then
  echo "Error: expected built binary not found: $BUILT_BINARY" >&2
  exit 1
fi

BUILT_VERSION="$("$BUILT_BINARY" --version)"
if [[ "$BUILT_VERSION" != "$PATCH_VERSION" ]]; then
  echo "Error: built binary version '$BUILT_VERSION' did not match expected '$PATCH_VERSION'." >&2
  exit 1
fi

mkdir -p "$(dirname "$INSTALL_TARGET")"

BACKUP_PATH=""
if [[ -f "$INSTALL_TARGET" ]]; then
  BACKUP_PATH="$INSTALL_TARGET.bak.$(date +%Y%m%d%H%M%S)"
  cp "$INSTALL_TARGET" "$BACKUP_PATH"
  echo "Backed up existing binary to $BACKUP_PATH"
fi

TEMP_TARGET="$INSTALL_TARGET.new"
cp "$BUILT_BINARY" "$TEMP_TARGET"
chmod +x "$TEMP_TARGET"
mv "$TEMP_TARGET" "$INSTALL_TARGET"

INSTALLED_VERSION="$("$INSTALL_TARGET" --version)"
if [[ "$INSTALLED_VERSION" != "$PATCH_VERSION" ]]; then
  echo "Error: installed binary version '$INSTALLED_VERSION' did not match expected '$PATCH_VERSION'." >&2
  exit 1
fi

ACTIVE_BINARY="$(command -v opencode || true)"
if [[ -z "$ACTIVE_BINARY" ]]; then
  echo "Warning: opencode is not on PATH in the current shell." >&2
  echo "Use '$INSTALL_TARGET' directly or add $(dirname "$INSTALL_TARGET") to PATH." >&2
elif [[ "$ACTIVE_BINARY" != "$INSTALL_TARGET" ]]; then
  echo "Warning: PATH resolves opencode to '$ACTIVE_BINARY', not '$INSTALL_TARGET'." >&2
fi

AUTOUPDATE_DISABLED="$({
  node -e '
    const fs = require("fs")
    const file = process.argv[1]
    try {
      const json = JSON.parse(fs.readFileSync(file, "utf8"))
      process.stdout.write(json.autoupdate === false ? "true" : "false")
    } catch {
      process.stdout.write("unknown")
    }
  ' "$CONFIG_FILE"
})"

echo "Installed patched OpenCode to $INSTALL_TARGET"
echo "Patched version: $INSTALLED_VERSION"
echo "Channel: latest (keeps the standard opencode.db path instead of opencode-dev.db)"

if [[ "$AUTOUPDATE_DISABLED" != "true" ]]; then
  echo "Warning: custom patched versions will auto-update back to the official release unless autoupdate is disabled." >&2
  echo "Set \"autoupdate\": false in $CONFIG_FILE or launch OpenCode with OPENCODE_DISABLE_AUTOUPDATE=1." >&2
fi
