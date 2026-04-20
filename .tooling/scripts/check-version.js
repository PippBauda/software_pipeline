/**
 * check-version.js
 *
 * Verifies that the pipeline version declared in package.json is consistently
 * referenced across all key files (agent prompts, specs, README, schemas).
 *
 * The canonical source of truth is `.tooling/package.json` → version field.
 * The pipeline version is derived as MAJOR.MINOR (e.g. "4.1" from "4.1.0").
 *
 * Exit code 0 = all consistent
 * Exit code 1 = mismatches found
 *
 * Usage:
 *   node scripts/check-version.js
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const TOOLING = resolve(ROOT, ".tooling");

/* ------------------------------------------------------------------ */
/*  Derive canonical version                                          */
/* ------------------------------------------------------------------ */

const pkg = JSON.parse(readFileSync(resolve(TOOLING, "package.json"), "utf-8"));
const semver = pkg.version; // e.g. "4.1.0"
const pipelineVersion = semver.split(".").slice(0, 2).join("."); // "4.1"

console.log(`Canonical pipeline version: ${pipelineVersion} (from package.json ${semver})`);

/* ------------------------------------------------------------------ */
/*  Files to check                                                    */
/* ------------------------------------------------------------------ */

/**
 * @param {string} dir
 * @returns {string[]}
 */
function agentFiles(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => resolve(dir, f));
}

const filesToCheck = [
  ...agentFiles(resolve(ROOT, "opencode/agents")),
  ...agentFiles(resolve(ROOT, "copilot/agents")),
  resolve(ROOT, "README.md"),
  resolve(ROOT, "pipeline_description.md"),
];

// pipeline_4.1.md — check filename matches too
const specFile = resolve(ROOT, `pipeline_${pipelineVersion}.md`);
filesToCheck.push(specFile);

// Schemas
const schemaDir = resolve(TOOLING, "schemas");
try {
  const schemas = readdirSync(schemaDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => resolve(schemaDir, f));
  filesToCheck.push(...schemas);
} catch {
  // no schemas dir — skip
}

/* ------------------------------------------------------------------ */
/*  Check each file                                                   */
/* ------------------------------------------------------------------ */

let errorCount = 0;

for (const filePath of filesToCheck) {
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    console.error(`  MISSING  ${filePath}`);
    errorCount++;
    continue;
  }

  const relPath = filePath.replace(ROOT + "/", "");

  // Agent files: must contain (v<VERSION>) in identity line
  if (relPath.includes("agents/")) {
    const versionPattern = new RegExp(`v${pipelineVersion.replace(".", "\\.")}`);
    if (!versionPattern.test(content)) {
      console.error(`  MISMATCH  ${relPath} — missing "v${pipelineVersion}" reference`);
      errorCount++;
    }
  }

  // Schema files: check schema_version field
  if (filePath.endsWith(".schema.json")) {
    try {
      const schema = JSON.parse(content);
      // Check if schema has a schema_version property definition
      const props = schema.properties || {};
      if (props.schema_version) {
        const constVal =
          props.schema_version.const || (props.schema_version.enum && props.schema_version.enum[0]);
        if (constVal && constVal !== pipelineVersion) {
          console.error(
            `  MISMATCH  ${relPath} — schema_version is "${constVal}", expected "${pipelineVersion}"`
          );
          errorCount++;
        }
      }
    } catch {
      // Not valid JSON or no schema_version — skip
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Summary                                                           */
/* ------------------------------------------------------------------ */

if (errorCount > 0) {
  console.log(`\nVersion check failed: ${errorCount} issue(s) found.`);
  process.exit(1);
} else {
  console.log(`\nVersion check passed: all files reference v${pipelineVersion}.`);
  process.exit(0);
}
