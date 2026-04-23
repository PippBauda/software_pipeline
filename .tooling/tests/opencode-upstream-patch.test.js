import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "../..")
const PATCH_PATH = resolve(ROOT, "opencode/upstream-patches/opencode-mid-session-compaction.patch")

describe("OpenCode upstream patch bundle", () => {
  it("contains the new assistant completion plugin hook", () => {
    const patch = readFileSync(PATCH_PATH, "utf-8")
    assert.match(patch, /experimental\.assistant\.message\.complete/)
  })

  it("patches SessionProcessor to request compaction from the new hook", () => {
    const patch = readFileSync(PATCH_PATH, "utf-8")
    assert.match(patch, /parts: MessageV2\.parts\(ctx\.assistantMessage\.id\)/)
    assert.match(patch, /ctx\.needsCompaction = true/)
  })
})
