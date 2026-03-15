# Pending Analysis — Open Issues on the Formal Pipeline

This document collects all problems identified in previous analyses (`raw_user_pipeline_analysis.md` and `normalized_user_pipeline_analysis.md`) and verifies their resolution status in the formal version `pipeline.md`.

Each problem is classified as:
- **RESOLVED** — the problem has been addressed in `pipeline.md`
- **PARTIAL** — the problem has been mitigated but not fully resolved
- **OPEN** — the problem has not been addressed in `pipeline.md`

---

## 1. Issues from `raw_user_pipeline_analysis.md` — Implicit Assumptions

| ID | Problem | Status | Detail |
|----|---------|:------:|--------|
| AI-01 | Single-user model not declared | **OPEN** | `pipeline.md` does not mention the user model. The pipeline continues to implicitly assume a single user without roles or permissions. |
| AI-02 | Pre-existing and configured Git repository | **RESOLVED** | C1 (Initialization) verifies/initializes the Git repository. |
| AI-03 | Persistent orchestrator context | **PARTIAL** | `manifest.json` tracks pipeline state and R.3 defines conversation serialization. However, the technical mechanism by which the orchestrator (stateless LLM) reconstructs its context from artifacts is not defined. |
| AI-04 | Agent statefulness | **OPEN** | The technical mechanism by which an agent receives, maintains, and returns context is not defined. `pipeline.md` describes *what* agents receive (formal inputs) but not *how* context is transmitted. |
| AI-05 | Commits as checkpoints — no branch strategy | **PARTIAL** | R.2 defines the atomic unit of work and rollback. Missing: commit message conventions, branch strategy, tagging, Git history management. |
| AI-06 | Artifact naming conventions | **RESOLVED** | Every artifact in `pipeline.md` has an explicit path (e.g., `docs/architecture.md`, `logs/builder-report-module-N.md`). |
| AI-07 | Chat tracking mechanism | **PARTIAL** | R.3 establishes that conversations are serialized and committed; logs have a dedicated directory (`logs/`). Missing: serialization format, log schema, maximum size, rotation policy. |
| AI-08 | Operation atomicity and stop | **RESOLVED** | R.2 defines the atomic unit as: invocation completion + artifact production + commit. Rollback is defined. |
| AI-09 | Builder knows module boundaries | **RESOLVED** | C7 produces `module-map.md`, `task-graph.md`, and `implementation-plan.md` that explicitly define modules, boundaries, dependencies, and implementation order. The Builder (O2) receives them as input. |
| AI-10 | External source access | **OPEN** | C3 describes external source analysis but does not define: authentication mechanisms, access limits, network error handling, timeouts, fallback when a source is inaccessible. |
| AI-11 | Validator/Debugger distinction | **RESOLVED** | O3 (Validator) is defined as: architectural conformance + test execution + static analysis. O4 (Debugger) is defined as: runtime execution + smoke tests + log capture. Boundaries are clear. |
| AI-12 | Workspace portability | **PARTIAL** | R.4 establishes that manifest and artifacts must be sufficient and prohibits absolute path dependencies. Missing: runtime dependency management (lockfile, versions), environment configurations, environment variables. |

---

## 2. Issues from `raw_user_pipeline_analysis.md` — Missing Stages

| ID | Problem | Status | Detail |
|----|---------|:------:|--------|
| FM-01 | Development environment setup | **OPEN** | No stage is dedicated to dependency installation, runtime/interpreter configuration, or tooling setup. |
| FM-02 | Test strategy definition | **PARTIAL** | O3 mentions "test suite execution" and O2 requires "at least one test per module," but no explicit test strategy definition exists (unit vs integration vs e2e, coverage criteria, thresholds). |
| FM-03 | Formal isolated test execution | **RESOLVED** | O3 includes formal test suite execution with structured reporting, separated from implementation (O2). |
| FM-04 | Security audit | **OPEN** | No stage includes OWASP analysis, vulnerability scanning, or dependency audit. |
| FM-05 | Documentation generation | **OPEN** | No stage produces user/developer documentation (README, API guides, installation guides). `docs/api.md` is an architectural artifact, not user documentation. |
| FM-06 | CI/CD configuration | **OPEN** | No stage includes continuous integration or deployment pipeline configuration. |
| FM-07 | Formal quality gate | **PARTIAL** | O3 includes "static code analysis" but does not define explicit quality gates: linting, formatting, cyclomatic complexity, minimum code coverage, numerical thresholds. |
| FM-08 | Release/deployment stage | **OPEN** | The pipeline ends with O5 (final report) without a release mechanism, semantic versioning, or deployment step. |
| FM-09 | Artifact inventory/manifest | **RESOLVED** | `pipeline-state/manifest.json` is initialized in C1, updated at every commit (R.3), and verified in O5. |
| FM-10 | Conflict resolution on re-entry | **OPEN** | When the user in O5 chooses to iterate by re-entering at a previous point (C2–O4), it is not defined how artifacts produced in subsequent stages — which become potentially incoherent — are managed. |

---

## 3. Issues from `raw_user_pipeline_analysis.md` — Ambiguous Transitions

| ID | Problem | Status | Detail |
|----|---------|:------:|--------|
| TA-01 | Who decides if Analyst is needed | **RESOLVED** | C3 explicitly defines: entry condition = `PROMPT.md` contains references to external sources, orchestrator decision confirmed by user. |
| TA-02 | Builder module failure | **RESOLVED** | O2 defines: the Builder signals the failure to the orchestrator, which notifies the user and awaits instructions (retry, skip, stop). |
| TA-03 | Ambiguous options a*/b* (Validator) | **RESOLVED** | In O3 and O4, options are now clearly distinguished: a) passes all notes, b) passes only user-selected items. The difference is in note filtering, not mechanism. |
| TA-04 | Re-entry from final report | **PARTIAL** | O5 defines that the user can re-enter between C2 and O4, but does not specify: how artifacts from stages after the re-entry point are invalidated, whether the manifest is updated to reflect partial rollback, whether obsolete artifacts are deleted or archived. |
| TA-05 | RESUME → START transition | **PARTIAL** | B1 determines the re-entry point and classifies artifacts. Missing: orchestrator state reconstruction mechanism, handling of partially complete artifacts (e.g., a half-implemented module). |
| TA-06 | RESUME / ADOPTION threshold | **OPEN** | B1 produces an "explicit recommendation (resume or adoption)" but the criteria for determining the threshold are not defined with concrete rules. The decision remains based on "coherence" assessed by the Auditor without metrics or checklists. |
| TA-07 | ADOPTION re-entry point | **PARTIAL** | C-ADO1 produces a conformance plan with ordered actions and a justified entry point. However, the conformance operations are not defined as an autonomous stage: who executes them? The Auditor? The Orchestrator? A dedicated agent? |
| TA-08 | Builder informational feedback | **RESOLVED** | O2 explicitly states "informational and does not require confirmation." R.2 guarantees the user can stop at any time. |
| TA-09 | Stop mechanism | **PARTIAL** | R.2 defines stop behavior (discard + rollback) but not the trigger: explicit user command? Automatic critical error? Inactivity timeout? Whether automatic stops exist (e.g., token budget exhausted, fatal error) is not defined. |
| TA-10 | Orchestrator report rewriting | **OPEN** | R.1 point 4 says "the orchestrator rewrites the report in the user chat" but does not define: whether it is a synthesis, transformation, or verbatim transposition; what level of detail; whether the original agent report remains accessible to the user. |

---

## 4. Issues from `raw_user_pipeline_analysis.md` — Oversized Stages

| ID | Problem | Status | Detail |
|----|---------|:------:|--------|
| FS-01 | Prompt Refiner (monolithic requirements gathering) | **OPEN** | C2 remains a single stage aggregating: functional requirements gathering, scope definition, constraint identification, acceptance criteria, PROMPT.md production. Sub-actions are listed but are not sub-phases with intermediate artifacts. |
| FS-02 | Architect (heterogeneous domains aggregated) | **RESOLVED** | The architectural phase has been decomposed into C4 (constraints + domain), C5 (architecture synthesis), C6 (architecture validation). |
| FS-03 | Builder (opaque internal progress) | **PARTIAL** | O2 has an explicit internal cycle with enumerated sub-actions (read spec, implement, test, report) and a commit per module. However, sub-actions are not independent sub-phases with verifiable intermediate artifacts. |
| FS-04 | Validator (aggregated activities) | **PARTIAL** | O3 lists 4 sub-actions (conformance, tests, static analysis, report) but remains a single stage. It is not possible to diagnose whether a failure is due to failed tests, architectural non-conformance, or static issues. |
| FS-05 | Debugger (different methodologies aggregated) | **PARTIAL** | O4 lists sub-actions (execution, smoke tests, log capture, report) but remains a single stage. Activities with different outputs (logs vs report vs test results) are aggregated. |
| FS-06 | Auditor (logically separable activities) | **OPEN** | B1 and C-ADO1 still aggregate: artifact discovery, coherence analysis, state determination, re-entry point identification, and (for C-ADO1) conformance planning. |

---

## 5. Issues from `raw_user_pipeline_analysis.md` — Cross-Cutting Observations

| ID | Problem | Status | Detail |
|----|---------|:------:|--------|
| OT-01 | Unformalized cyclic pattern | **RESOLVED** | R.1 formalizes the standard interaction pattern as a reusable cross-cutting rule. |
| OT-02 | Absence of formal pipeline state model | **PARTIAL** | `manifest.json` tracks overall state. However, no formal state machine with transitions, valid states, and invariants exists. State is derived from artifacts, not defined a priori. |
| OT-03 | Unresolved stop/rollback duality | **PARTIAL** | R.2 defines the atomic unit and rollback. Missing: what happens if stop occurs during the commit itself; how to guarantee rollback doesn't destroy artifacts from a previous stage; interaction with Builder's incremental commits (one module committed, the next interrupted). |
| OT-04 | Declared but unstructured traceability | **RESOLVED** | R.3 defines: log per invocation, manifest updated at every commit, conversation serialization, artifact registration with author/timestamp/phase/hash. |

---

## 6. Issues from `normalized_user_pipeline_analysis.md` — Recommendations

| ID | Problem | Status | Detail |
|----|---------|:------:|--------|
| NR-01 | Decompose C2 to separate intent from requirements | **OPEN** | The reference (`reference_pipeline.md`) separates Intent Clarification, Problem Formalization, and Requirements Extraction into 3 distinct stages (C1, C2, C3). The formal pipeline aggregates them into a single C2 with output `PROMPT.md`. This reduces intermediate traceability: it is not possible to verify the correctness of intent clarification independently from requirements extraction. |
| NR-02 | Separate tests from O2 | **OPEN** | The reference separates Code Generation (O3) from Test Synthesis (O4). The formal pipeline unifies them in O2 (per-module). This aggregation prevents independent test generation (useful for legacy projects or test-first strategies) and makes it impossible to validate test quality separately from code quality. |
| NR-03 | `docs/configuration.md` is an orphan artifact | **OPEN** | Produced by C5, it is not consumed by any operational stage as input. It is not input to O1 (scaffold), O2 (builder), or any other stage. It is a terminal artifact not justified as a final output. |

---

## 7. Issues from `normalized_user_pipeline_analysis.md` — Reference Comparison

| ID | Problem | Status | Detail |
|----|---------|:------:|--------|
| CR-01 | C2 aggregates 3 reference stages (C1+C2+C3 → C2) | **OPEN** | Medium impact: traceability between interpreted intent and extracted requirements is lost. It is not possible to separately validate intent understanding (ref C1) vs problem formalization (ref C2) vs requirements extraction (ref C3). Related to NR-01. |
| CR-02 | O2 aggregates 3 reference stages (O2+O3+O4 → O2) | **OPEN** | Medium impact: code and tests are generated together per-module, which is pragmatic for an LLM but prevents independent test generation and makes internal progress more opaque. Related to NR-02. |
| CR-03 | Repair Loop as transition vs dedicated stage | **RESOLVED** | The formal pipeline implements repair as a transition from O3/O4 to O2, with explicit user decision (a/b/c). Functionally equivalent to reference O6, with the advantage of making the human decision explicit. |

---

## 8. Overall Summary

### By status

| Status | Count | Percentage |
|--------|:-----:|:----------:|
| RESOLVED | 16 | 40% |
| PARTIAL | 14 | 35% |
| OPEN | 10 | 25% |
| **Total** | **40** | **100%** |

### OPEN problems — Priority index

| ID | Problem | Impact |
|----|---------|--------|
| AI-01 | Single-user model not declared | Low — acceptable if declared as an explicit constraint |
| AI-04 | Agent statefulness not defined | High — fundamental for technical implementation |
| AI-10 | External source access (authentication, errors) | Medium — concrete operational risk |
| FM-01 | Development environment setup missing | Medium — non-reproducibility risk |
| FM-04 | Security audit missing | Medium — OWASP risk |
| FM-05 | Documentation generation missing | Low — not critical for pipeline operation |
| FM-06 | CI/CD configuration missing | Low — outside generation pipeline scope |
| FM-08 | Release/deployment stage missing | Low — outside generation pipeline scope |
| FM-10 | Conflict management on re-entry | High — incoherent state risk |
| TA-06 | RESUME/ADOPTION threshold without concrete criteria | Medium — arbitrary Auditor decision |
| TA-10 | Report rewriting not defined | Low — form matter |
| FS-01 | Monolithic C2 (Prompt Refiner) | Medium — reduces intermediate traceability |
| FS-06 | Monolithic Auditor | Low — manageable complexity |
| NR-01 | C2 decomposition (reference alignment) | Medium — cognitive traceability |
| NR-02 | Test separation from O2 (reference alignment) | Medium — operational modularity |
| NR-03 | `docs/configuration.md` orphan artifact | Low — only requires routing |
| CR-01 | C2 aggregates 3 reference stages | Medium — related to NR-01 |
| CR-02 | O2 aggregates 3 reference stages | Medium — related to NR-02 |

### PARTIAL problems — Required next actions

| ID | Problem | What's missing |
|----|---------|---------------|
| AI-03 | Persistent orchestrator context | Define how the orchestrator reconstructs context from manifest + artifacts |
| AI-05 | Branch strategy and commit conventions | Define: branch naming, commit message format, tagging policy |
| AI-07 | Chat tracking format | Define: log schema, serialization format, rotation policy |
| AI-12 | Portability — runtime dependencies | Define: lockfile management, runtime versions, environment variables |
| FM-02 | Test strategy | Add explicit definition in C5 or C7: test types, coverage criteria, thresholds |
| FM-07 | Formal quality gate | Define numerical thresholds for: coverage, complexity, linting in O3 |
| TA-04 | Artifact management on re-entry | Define: invalidation, archiving, or deletion of obsolete artifacts |
| TA-05 | State reconstruction in RESUME | Define: how the orchestrator reconstructs context from partial artifacts |
| TA-07 | Conformance operation execution | Define: who executes the adoption plan conformance operations |
| TA-09 | Stop trigger | Define: explicit triggers (user command, fatal error, timeout, budget) |
| OT-02 | Formal state model | Define a state machine with: valid states, transitions, invariants |
| OT-03 | Stop/rollback edge cases | Define: stop during commit, interaction with Builder incremental commits |
| FS-03 | Builder — opaque sub-phases | Evaluate whether to introduce verifiable intermediate artifacts in the Builder cycle |
| FS-04 | Validator — aggregated diagnostics | Evaluate whether to separate static analysis, test execution, and conformance into sub-reports |

---

*End of pending analysis document.*
