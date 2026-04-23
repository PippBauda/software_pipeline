# OpenCode Mid-Session Compaction

This repository now supports the intended checkpoint-driven compaction behavior in two layers:

1. The pipeline plugin detects `Pipeline Checkpoint` blocks and requests compaction.
2. A small upstream OpenCode patch exposes a synchronous completion hook so that compaction can be requested inside the current session loop at the next safe boundary.

## Why this is needed

The stock plugin-only approach was not enough:

- `message.part.updated` fires while the assistant is still streaming.
- `session.idle` is too late for long automode runs.
- `session.summarize()` from the plugin is only reliable as an idle fallback.

The OpenCode core already has the right internal path: if the active loop returns `"compact"`, built-in compaction runs and auto-continue can happen naturally. The upstream patch simply lets the plugin request that path.

## Files in this repository

- `opencode/plugins/pipeline-compaction-controller.js`
  - Uses the new `experimental.assistant.message.complete` hook when available.
  - Keeps `session.idle` summarize fallback for unpatched OpenCode builds.
- `opencode/upstream-patches/opencode-mid-session-compaction.patch`
  - Minimal upstream patch for OpenCode.
- `opencode/upstream-patches/apply-opencode-mid-session-compaction.sh`
  - Reapplies the patch to an OpenCode checkout after an update.

## Reapply after OpenCode updates

```bash
git clone https://github.com/anomalyco/opencode /path/to/opencode
/path/to/software_pipeline/opencode/upstream-patches/apply-opencode-mid-session-compaction.sh /path/to/opencode
```

## Suggested verification for the patched OpenCode checkout

On Debian/Ubuntu, make sure the native build toolchain is installed first:

```bash
apt-get update
apt-get install -y build-essential
```

```bash
cd /path/to/opencode
bun install
bun run --cwd=/path/to/opencode/packages/opencode typecheck
bun test --cwd=/path/to/opencode/packages/opencode test/plugin/trigger.test.ts test/session/processor-effect.test.ts test/session/compaction.test.ts
```

Then rebuild and replace the installed Ubuntu binary in place with the helper script:

```bash
/path/to/software_pipeline/opencode/upstream-patches/build-install-opencode-mid-session-compaction.sh /path/to/opencode
```

That helper builds with `OPENCODE_CHANNEL=latest`, installs a semver-valid patched version like `1.14.21-compaction-patch.1`, backs up the old binary, and atomically replaces `~/.opencode/bin/opencode`.

Important: if `autoupdate` stays enabled, the official OpenCode release can overwrite the patched binary later. For persistent installs, set `"autoupdate": false` in `~/.config/opencode/opencode.json` or launch with `OPENCODE_DISABLE_AUTOUPDATE=1`.

## Verification in this repository

Run from `.tooling/`:

```bash
npm test
npm run lint
npm run format:check
npm run lint:md
npm run sync-check
npm run check-version
npm run verify:opencode-patch
```

The `verify:opencode-patch` script checks that the shipped upstream patch still applies cleanly to a fresh `HEAD` worktree derived from `/tmp/opencode-upstream`, so local prototype edits in that clone do not invalidate the check.
