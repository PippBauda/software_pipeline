/**
 * sync-check-agents.js
 *
 * Compares the body content (post-frontmatter) of OpenCode and Copilot agent
 * files, reporting structural drift between the two platform variants.
 *
 * Checks performed per agent pair:
 *   1. H2 section headers must match (order + names)
 *   2. Body content (excluding frontmatter) similarity via normalised hash
 *   3. Stage references (C2, O3, …) must match
 *
 * Exit code 0  = all agents in sync
 * Exit code 1  = drift detected
 * Exit code 2  = fatal error (missing files, etc.)
 *
 * Usage:
 *   node scripts/sync-check-agents.js [--verbose]
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, basename } from "node:path";
import { createHash } from "node:crypto";

const ROOT = resolve(import.meta.dirname, "../..");
const OC_DIR = resolve(ROOT, "opencode/agents");
const CP_DIR = resolve(ROOT, "copilot/agents");

const verbose = process.argv.includes("--verbose");

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Strip YAML frontmatter delimited by --- */
function stripFrontmatter(content) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length) : content;
}

/** Extract H2 (##) headers from markdown */
function extractH2s(md) {
  return [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
}

/** Extract stage references like C2, C5, O1, O10 */
function extractStages(md) {
  const stages = new Set();
  for (const m of md.matchAll(/\b([CO]\d{1,2})\b/g)) {
    stages.add(m[1]);
  }
  return [...stages].sort();
}

/** Normalise whitespace for comparison (collapse runs, trim) */
function normalise(text) {
  return text.replace(/\s+/g, " ").trim();
}

function hash(text) {
  return createHash("sha256").update(normalise(text)).digest("hex").slice(0, 12);
}

/* ------------------------------------------------------------------ */
/*  Build agent pair mapping                                          */
/* ------------------------------------------------------------------ */

// OpenCode: <name>.md  →  Copilot: <name>.agent.md
const ocFiles = readdirSync(OC_DIR).filter((f) => f.endsWith(".md"));
const cpFiles = new Set(readdirSync(CP_DIR).filter((f) => f.endsWith(".md")));

const pairs = [];
for (const ocFile of ocFiles) {
  const name = basename(ocFile, ".md");
  const cpFile = `${name}.agent.md`;
  if (cpFiles.has(cpFile)) {
    pairs.push({ name, ocFile, cpFile });
    cpFiles.delete(cpFile);
  } else {
    console.error(`  MISSING  Copilot agent for "${name}" (expected ${cpFile})`);
  }
}
for (const orphan of cpFiles) {
  console.error(`  ORPHAN   Copilot agent "${orphan}" has no OpenCode counterpart`);
}

if (pairs.length === 0) {
  console.error("Fatal: no agent pairs found.");
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/*  Compare each pair                                                 */
/* ------------------------------------------------------------------ */

let driftCount = 0;

for (const { name, ocFile, cpFile } of pairs) {
  const ocRaw = readFileSync(resolve(OC_DIR, ocFile), "utf-8");
  const cpRaw = readFileSync(resolve(CP_DIR, cpFile), "utf-8");

  const ocBody = stripFrontmatter(ocRaw);
  const cpBody = stripFrontmatter(cpRaw);

  const issues = [];

  // 1. H2 sections
  const ocH2 = extractH2s(ocBody);
  const cpH2 = extractH2s(cpBody);
  if (JSON.stringify(ocH2) !== JSON.stringify(cpH2)) {
    const onlyOC = ocH2.filter((h) => !cpH2.includes(h));
    const onlyCP = cpH2.filter((h) => !ocH2.includes(h));
    let detail = "H2 sections differ";
    if (onlyOC.length) detail += ` | only in OpenCode: ${onlyOC.join(", ")}`;
    if (onlyCP.length) detail += ` | only in Copilot: ${onlyCP.join(", ")}`;
    issues.push(detail);
  }

  // 2. Content hash
  const ocHash = hash(ocBody);
  const cpHash = hash(cpBody);
  if (ocHash !== cpHash) {
    issues.push(`Content hash differs (OC:${ocHash} vs CP:${cpHash})`);
  }

  // 3. Stage references
  const ocStages = extractStages(ocBody);
  const cpStages = extractStages(cpBody);
  if (JSON.stringify(ocStages) !== JSON.stringify(cpStages)) {
    const onlyOC = ocStages.filter((s) => !cpStages.includes(s));
    const onlyCP = cpStages.filter((s) => !ocStages.includes(s));
    let detail = "Stage references differ";
    if (onlyOC.length) detail += ` | only in OpenCode: ${onlyOC.join(", ")}`;
    if (onlyCP.length) detail += ` | only in Copilot: ${onlyCP.join(", ")}`;
    issues.push(detail);
  }

  if (issues.length > 0) {
    driftCount++;
    console.log(`\n  DRIFT  ${name}`);
    for (const issue of issues) {
      console.log(`         - ${issue}`);
    }
  } else if (verbose) {
    console.log(`  OK     ${name}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Summary                                                           */
/* ------------------------------------------------------------------ */

console.log(
  `\nSync check complete: ${pairs.length} pairs, ${driftCount} with drift.`
);
process.exit(driftCount > 0 ? 1 : 0);
