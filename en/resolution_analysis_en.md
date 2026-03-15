# Resolution Analysis — from pipeline.md to pipeline_1.0.md

This document tracks the resolution of all 40 problems identified in previous analyses (`raw_user_pipeline_analysis.md`, `normalized_user_pipeline_analysis.md`, `pending_analysis.md`) and documents the user's structural decisions that guided version 1.0.

---

## User Structural Decisions

Before drafting `pipeline_1.0.md`, 4 questions were posed to the user regarding design choices with architectural impact. The answers determined the v1.0 structure.

### D1 — C2 Decomposition (FS-01, NR-01, CR-01)

> **Question**: split C2 into sub-stages with intermediate artifacts?

**Options presented**:
- a) Three separate stages: C2 Intent Clarification → C3 Problem Formalization → C4 Requirements Extraction, with intermediate artifacts (`intent.md`, `problem-statement.md`, `requirements.md`)
- b) Single stage with internal sub-phases and intermediate artifacts
- c) Single stage without modifications

**User answer**: **Option a)** — Three separate stages with intermediate artifacts.

**Impact on pipeline_1.0**: C2 was decomposed into C2 (Intent Clarification), C3 (Problem Formalization), C4 (Requirements Extraction). All subsequent stages were renumbered accordingly (C3→C5, C4→C6, C5→C7, C6→C8, C7→C9).

### D2 — O2 Aggregation (NR-02, CR-02)

> **Question**: separate code generation from test synthesis?

**Options presented**:
- a) Separate into distinct stages (Code Generation + Test Synthesis)
- b) Keep aggregated (code + tests per-module)

**User answer**: **Option b)** — Keep aggregated for LLM pragmatism.

**Impact on pipeline_1.0**: O3 (Module Generation) keeps code and tests jointly for each module. NR-02 and CR-02 are closed as CLOSED BY DESIGN.

### D3 — New Stages (FM-01, FM-04, FM-05, FM-06, FM-08)

> **Question**: which missing stages to add?

**Options presented**: FM-01 (env setup), FM-04 (security audit), FM-05 (documentation), FM-06 (CI/CD), FM-08 (release/deployment)

**User answer**: **All** — Add all 5 stages.

**Impact on pipeline_1.0**: added O1 (Environment Setup), O5 (Security Audit), O7 (Documentation Generation), O8 (CI/CD Configuration), O9 (Release and Deployment). The operational pipeline grows from 5 to 10 stages.

### D4 — Report Rewriting in Chat (TA-10)

> **Question**: how should the orchestrator present reports to the user in chat?

**Options presented**:
- a) Verbatim transposition (verbosity risk)
- b) Compressed summary without reference to the original report
- c) Executive summary + link to the full report in the repository

**User answer**: **Option c)** — Summary + link to the report in the repository.

**Impact on pipeline_1.0**: R.1 point 6 defines that the orchestrator writes an "executive summary" indicating the full report's location.

---

## Complete Resolution Table

Status legend:
- **RESOLVED** — problem fully addressed in `pipeline_1.0.md`
- **CLOSED BY DESIGN** — problem explicitly maintained by user decision
- **ALREADY RESOLVED** — problem already resolved in `pipeline.md`, maintained in `pipeline_1.0.md`

### 1. Implicit Assumptions (AI-01 — AI-12)

| ID | Problem | Previous Status | v1.0 Status | Resolution |
|----|---------|:---------------:|:-----------:|------------|
| AI-01 | Single-user model undeclared | OPEN | **RESOLVED** | Added explicit constraint V.1: "the pipeline is designed for a single user". |
| AI-02 | Pre-existing Git repository | ALREADY RESOLVED | **RESOLVED** | Maintained in C1: the repository is initialized by the stage. |
| AI-03 | Orchestrator persistent context | PARTIAL | **RESOLVED** | R.1 point 1 defines the mechanism: the orchestrator reconstructs context by reading `manifest.json`, current and preceding stage artifacts, last conversation logs. R.1 point 2 defines transmission: formal artifacts + context brief + user notes. V.2 declares agents stateless. |
| AI-04 | Agent statefulness | OPEN | **RESOLVED** | V.2 declares agents stateless. R.1 point 2 defines the context transmission mechanism: formal stage artifacts + context brief synthesized by the orchestrator + feedback notes. No implicit memory between invocations. |
| AI-05 | Branch strategy / commit conventions | PARTIAL | **RESOLVED** | Added R.6 (Git Conventions): branch `pipeline/<project-name>`, commit messages `[<stage-id>] <description>`, semantic version tags, merge to `main`. |
| AI-06 | Artifact naming | ALREADY RESOLVED | **RESOLVED** | Maintained: every artifact has an explicit path. |
| AI-07 | Chat tracking format | PARTIAL | **RESOLVED** | R.3 defines Markdown log format with schema: timestamp, agent, stage, role, content. `logs/` directory. No rotation needed (conversations accumulate per session). |
| AI-08 | Operation atomicity and stop | ALREADY RESOLVED | **RESOLVED** | Maintained in R.2. |
| AI-09 | Builder — module boundaries | ALREADY RESOLVED | **RESOLVED** | Maintained: C9 produces `module-map.md`, `task-graph.md`, `implementation-plan.md`. O3 receives them as input. |
| AI-10 | External source access — errors | OPEN | **RESOLVED** | C5 adds explicit error handling: the Analyst documents the failure with source, error type, estimated impact, and requests user instructions (alternative source, skip, credentials). |
| AI-11 | Validator/Debugger distinction | ALREADY RESOLVED | **RESOLVED** | Maintained: O4 (system validation) vs O6 (debug + smoke test). |
| AI-12 | Workspace portability | PARTIAL | **RESOLVED** | R.4 extended: mandatory lockfile, runtime dependencies with version in `docs/environment.md`, environment variables documented in `environment.md` and `configuration.md`. O1 produces `docs/environment.md` as a concrete artifact. |

### 2. Missing Stages (FM-01 — FM-10)

| ID | Problem | Previous Status | v1.0 Status | Resolution |
|----|---------|:---------------:|:-----------:|------------|
| FM-01 | Development environment setup | OPEN | **RESOLVED** | Added O1 (Environment Setup) with output: `docs/environment.md`, configuration files (lockfile, package manager, Dockerfile). |
| FM-02 | Test strategy | PARTIAL | **RESOLVED** | C9 produces `docs/test-strategy.md` as explicit output: test types, coverage criteria, minimum thresholds, acceptance criteria per module. O3 and O4 receive it as input. |
| FM-03 | Formal test execution | ALREADY RESOLVED | **RESOLVED** | Maintained in O4 (System Validation). |
| FM-04 | Security audit | OPEN | **RESOLVED** | Added O5 (Security Audit) with: OWASP analysis, CVE dependency audit, security pattern verification, recommendations by severity. |
| FM-05 | Documentation generation | OPEN | **RESOLVED** | Added O7 (Documentation Generation) with output: `README.md`, `docs/api-reference.md`, `docs/installation-guide.md`. |
| FM-06 | CI/CD configuration | OPEN | **RESOLVED** | Added O8 (CI/CD Configuration) with output: CI/CD configuration files, `docs/cicd-configuration.md`. |
| FM-07 | Formal quality gate | PARTIAL | **RESOLVED** | O4 has explicit "Quality gate" sub-section with threshold verification from `test-strategy.md`: code coverage, cyclomatic complexity, linting. Validation criteria specify thresholds. |
| FM-08 | Release/deployment | OPEN | **RESOLVED** | Added O9 (Release and Deployment) with output: semantic tag, `CHANGELOG.md`, `docs/release-notes.md`, deployment configuration. |
| FM-09 | Artifact inventory/manifest | ALREADY RESOLVED | **RESOLVED** | Maintained: `manifest.json` tracked from C1 to O10. |
| FM-10 | Re-entry conflict management | OPEN | **RESOLVED** | Added R.5 (Re-Entry Protocol): artifacts archived in `archive/<timestamp>/`, manifest updated, commit with `[RE-ENTRY]` message, resumption with preceding artifacts intact. |

### 3. Ambiguous Transitions (TA-01 — TA-10)

| ID | Problem | Previous Status | v1.0 Status | Resolution |
|----|---------|:---------------:|:-----------:|------------|
| TA-01 | Who decides if the Analyst is needed | ALREADY RESOLVED | **RESOLVED** | Maintained in C5: orchestrator decision + user confirmation. |
| TA-02 | Builder failure on a module | ALREADY RESOLVED | **RESOLVED** | Maintained in O3: user notification, awaits instructions. |
| TA-03 | Validator a/b options | ALREADY RESOLVED | **RESOLVED** | Maintained in O4: options a) full, b) selective, c) none. |
| TA-04 | Artifact management on re-entry | PARTIAL | **RESOLVED** | R.5 (Re-Entry Protocol) defines: artifact archival in `archive/<timestamp>/`, manifest update, dedicated commit. |
| TA-05 | State reconstruction in RESUME | PARTIAL | **RESOLVED** | B1 defines that the orchestrator reconstructs context by reading: manifest, last completed stage artifacts, conversation logs. Combined with R.1 point 1 defining the standard context reconstruction pattern. |
| TA-06 | RESUME/ADOPTION threshold | OPEN | **RESOLVED** | B1 defines concrete criteria: RESUMABLE if manifest.json exists AND is valid AND all referenced artifacts are present AND the last stage is uniquely identifiable. ADOPTION if any condition fails. |
| TA-07 | Conformance plan execution | PARTIAL | **RESOLVED** | C-ADO1 explicitly defines: the orchestrator executes actions by invoking appropriate agents for each missing artifact, in the order specified by the plan. Each artifact follows R.1. |
| TA-08 | Builder informational feedback | ALREADY RESOLVED | **RESOLVED** | Maintained in O3. |
| TA-09 | Stop triggers | PARTIAL | **RESOLVED** | R.2 defines triggers: explicit user command (always available), fatal agent error (automatic). No timeout or budget stops — user must stop explicitly. Stop during commit = rollback to previous commit. |
| TA-10 | Report rewriting | OPEN | **RESOLVED** | R.1 point 6: the orchestrator writes an "executive summary" of the report indicating the full report's location in the repository. User decision D4. |

### 4. Oversized Stages (FS-01 — FS-06)

| ID | Problem | Previous Status | v1.0 Status | Resolution |
|----|---------|:---------------:|:-----------:|------------|
| FS-01 | Monolithic C2 (Prompt Refiner) | OPEN | **RESOLVED** | C2 decomposed into C2 (Intent) + C3 (Problem) + C4 (Requirements), each with user gate and intermediate artifacts (`intent.md`, `problem-statement.md`, `PROMPT.md`). User decision D1. |
| FS-02 | Architect (aggregated domains) | ALREADY RESOLVED | **RESOLVED** | Maintained: C6 (constraints+domain) + C7 (synthesis) + C8 (validation). |
| FS-03 | Builder (opaque progress) | PARTIAL | **RESOLVED** | O3 defines per-module reports (`logs/builder-report-module-N.md`) with sub-sections: spec confirmed, code implemented, tests implemented, test results, issues. Commit per module. Cumulative report on completion. |
| FS-04 | Validator (aggregated diagnostics) | PARTIAL | **RESOLVED** | O4 produces `validator-report.md` with independent sub-sections each with PASS/FAIL status: architectural conformance, test results, static analysis, quality gate. Per-category diagnostics now possible. |
| FS-05 | Debugger (aggregated methodologies) | PARTIAL | **RESOLVED** | O6 produces `debugger-report.md` with structured sub-sections: smoke tests (with PASS/FAIL per scenario), bugs found (each with scenario, logs, severity, component), log analysis. |
| FS-06 | Monolithic Auditor | OPEN | **RESOLVED** | B1 and C-ADO1 produce reports with structured, independent sub-sections: artifact inventory, consistency analysis, pipeline state, interruption point, recommendation. For C-ADO1: inventory, gap analysis, conformance plan, entry point. Sub-sections are independently diagnosable. |

### 5. Cross-Cutting Observations (OT-01 — OT-04)

| ID | Problem | Previous Status | v1.0 Status | Resolution |
|----|---------|:---------------:|:-----------:|------------|
| OT-01 | Non-formalized cyclic pattern | ALREADY RESOLVED | **RESOLVED** | Maintained in R.1. |
| OT-02 | Missing state machine | PARTIAL | **RESOLVED** | Added "Pipeline State Machine" section with: 20 valid states, all transitions (including correction loops, re-entry, stop), 4 invariants. |
| OT-03 | Stop/rollback edge cases | PARTIAL | **RESOLVED** | R.2 covers: stop during commit = rollback to previous commit. Stop during Builder cycle = in-progress module discarded, already committed modules preserved. |
| OT-04 | Unstructured traceability | ALREADY RESOLVED | **RESOLVED** | Maintained in R.3, with explicit log format/schema added. |

### 6. Normalized Analysis Recommendations (NR-01 — NR-03)

| ID | Problem | Previous Status | v1.0 Status | Resolution |
|----|---------|:---------------:|:-----------:|------------|
| NR-01 | C2 decomposition | OPEN | **RESOLVED** | C2 decomposed into C2+C3+C4. Related to D1. |
| NR-02 | Test separation from O2 | OPEN | **CLOSED BY DESIGN** | Kept aggregated by user decision (D2). Rationale: operational pragmatism for LLM. |
| NR-03 | Orphan `configuration.md` | OPEN | **RESOLVED** | `docs/configuration.md` is now explicit input to O1 (Environment Setup), O2 (Repository Scaffold), and O7 (Documentation Generation). No longer a terminal artifact. |

### 7. Reference Comparison (CR-01 — CR-03)

| ID | Problem | Previous Status | v1.0 Status | Resolution |
|----|---------|:---------------:|:-----------:|------------|
| CR-01 | C2 aggregates 3 reference stages | OPEN | **RESOLVED** | Resolved by decomposition D1: C2 (Intent) + C3 (Problem) + C4 (Requirements) correspond to reference C1+C2+C3. |
| CR-02 | O2 aggregates 3 reference stages | OPEN | **CLOSED BY DESIGN** | Maintained by user decision (D2). Documented as a design choice. |
| CR-03 | Repair Loop as transition | ALREADY RESOLVED | **RESOLVED** | Maintained: repair as transitions O4→O3, O5→O3, O6→O3 with user decision a/b/c. |

---

## Overall Summary

### By final status

| Status | Count | Percentage |
|--------|:-----:|:----------:|
| RESOLVED | 38 | 95% |
| CLOSED BY DESIGN | 2 | 5% |
| PARTIAL | 0 | 0% |
| OPEN | 0 | 0% |
| **Total** | **40** | **100%** |

### Comparison with previous version

| Metric | pipeline.md | pipeline_1.0.md | Δ |
|--------|:-----------:|:---------------:|:-:|
| Resolved | 16 (40%) | 38 (95%) | +22 |
| Closed by design | 0 | 2 (5%) | +2 |
| Partial | 14 (35%) | 0 (0%) | −14 |
| Open | 10 (25%) | 0 (0%) | −10 |

### Key structural changes

| Change | Detail |
|--------|--------|
| C2 decomposition | 1 stage → 3 stages (C2 Intent, C3 Problem, C4 Requirements) |
| Cognitive stages | 7 → 9 (+C2, +C3 from decomposition) |
| Operational stages | 5 → 10 (+O1 Environment, +O5 Security, +O7 Documentation, +O8 CI/CD, +O9 Release) |
| Cross-cutting rules | 4 → 6 (+R.5 Re-Entry Protocol, +R.6 Git Conventions) |
| Design constraints | 0 → 3 (V.1 single-user, V.2 stateless agents, V.3 Git as source of truth) |
| State machine | absent → 20 states, complete transitions, 4 invariants |
| Intermediate artifacts | `intent.md`, `problem-statement.md` (new), `test-strategy.md` (new), `environment.md` (new) |

---

## Appendix — Stage Correspondence Map

| pipeline.md | pipeline_1.0.md | Notes |
|:-----------:|:---------------:|-------|
| C1 | C1 | Unchanged |
| C2 | C2 + C3 + C4 | Decomposed (D1) |
| C3 | C5 | Renumbered |
| C4 | C6 | Renumbered |
| C5 | C7 | Renumbered |
| C6 | C8 | Renumbered |
| C7 | C9 | Renumbered, added `test-strategy.md` output |
| — | O1 | New (FM-01) |
| O1 | O2 | Renumbered |
| O2 | O3 | Renumbered, structured per-module reports |
| O3 | O4 | Renumbered, explicit quality gates |
| — | O5 | New (FM-04) |
| O4 | O6 | Renumbered, structured sub-sections |
| — | O7 | New (FM-05) |
| — | O8 | New (FM-06) |
| — | O9 | New (FM-08) |
| O5 | O10 | Renumbered, re-entry protocol |
| B1 | B1 | Maintained, threshold criteria added |
| C-ADO1 | C-ADO1 | Maintained, plan execution defined |

---

*End of resolution analysis.*
