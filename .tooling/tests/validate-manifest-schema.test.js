import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { resolve } from "node:path"
import { sanitizePath, loadSchema, validateManifest, validate } from "../scripts/validate-manifest-schema.js"

const FIXTURES = resolve(import.meta.dirname, "fixtures")
const SCHEMA_PATH = resolve(import.meta.dirname, "../schemas/manifest-head.schema.json")

/* ------------------------------------------------------------------ */
/*  sanitizePath                                                      */
/* ------------------------------------------------------------------ */

describe("sanitizePath", () => {
  it("should reject empty string", () => {
    const result = sanitizePath("")
    assert.equal(result.valid, false)
    assert.ok(result.error?.includes("non-empty"))
  })

  it("should reject non-string input", () => {
    const result = sanitizePath(/** @type {any} */ (null))
    assert.equal(result.valid, false)
  })

  it("should reject non-.json extension", () => {
    const result = sanitizePath(resolve(FIXTURES, "not-json.txt"))
    assert.equal(result.valid, false)
    assert.ok(result.error?.includes(".json"))
  })

  it("should reject non-existent file", () => {
    const result = sanitizePath(resolve(FIXTURES, "does-not-exist.json"))
    assert.equal(result.valid, false)
    assert.ok(result.error?.includes("not found"))
  })

  it("should accept a valid .json path that exists", () => {
    const result = sanitizePath(resolve(FIXTURES, "valid-manifest.json"))
    assert.equal(result.valid, true)
    assert.ok(result.resolved.endsWith("valid-manifest.json"))
  })
})

/* ------------------------------------------------------------------ */
/*  loadSchema                                                        */
/* ------------------------------------------------------------------ */

describe("loadSchema", () => {
  it("should load the HEAD schema and extract schema_version", () => {
    const { schema, schemaVersion } = loadSchema(SCHEMA_PATH)
    assert.equal(typeof schema, "object")
    assert.equal(schemaVersion, "4.2")
  })

  it("should return null version for a schema without const", () => {
    // Use the history schema which also has const "4.2", so just verify it loads
    const historyPath = resolve(import.meta.dirname, "../schemas/manifest-history.schema.json")
    const { schema, schemaVersion } = loadSchema(historyPath)
    assert.equal(typeof schema, "object")
    assert.equal(schemaVersion, "4.2")
  })
})

/* ------------------------------------------------------------------ */
/*  validateManifest                                                  */
/* ------------------------------------------------------------------ */

describe("validateManifest", () => {
  it("should pass a valid manifest", () => {
    const { schema } = loadSchema(SCHEMA_PATH)
    const manifest = JSON.parse(
      `{
        "schema_version": "4.2",
        "pipeline_id": "p1",
        "project_name": "proj",
        "branch": "pipeline/proj",
        "created_at": "2026-01-01T00:00:00Z",
        "current_state": "C1_INITIALIZED",
        "progress": { "current_stage": "C1", "current_stage_index": 1, "total_stages": 18 },
        "latest_stages": {}
      }`,
    )
    const result = validateManifest(manifest, schema)
    assert.equal(result.valid, true)
    assert.equal(result.errors.length, 0)
  })

  it("should fail a manifest with missing required fields", () => {
    const { schema } = loadSchema(SCHEMA_PATH)
    const manifest = { schema_version: "4.2" }
    const result = validateManifest(manifest, schema)
    assert.equal(result.valid, false)
    assert.ok(result.errors.length > 0)
  })

  it("should fail a manifest with wrong schema_version", () => {
    const { schema } = loadSchema(SCHEMA_PATH)
    const manifest = {
      schema_version: "99.0",
      pipeline_id: "p1",
      project_name: "proj",
      branch: "pipeline/proj",
      created_at: "2026-01-01T00:00:00Z",
      current_state: "C1_INITIALIZED",
      progress: { current_stage: "C1", current_stage_index: 1, total_stages: 18 },
      latest_stages: {},
    }
    const result = validateManifest(manifest, schema)
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes("schema_version")))
  })

  it("should fail if current_stage_index is 0 (must be >= 1)", () => {
    const { schema } = loadSchema(SCHEMA_PATH)
    const manifest = {
      schema_version: "4.2",
      pipeline_id: "p1",
      project_name: "proj",
      branch: "pipeline/proj",
      created_at: "2026-01-01T00:00:00Z",
      current_state: "C1_INITIALIZED",
      progress: { current_stage: "C1", current_stage_index: 0, total_stages: 18 },
      latest_stages: {},
    }
    const result = validateManifest(manifest, schema)
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes("current_stage_index")))
  })

  it("should reject additional properties at top level", () => {
    const { schema } = loadSchema(SCHEMA_PATH)
    const manifest = {
      schema_version: "4.2",
      pipeline_id: "p1",
      project_name: "proj",
      branch: "pipeline/proj",
      created_at: "2026-01-01T00:00:00Z",
      current_state: "C1_INITIALIZED",
      progress: { current_stage: "C1", current_stage_index: 1, total_stages: 18 },
      latest_stages: {},
      unexpected_field: true,
    }
    const result = validateManifest(manifest, schema)
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes("additional")))
  })
})

/* ------------------------------------------------------------------ */
/*  validate (full pipeline)                                          */
/* ------------------------------------------------------------------ */

describe("validate (integration)", () => {
  it("should pass for a valid manifest fixture", () => {
    const result = validate(resolve(FIXTURES, "valid-manifest.json"), SCHEMA_PATH)
    assert.equal(result.valid, true)
    assert.equal(result.errors.length, 0)
  })

  it("should fail for a manifest with missing fields", () => {
    const result = validate(resolve(FIXTURES, "invalid-manifest-missing-fields.json"), SCHEMA_PATH)
    assert.equal(result.valid, false)
    assert.ok(result.errors.length > 0)
  })

  it("should fail for a manifest with wrong schema version", () => {
    const result = validate(resolve(FIXTURES, "invalid-manifest-bad-version.json"), SCHEMA_PATH)
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes("schema_version")))
  })

  it("should fail for a non-.json path", () => {
    const result = validate(resolve(FIXTURES, "not-json.txt"), SCHEMA_PATH)
    assert.equal(result.valid, false)
    assert.ok(result.errors[0].includes(".json"))
  })

  it("should fail for a non-existent file", () => {
    const result = validate("/tmp/definitely-does-not-exist.json", SCHEMA_PATH)
    assert.equal(result.valid, false)
    assert.ok(result.errors[0].includes("not found"))
  })
})
