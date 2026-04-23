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

1. Clone the exact OpenCode version you want to patch:

```bash
git clone https://github.com/anomalyco/opencode /path/to/opencode
cd /path/to/opencode
```

1. Apply the patch bundle:

```bash
/path/to/software_pipeline/opencode/upstream-patches/apply-opencode-mid-session-compaction.sh /path/to/opencode
```

1. Run the recommended upstream verification commands:

```bash
cd /path/to/opencode
npm install -g bun
bun install
bun --cwd packages/opencode run typecheck
bun --cwd packages/opencode test test/plugin/trigger.test.ts test/session/processor-effect.test.ts test/session/compaction.test.ts
```

1. Build and install your patched OpenCode as you normally do.

## Notes

- The patch is intentionally minimal to reduce rebase pain on future OpenCode releases.
- If the patch no longer applies cleanly, inspect the two target files and port the same logic manually.
- The pipeline plugin in this repository already knows how to use this hook when present, and falls back to `session.idle` on unpatched OpenCode builds.
