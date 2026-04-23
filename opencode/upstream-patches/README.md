# OpenCode Patch Bundle

This directory contains a small upstream patch required to make the pipeline compaction plugin work at checkpoint boundaries during an active OpenCode session.

## Why this patch exists

The stock OpenCode plugin API exposes `event` hooks and `session.summarize()`, but that is not enough for reliable checkpoint-triggered live compaction:

- `message.part.updated` arrives while the assistant is still streaming.
- Calling `session.summarize()` from a plugin at that point is too late or races the active loop.
- `session.idle` is too late for pipeline automode because the useful point is the next loop boundary, not after the whole session turn has ended.

OpenCode already has the correct internal mechanism: `SessionProcessor` can return `"compact"` and the current loop will run built-in compaction plus auto-continue.

This patch exposes a tiny synchronous plugin hook so a plugin can request that built-in compaction at the next safe boundary of the current loop.

## What the patch changes

1. Adds a new plugin hook type in `packages/plugin/src/index.ts`:
   - `experimental.assistant.message.complete`
2. Invokes that hook in `packages/opencode/src/session/processor.ts` immediately after a completed assistant step is persisted.
3. If the hook sets `output.compact = true`, the current loop sets `ctx.needsCompaction = true` and the normal built-in compaction path runs.

This keeps compaction inside OpenCode's own compaction flow instead of trying to force `session.summarize()` from outside.

## Reapply after an OpenCode update

### Clone the exact OpenCode version you want to patch

```bash
git clone https://github.com/anomalyco/opencode /path/to/opencode
cd /path/to/opencode
```

### Apply the patch bundle

```bash
/path/to/software_pipeline/opencode/upstream-patches/apply-opencode-mid-session-compaction.sh /path/to/opencode
```

### Run the recommended upstream verification commands

On Debian/Ubuntu, install the native build toolchain first if it is missing:

```bash
apt-get update
apt-get install -y build-essential
```

This is required because `bun install` builds native modules such as `tree-sitter-powershell`, which need `cc` and `g++`.

```bash
cd /path/to/opencode
npm install -g bun
bun install
bun run --cwd=/path/to/opencode/packages/opencode typecheck
bun test --cwd=/path/to/opencode/packages/opencode test/plugin/trigger.test.ts test/session/processor-effect.test.ts test/session/compaction.test.ts
```

### Build and install your patched OpenCode

Use the bundled helper script for the full rebuild and in-place replacement flow:

```bash
/path/to/software_pipeline/opencode/upstream-patches/build-install-opencode-mid-session-compaction.sh /path/to/opencode
```

The script does all of the following on the current machine:

1. Ensures the upstream patch is present in the checkout.
2. Runs `bun install` in the OpenCode checkout.
3. Builds a current-platform binary with `OPENCODE_CHANNEL=latest` so OpenCode keeps the standard `opencode.db` path instead of `opencode-dev.db`.
4. Uses a semver-valid patched version string by default, for example `1.14.21-compaction-patch.1`.
5. Backs up the currently installed binary to `~/.opencode/bin/opencode.bak.<timestamp>`.
6. Replaces `~/.opencode/bin/opencode` atomically and smoke-tests `--version`.

If you want a different patched version suffix or install target, override them explicitly:

```bash
OPENCODE_PATCH_VERSION=1.14.21-compaction-patch.2 \
OPENCODE_INSTALL_TARGET=~/.opencode/bin/opencode \
/path/to/software_pipeline/opencode/upstream-patches/build-install-opencode-mid-session-compaction.sh /path/to/opencode
```

If `which -a opencode` shows another installation path before `~/.opencode/bin/opencode`, remove that installation or update your `PATH` so the patched binary is the one that runs.

### Manual verification after install

```bash
~/.opencode/bin/opencode --version
command -v opencode
```

The installed version should show the patched semver suffix. If your shell already includes `~/.opencode/bin` in `PATH`, `command -v opencode` should also resolve to the binary you replaced.

For a live verification, start a session that emits a `## Pipeline Checkpoint [...]` block and confirm the OpenCode logs contain both of these signals during the same active session:

- `Checkpoint completed - requesting in-loop compaction`
- `service=bus type=session.compacted publishing`

### Prevent the official release from overwriting the patch

Any custom patched version string differs from the official npm/GitHub release version, so stock OpenCode treats it as an update candidate. If you keep automatic updates enabled, a later patch check can replace your custom binary with the official release and remove the mid-session compaction patch.

For a persistent patched install, disable autoupdate in your global OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "autoupdate": false
}
```

The default config path on Ubuntu is `~/.config/opencode/opencode.json`.

For temporary one-off sessions, you can also launch OpenCode with `OPENCODE_DISABLE_AUTOUPDATE=1`.

### Roll back to the previous binary

Restore whichever backup you want from `~/.opencode/bin/opencode.bak.<timestamp>` and make it executable again:

```bash
cp ~/.opencode/bin/opencode.bak.<timestamp> ~/.opencode/bin/opencode
chmod +x ~/.opencode/bin/opencode
```

## Notes

- The patch is intentionally minimal to reduce rebase pain on future OpenCode releases.
- If the patch no longer applies cleanly, inspect the two target files and port the same logic manually.
- The pipeline plugin in this repository already knows how to use this hook when present, and falls back to `session.idle` on unpatched OpenCode builds.
- The default patched version format uses semver prerelease syntax such as `1.14.21-compaction-patch.1`. Avoid underscores like `1.14.21-compaction_patch`, because OpenCode uses `semver.valid()` and `semver.satisfies()` in plugin and installation paths.
