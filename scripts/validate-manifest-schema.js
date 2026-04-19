#!/usr/bin/env node

/**
 * Validates a manifest.json file against the pipeline manifest HEAD schema.
 * Usage: node scripts/validate-manifest-schema.js [path-to-manifest.json]
 *
 * Uses a basic structural check (no external dependencies).
 * For full JSON Schema validation, install ajv and update this script.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const SCHEMA_PATH = resolve(import.meta.dirname, "../schemas/manifest-head.schema.json")

const REQUIRED_FIELDS = [
  "schema_version",
  "pipeline_id",
  "project_name",
  "branch",
  "created_at",
  "current_state",
  "progress",
  "latest_stages",
]

const PROGRESS_REQUIRED = ["current_stage", "current_stage_index", "total_stages"]

function validate(manifestPath) {
  const errors = []

  let manifest
  try {
    const raw = readFileSync(manifestPath, "utf-8")
    manifest = JSON.parse(raw)
  } catch (err) {
    console.error(`Failed to read/parse ${manifestPath}: ${err.message}`)
    process.exit(2)
  }

  // Check required top-level fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in manifest)) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Check schema_version
  if (manifest.schema_version && manifest.schema_version !== "4.1") {
    errors.push(`Invalid schema_version: expected "4.1", got "${manifest.schema_version}"`)
  }

  // Check branch format
  if (manifest.branch && !manifest.branch.startsWith("pipeline/")) {
    errors.push(`Invalid branch format: expected "pipeline/<name>", got "${manifest.branch}"`)
  }

  // Check progress
  if (manifest.progress && typeof manifest.progress === "object") {
    for (const field of PROGRESS_REQUIRED) {
      if (!(field in manifest.progress)) {
        errors.push(`Missing required progress field: ${field}`)
      }
    }
  }

  // Check latest_stages entries
  if (manifest.latest_stages && typeof manifest.latest_stages === "object") {
    const stageRequired = ["state", "agent", "timestamp", "commit_hash", "artifacts", "execution_index"]
    for (const [stageId, entry] of Object.entries(manifest.latest_stages)) {
      for (const field of stageRequired) {
        if (!(field in entry)) {
          errors.push(`latest_stages.${stageId}: missing required field "${field}"`)
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Validation failed for ${manifestPath}:`)
    for (const err of errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }

  console.log(`Validation passed for ${manifestPath}`)
  console.log(`  schema: ${SCHEMA_PATH}`)
}

const manifestPath = process.argv[2]
if (!manifestPath) {
  console.error("Usage: node scripts/validate-manifest-schema.js <path-to-manifest.json>")
  process.exit(2)
}

validate(resolve(manifestPath))
