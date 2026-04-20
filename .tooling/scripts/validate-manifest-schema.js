#!/usr/bin/env node

/**
 * Validates a manifest.json file against the pipeline manifest HEAD schema.
 *
 * Usage (CLI):
 *   node scripts/validate-manifest-schema.js <path-to-manifest.json>
 *
 * Usage (module):
 *   import { validate, validateManifest, sanitizePath, loadSchema } from "./validate-manifest-schema.js"
 *
 * Uses Ajv for full JSON Schema (draft-07) validation — the schema files in
 * schemas/ are the single source of truth (fix #3, #12, #17).
 *
 * @module validate-manifest-schema
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve, extname } from "node:path"
import { fileURLToPath } from "node:url"
import Ajv from "ajv"
import addFormats from "ajv-formats"

const DEFAULT_SCHEMA_PATH = resolve(import.meta.dirname, "../schemas/manifest-head.schema.json")

/**
 * Sanitize and validate a manifest file path (fix #5).
 * Resolves the path, checks for .json extension, and verifies the file exists.
 *
 * @param {string} inputPath - Raw path from user input
 * @returns {{ valid: boolean, resolved: string, error?: string }}
 */
export function sanitizePath(inputPath) {
  if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
    return { valid: false, resolved: "", error: "Path must be a non-empty string." }
  }

  const resolved = resolve(inputPath)

  if (extname(resolved) !== ".json") {
    return {
      valid: false,
      resolved,
      error: `Expected a .json file, got "${extname(resolved) || "(no extension)"}".`,
    }
  }

  if (!existsSync(resolved)) {
    return { valid: false, resolved, error: `File not found: ${resolved}` }
  }

  return { valid: true, resolved }
}

/**
 * Load and parse a JSON Schema file.
 * The expected schema_version is read from the schema itself (`properties.schema_version.const`),
 * so there is no hardcoded version anywhere in this script (fix #17).
 *
 * @param {string} [schemaPath] - Override for the schema file path
 * @returns {{ schema: object, schemaVersion: string | null }}
 */
export function loadSchema(schemaPath = DEFAULT_SCHEMA_PATH) {
  const raw = readFileSync(schemaPath, "utf-8")
  const schema = JSON.parse(raw)
  const schemaVersion = schema?.properties?.schema_version?.const ?? null
  return { schema, schemaVersion }
}

/**
 * Validate a manifest object against a JSON Schema using Ajv (fix #3).
 *
 * @param {object} manifest - Parsed manifest object
 * @param {object} schema - JSON Schema object
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateManifest(manifest, schema) {
  const ajv = new Ajv({ allErrors: true })
  addFormats(ajv)

  const compiledValidate = ajv.compile(schema)
  const valid = compiledValidate(manifest)

  if (valid) {
    return { valid: true, errors: [] }
  }

  const errors = (compiledValidate.errors || []).map((e) => {
    const path = e.instancePath || "(root)"
    return `${path}: ${e.message}${e.params ? ` (${JSON.stringify(e.params)})` : ""}`
  })

  return { valid: false, errors }
}

/**
 * Full validation pipeline: sanitize path, load manifest, validate against schema.
 * Returns a result object — never calls process.exit() (fix #12).
 *
 * @param {string} manifestPath - Path to the manifest file
 * @param {string} [schemaPath] - Optional override for the schema file path
 * @returns {{ valid: boolean, errors: string[], manifestPath: string, schemaPath: string }}
 */
export function validate(manifestPath, schemaPath = DEFAULT_SCHEMA_PATH) {
  const pathCheck = sanitizePath(manifestPath)
  if (!pathCheck.valid) {
    return {
      valid: false,
      errors: [pathCheck.error ?? "Unknown path error"],
      manifestPath,
      schemaPath,
    }
  }

  let manifest
  try {
    const raw = readFileSync(pathCheck.resolved, "utf-8")
    manifest = JSON.parse(raw)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      errors: [`Failed to read/parse ${pathCheck.resolved}: ${message}`],
      manifestPath: pathCheck.resolved,
      schemaPath,
    }
  }

  const { schema } = loadSchema(schemaPath)
  const result = validateManifest(manifest, schema)

  return {
    ...result,
    manifestPath: pathCheck.resolved,
    schemaPath,
  }
}

/* ------------------------------------------------------------------ */
/*  CLI entry point (process.exit is acceptable here — it is the      */
/*  top-level CLI boundary, not a reusable function)                  */
/* ------------------------------------------------------------------ */

const __filename = fileURLToPath(import.meta.url)

if (process.argv[1] === __filename) {
  const manifestArg = process.argv[2]
  if (!manifestArg) {
    console.error("Usage: node scripts/validate-manifest-schema.js <path-to-manifest.json>")
    process.exit(2)
  }

  const result = validate(manifestArg)

  if (!result.valid) {
    console.error(`Validation failed for ${result.manifestPath}:`)
    for (const err of result.errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }

  console.log(`Validation passed for ${result.manifestPath}`)
  console.log(`  schema: ${result.schemaPath}`)
}
