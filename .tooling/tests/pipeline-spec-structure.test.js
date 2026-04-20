/**
 * pipeline-spec-structure.test.js
 *
 * Validates the structural integrity of pipeline_4.1.md — the canonical
 * formal specification. Ensures all stages, rules, and auxiliary flows
 * are present so that accidental truncation or merge conflicts are caught
 * by CI before they silently corrupt the specification.
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "../..")

/**
 * Resolve the spec filename from package.json version (e.g. "4.1.0" → "pipeline_4.1.md").
 * This avoids hardcoding the version in two places.
 */
const pkg = JSON.parse(readFileSync(resolve(ROOT, ".tooling/package.json"), "utf-8"))
const pipelineVersion = pkg.version.split(".").slice(0, 2).join(".")
const SPEC_PATH = resolve(ROOT, `pipeline_${pipelineVersion}.md`)
const spec = readFileSync(SPEC_PATH, "utf-8")

/* ------------------------------------------------------------------ */
/*  Cognitive stages                                                   */
/* ------------------------------------------------------------------ */

describe("pipeline spec — cognitive stages (C1-C9)", () => {
  const cognitiveStages = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"]

  for (const stage of cognitiveStages) {
    it(`documents stage ${stage}`, () => {
      assert.match(
        spec,
        new RegExp(`\\b${stage}\\b`),
        `Stage ${stage} not found in ${SPEC_PATH}`,
      )
    })
  }
})

/* ------------------------------------------------------------------ */
/*  Operational stages                                                 */
/* ------------------------------------------------------------------ */

describe("pipeline spec — operational stages (O1-O10, O8.V)", () => {
  const operationalStages = Array.from({ length: 10 }, (_, i) => `O${i + 1}`)
  operationalStages.push("O8.V")

  for (const stage of operationalStages) {
    it(`documents stage ${stage}`, () => {
      const escaped = stage.replace(".", "\\.")
      assert.match(
        spec,
        new RegExp(`\\b${escaped}\\b`),
        `Stage ${stage} not found in ${SPEC_PATH}`,
      )
    })
  }
})

/* ------------------------------------------------------------------ */
/*  Rules                                                              */
/* ------------------------------------------------------------------ */

describe("pipeline spec — rules (R.0-R.12 + R.CONTEXT)", () => {
  const numericRules = Array.from({ length: 13 }, (_, i) => `R.${i}`)
  const allRules = [...numericRules, "R.CONTEXT"]

  for (const rule of allRules) {
    it(`documents rule ${rule}`, () => {
      const escaped = rule.replace(".", "\\.")
      assert.match(
        spec,
        new RegExp(`\\b${escaped}\\b`),
        `Rule ${rule} not found in ${SPEC_PATH}`,
      )
    })
  }
})

/* ------------------------------------------------------------------ */
/*  Auxiliary flows                                                    */
/* ------------------------------------------------------------------ */

describe("pipeline spec — auxiliary flows", () => {
  it("documents B1 continuity audit flow", () => {
    assert.match(spec, /\bB1\b/, `B1 auxiliary flow not found in ${SPEC_PATH}`)
  })

  it("documents C-ADO1 conformance audit flow", () => {
    assert.match(spec, /C-ADO1/, `C-ADO1 auxiliary flow not found in ${SPEC_PATH}`)
  })
})

/* ------------------------------------------------------------------ */
/*  Design constraints                                                 */
/* ------------------------------------------------------------------ */

describe("pipeline spec — design constraints (V.1-V.5)", () => {
  const constraints = ["V.1", "V.2", "V.3", "V.4", "V.5"]

  for (const constraint of constraints) {
    it(`documents design constraint ${constraint}`, () => {
      const escaped = constraint.replace(".", "\\.")
      assert.match(
        spec,
        new RegExp(`\\b${escaped}\\b`),
        `Constraint ${constraint} not found in ${SPEC_PATH}`,
      )
    })
  }
})

/* ------------------------------------------------------------------ */
/*  Key sections                                                       */
/* ------------------------------------------------------------------ */

describe("pipeline spec — key structural sections", () => {
  const sections = [
    "Design Constraints",
    "Agents",
    "Stage Routing Table",
    "Cognitive Pipeline",
    "Operational Pipeline",
    "Pipeline Summary",
  ]

  for (const section of sections) {
    it(`contains section "${section}"`, () => {
      assert.match(
        spec,
        new RegExp(section),
        `Section "${section}" not found in ${SPEC_PATH}`,
      )
    })
  }

  it("ends with formal end-of-model marker", () => {
    assert.match(spec, /End of formal pipeline model/, `End-of-model marker missing in ${SPEC_PATH}`)
  })
})
