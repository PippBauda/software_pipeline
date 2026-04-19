import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const SCRIPT = resolve(import.meta.dirname, "../scripts/sync-check-agents.js");

describe("sync-check-agents", () => {
  it("should execute without crashing", () => {
    // The script may exit 0 (in sync) or 1 (drift found); both are valid.
    // Only exit code 2 (fatal) is a failure.
    try {
      execFileSync("node", [SCRIPT, "--verbose"], { encoding: "utf-8" });
    } catch (err) {
      // exit code 1 = drift detected, acceptable
      assert.equal(err.status, 1, `Unexpected exit code: ${err.status}\n${err.stderr}`);
    }
  });

  it("should report all 8 agent pairs", () => {
    let output;
    try {
      output = execFileSync("node", [SCRIPT, "--verbose"], { encoding: "utf-8" });
    } catch (err) {
      output = err.stdout || "";
    }
    assert.match(output, /8 pairs/, "Should find 8 agent pairs");
  });
});
