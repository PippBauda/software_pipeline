/**
 * agent-structure.test.js
 *
 * Validates that every agent markdown file contains the required structural
 * elements: YAML frontmatter, H1 title, H2 "Your Identity" section,
 * H2 "Constraints" section, H2 "Return Protocol" section, and a pipeline
 * version reference.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

const PLATFORMS = [
  { name: "opencode", dir: resolve(ROOT, "opencode/agents") },
  { name: "copilot", dir: resolve(ROOT, "copilot/agents") },
];

/** Required H2 sections every non-orchestrator agent must have */
const REQUIRED_H2 = ["Your Identity", "Return Protocol", "Constraints"];

/** Required H2 sections for orchestrator */
const ORCHESTRATOR_REQUIRED_H2 = ["Your Identity", "Pipeline Overview", "Stage Routing Table"];

/** @param {string} content @returns {string} */
function stripFrontmatter(content) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length) : content;
}

/** @param {string} content @returns {string | null} */
function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/** @param {string} md @returns {string | null} */
function extractH1(md) {
  const match = md.match(/^# (.+)$/m);
  return match ? match[1].trim() : null;
}

/** @param {string} md @returns {string[]} */
function extractH2s(md) {
  return [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
}

for (const platform of PLATFORMS) {
  const files = readdirSync(platform.dir).filter((f) => f.endsWith(".md"));

  describe(`${platform.name} agents — structural validation`, () => {
    for (const file of files) {
      const content = readFileSync(resolve(platform.dir, file), "utf-8");
      const fm = extractFrontmatter(content);
      const body = stripFrontmatter(content);
      const h1 = extractH1(body);
      const h2s = extractH2s(body);
      const isOrchestrator = file.includes("orchestrator");

      describe(file, () => {
        it("should have YAML frontmatter", () => {
          assert.ok(fm, "Missing YAML frontmatter (--- delimiters)");
        });

        it("should declare a model in frontmatter", () => {
          assert.match(fm ?? "", /model:/i, "Frontmatter must include 'model:'");
        });

        it("should declare a description in frontmatter", () => {
          assert.match(fm ?? "", /description:/i, "Frontmatter must include 'description:'");
        });

        it("should have an H1 title", () => {
          assert.ok(h1, "Missing H1 (# Title) heading");
        });

        it("should reference pipeline version (v4.1)", () => {
          assert.match(content, /v4\.1/, "Must reference pipeline version v4.1");
        });

        const sectionsToCheck = isOrchestrator ? ORCHESTRATOR_REQUIRED_H2 : REQUIRED_H2;
        for (const section of sectionsToCheck) {
          it(`should have H2 section: "${section}"`, () => {
            assert.ok(
              h2s.some((h) => h.includes(section)),
              `Missing required H2 section: "${section}". Found: ${h2s.join(", ")}`
            );
          });
        }

        it('should have at least one stage reference (C or O stage)', () => {
          assert.match(body, /\b[CO]\d{1,2}\b/, "Must reference at least one pipeline stage");
        });
      });
    }
  });
}
