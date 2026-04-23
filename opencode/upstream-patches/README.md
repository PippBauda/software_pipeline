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

Build a current-platform OpenCode binary:

```bash
bun run --cwd=/path/to/opencode/packages/opencode build --single
```

If OpenCode is already installed on Ubuntu via the official install script, you usually do not need to uninstall it first. Back up the existing binary and replace it in place:

```bash
cp ~/.opencode/bin/opencode ~/.opencode/bin/opencode.bak.$(date +%Y%m%d%H%M%S)
cp /path/to/opencode/packages/opencode/dist/opencode-linux-x64/bin/opencode ~/.opencode/bin/opencode
chmod +x ~/.opencode/bin/opencode
```

On arm64 systems, replace `opencode-linux-x64` with `opencode-linux-arm64`.

If `which -a opencode` shows another installation path before `~/.opencode/bin/opencode`, remove that installation or update your `PATH` so the patched binary is the one that runs.

## Notes

- The patch is intentionally minimal to reduce rebase pain on future OpenCode releases.
- If the patch no longer applies cleanly, inspect the two target files and port the same logic manually.
- The pipeline plugin in this repository already knows how to use this hook when present, and falls back to `session.idle` on unpatched OpenCode builds.
