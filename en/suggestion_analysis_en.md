# Improvement Suggestions — pipeline_1.0.md

This document collects improvement suggestions identified in version 1.0 of the formal pipeline model. No modifications have been applied to the source file.

Suggestions are organized by category and classified by impact:
- **High** — risk of inconsistency, blockage, or operational ambiguity
- **Medium** — gap that reduces clarity, traceability, or robustness
- **Low** — form or completeness refinement that does not impact functionality

---

## Category 1 — Agent Assignment

### S-01 | Stages without a declared agent
**Impact**: High

The final summary assigns an agent to only 6 out of 21 stages (C2–C4 → Prompt Refiner, C5 → Analyst, C7 → Architect, O3 → Builder, O4 → Validator, O6 → Debugger, B1/C-ADO1 → Auditor). The following stages do not declare who executes them:

| Stage | Description |
|-------|-------------|
| C1 | Initialization |
| C6 | Constraint Analysis and Domain Modeling |
| C8 | Architecture Validation |
| C9 | Implementation Planning |
| O1 | Environment Setup |
| O2 | Repository Scaffold |
| O5 | Security Audit |
| O7 | Documentation Generation |
| O8 | CI/CD Configuration |
| O9 | Release and Deployment |
| O10 | Closure and Final Report |

R.1 establishes that "the orchestrator assigns the task to the specialized agent" but without declaring which agent, the orchestrator has no instructions on whom to invoke. This creates implementation ambiguity and makes the final summary incomplete.

**Suggestion**: for each stage, declare the responsible agent (existing or new), or explicitly declare that the stage is executed by the orchestrator itself.

---

### S-02 | Context continuity in the Prompt Refiner (C2→C3→C4)
**Impact**: Medium

Three consecutive stages (C2, C3, C4) invoke the same agent (Prompt Refiner), but V.2 declares agents stateless. At the second invocation (C3), the Prompt Refiner loses all context from the conversation that occurred in C2. This is particularly critical because C2 is the only stage where the user interacts directly to clarify intent — information that is lost in the transition to C3 unless entirely captured in `intent.md`.

**Suggestion**: strengthen the specification by clarifying that all relevant conversation information from C2 MUST be encoded in the `intent.md` artifact (C2 output / C3 input), so that the Prompt Refiner in C3 can operate without context loss. Evaluate whether the R.1 point 2 context brief is sufficient or whether a more explicit mechanism is needed (e.g., the C2 conversation log as formal input to C3).

---

## Category 2 — Input/Output Consistency

### S-03 | O3 (Builder) does not receive `docs/environment.md`
**Impact**: High

O3 generates source code but does not receive `docs/environment.md` as input. The Builder needs to know which runtime, framework, and versions to use to generate correct code. Currently the Builder should deduce this information from `docs/architecture.md`, but `environment.md` is the dedicated artifact.

**Suggestion**: add `docs/environment.md` to O3's inputs.

---

### S-04 | O4 (Validator) does not receive `docs/constraints.md`
**Impact**: Medium

O4 must verify system conformance, but `docs/constraints.md` is not among its inputs. Without constraints, the Validator cannot verify conformance to performance, security, or scalability constraints.

**Suggestion**: add `docs/constraints.md` to O4's inputs.

---

### S-05 | O6 (Debugger) does not receive `docs/test-strategy.md`
**Impact**: Medium

O6 must execute smoke tests but does not receive `docs/test-strategy.md`. The test strategy might contain smoke test scenario definitions or criteria for their creation.

**Suggestion**: add `docs/test-strategy.md` to O6's inputs.

---

### S-06 | O6 (Debugger) does not receive `docs/security-audit-report.md`
**Impact**: Low

If O5 produced a security report before O6, the Debugger could use vulnerability information to build targeted smoke test scenarios. Currently the security report is not among the inputs.

**Suggestion**: add `docs/security-audit-report.md` as an optional input to O6.

---

### S-07 | O7 (Documentation) does not receive `PROMPT.md`
**Impact**: Medium

O7 generates `README.md` and user documentation but does not receive `PROMPT.md`, which contains the project description, requirements, and scope. Without this artifact, the documentation might omit essential information about the project's purpose.

**Suggestion**: add `PROMPT.md` to O7's inputs.

---

### S-08 | C9 does not receive `docs/domain-model.md`
**Impact**: Low

C9 (Implementation Planning) decomposes the architecture into tasks but does not receive the domain model. For complex projects, domain entity knowledge could influence module decomposition.

**Suggestion**: add `docs/domain-model.md` as an input to C9.

---

## Category 3 — State Machine

### S-09 | Flows B1 and C-ADO1 without states in the state machine
**Impact**: High

The state machine lists 20 valid states but does not include states for auxiliary flows. When the pipeline is in audit phase (B1) or conformance phase (C-ADO1), no state represents this. The transition `STOPPED → any state [resume/adoption]` implies that from a stop one passes directly to the target state, but the audit is a non-instantaneous operation that should have its own state.

**Suggestion**: add at least two states: `B1_AUDITING` and `C_ADO1_AUDITING` (or equivalent) with their respective transitions. Alternatively, explicitly declare that auxiliary flows are outside the main state machine and follow a separate protocol.

---

### S-10 | Transition `COMPLETED → any state C2–O9` too permissive
**Impact**: Medium

The re-entry transition from `COMPLETED` allows return to any state from C2 to O9, but in practice some re-entries are logically nonsensical (e.g., from COMPLETED back directly to O2 without going through C9). There are no constraints on the coherence of the user's chosen re-entry point.

**Suggestion**: specify that the re-entry point must be validated by the orchestrator for coherence (e.g., it's not possible to re-enter at O2 if a requirement was modified during a cognitive stage, because all operational artifacts depend on cognitive ones). Alternatively, declare that any re-entry at a cognitive stage automatically invalidates all operational stages.

---

### S-11 | Re-entry and R.5 — protocol scoping
**Impact**: Medium

R.5 covers user re-entry (from O10/COMPLETED and from B1/C-ADO1). However, correction transitions (O4→O3, O5→O3, O6→O3) are also backward transitions. The invariant declares that "backward transitions activate the Re-Entry Protocol (R.5)", but the correction loops O4/O5/O6→O3 should not archive O4/O5/O6 artifacts — they are fix cycles, not re-entries.

**Suggestion**: distinguish two types of backward transitions: (a) **correction** (O4/O5/O6→O3 loops): no archival, validation artifacts are overwritten at the next re-execution; (b) **re-entry** (from COMPLETED or from auxiliary flows): archival per R.5.

---

## Category 4 — Validation and Correction Loops

### S-12 | After O3 correction, which stages must be re-executed?
**Impact**: High

If O4 (Validation) finds problems and sends back to O3, after correction in O3 it's clear that one returns to O4. But if O5 (Security) sends back to O3, after correction must one re-execute O4 before O5? And if O6 (Debug) sends back to O3, must one re-execute O4 and O5?

The state machine allows O3→O4 but does not define whether after an O5→O3 loop the flow resumes from O3→O4→O5 (full re-validation) or from O3→O5 (direct skip).

**Suggestion**: explicitly declare the rule: after any correction in O3, the flow resumes from the immediately following stage (O4), passing through all subsequent validation stages before returning to the stage that originated the correction. Example: O6→O3 implies re-execution O3→O4→O5→O6.

---

### S-13 | O3 module skip — dependency impact
**Impact**: Medium

O3 provides that if a module fails, the user can choose "skip." But if the skipped module is a dependency of subsequent modules in the task graph, dependent modules will fail in turn. The pipeline does not define how to handle this scenario (skip cascade? interruption? notification?).

**Suggestion**: document the handling: if the user chooses to skip a module, the orchestrator must check the dependency graph and flag dependent modules, asking the user whether to skip those too or stop.

---

## Category 5 — Operational Robustness

### S-14 | `manifest.json` schema not defined
**Impact**: High

`manifest.json` is the pipeline's most critical artifact (V.3, R.1, R.3, R.5, R.6, B1 all use it), but its schema is not defined in the document. The following are not documented:
- which fields it contains
- what structure it has (flat? nested? array of stages?)
- how iterations and re-entries are recorded
- which schema version it follows

**Suggestion**: add a dedicated section with the `manifest.json` JSON schema, including at least: schema version, pipeline ID, current state, array of completed stages (with timestamp, artifacts, commit hash, agent), re-entry history.

---

### S-15 | Log naming for re-executions
**Impact**: Medium

Logs have fixed names tied to the stage (e.g., `logs/prompt-refiner-c2-conversation.md`). If a stage is re-executed (for revision cycle or re-entry), the previous log is overwritten. This violates the spirit of R.3 (traceability).

**Suggestion**: adopt a naming convention that includes an incremental suffix or timestamp: `logs/prompt-refiner-c2-conversation-<N>.md` or `logs/prompt-refiner-c2-conversation-<timestamp>.md`.

---

### S-16 | Archive cleanup policy
**Impact**: Low

R.5 archives artifacts in `archive/<timestamp>/` without limits. In projects with many iterations, the archive could grow significantly. No cleanup policy is defined (manual, after N iterations, never).

**Suggestion**: explicitly declare the policy: the archive is never automatically deleted (traceability), or define an optional compaction/cleanup mechanism.

---

### S-17 | Manifest schema version
**Impact**: Low

The manifest does not declare a schema version. If the pipeline evolves (e.g., from v1.0 to v2.0), an old manifest will not be recognizable as compatible or incompatible.

**Suggestion**: add a `schema_version` field to the manifest, verified by B1 during the continuity audit.

---

## Category 6 — Cognitive-to-Operational Handoff

### S-18 | No handoff gate between cognitive and operational pipelines
**Impact**: High

The transition from C9 to O1 is direct: once planning is complete, environment setup begins. There is no explicit checkpoint that verifies the completeness and consistency of all cognitive artifacts before starting implementation. If a cognitive artifact is missing or inconsistent, the problem only surfaces during operational execution.

**Suggestion**: insert a transition gate (implicit or explicit) between C9 and O1 that verifies: all expected cognitive artifacts are present, consistent with each other (cross-referencing), and the manifest reflects state `C9_IMPLEMENTATION_PLANNED`. This could be an automatic orchestrator check without a new stage.

---

## Category 7 — Missing User Gates

### S-19 | C6 without user gate
**Impact**: Medium

C6 (Constraint Analysis and Domain Modeling) produces two critical artifacts (`constraints.md`, `domain-model.md`) that form the foundation of the entire architecture (C7). An error in constraints or in the domain model cascades through to the operational pipeline. However, C6 does not provide a user gate to confirm artifact correctness.

**Suggestion**: add a user gate to C6 for constraint and domain model confirmation, or explicitly document why it is not needed.

---

### S-20 | O1 and O2 without user gate
**Impact**: Low

O1 (Environment) and O2 (Scaffold) do not provide user gates. For most projects this is acceptable, but for projects with specific environment requirements (e.g., particular versions, licensing constraints) a confirmation could prevent rework.

**Suggestion**: evaluate whether to add an optional user gate to O1, documenting the activation criterion.

---

## Category 8 — Clarity and Completeness

### S-21 | `PROMPT.md` artifact naming
**Impact**: Low

`PROMPT.md` is located at the repository root and is a pipeline artifact (C4 output). The name could create confusion with the "prompt" concept in LLM contexts and collide with conventions of other tools. Additionally, all other cognitive artifacts reside in `docs/`, creating a placement inconsistency.

**Suggestion**: evaluate a rename (e.g., `docs/requirements-spec.md` or `docs/project-spec.md`) for consistency with other artifact placement, or document the rationale for the current choice (root visibility as the main reference point).

---

### S-22 | O5 — Security audit tool definition
**Impact**: Low

O5 requires "OWASP analysis", "dependency audit (CVE)", "security pattern verification", but does not indicate whether these checks require specific tools (SAST, DAST, `npm audit`, `pip-audit`, etc.) or are performed by the LLM agent without tools. In an LLM-only context, the security audit has inherent limitations that should be declared.

**Suggestion**: document whether the audit is LLM-only (with its limitations) or requires external tool integration, and if so, how tools are configured (in O1? in O8?).

---

### S-23 | No escalation mechanism
**Impact**: Medium

When an agent encounters a problem it cannot solve (e.g., an ambiguous requirement surfaced during O3, or a constraint conflict discovered by the Validator), the only mechanism is "notify the user." No structured escalation protocol distinguishes between: blockage resolvable by the agent with more context, blockage resolvable by the user, blockage requiring upstream artifact revision.

**Suggestion**: define an escalation protocol with levels: (1) the agent requests clarification from the user within the current stage context; (2) the agent signals the need for upstream artifact revision (the orchestrator proposes re-entry); (3) fatal blockage (stop per R.2).

---

### S-24 | No progress metrics
**Impact**: Low

The user has no structured visibility into pipeline progress beyond per-stage notifications. For projects with many modules (O3), no mechanism indicates overall progress (e.g., "module 3/12 completed").

**Suggestion**: add a progress field to the manifest (e.g., `progress: { current_stage, total_stages, substage_progress }`) and require the orchestrator to communicate progress in the executive summary context briefs.

---

---

## Summary

| ID | Category | Impact | Synopsis |
|----|----------|:------:|----------|
| S-01 | Agents | High | 11 stages without declared agent |
| S-02 | Agents | Medium | Prompt Refiner context loss between C2/C3/C4 |
| S-03 | I/O | High | O3 missing `environment.md` as input |
| S-04 | I/O | Medium | O4 missing `constraints.md` as input |
| S-05 | I/O | Medium | O6 missing `test-strategy.md` as input |
| S-06 | I/O | Low | O6 missing optional `security-audit-report.md` |
| S-07 | I/O | Medium | O7 missing `PROMPT.md` as input |
| S-08 | I/O | Low | C9 missing `domain-model.md` as input |
| S-09 | State Machine | High | B1/C-ADO1 without states in the machine |
| S-10 | State Machine | Medium | Re-entry without coherence validation |
| S-11 | State Machine | Medium | R.5 invoked also for correction loops |
| S-12 | Correction | High | Post-correction re-execution not defined |
| S-13 | Correction | Medium | Module skip without dependency handling |
| S-14 | Robustness | High | `manifest.json` schema not defined |
| S-15 | Robustness | Medium | Logs overwritten on re-executions |
| S-16 | Robustness | Low | No archive cleanup policy |
| S-17 | Robustness | Low | Manifest without schema version |
| S-18 | Handoff | High | No gate between cognitive and operational pipelines |
| S-19 | Gates | Medium | C6 without user gate |
| S-20 | Gates | Low | O1/O2 without user gate |
| S-21 | Clarity | Low | `PROMPT.md` naming and placement |
| S-22 | Clarity | Low | O5 without tool definition |
| S-23 | Clarity | Medium | No escalation protocol |
| S-24 | Clarity | Low | No progress metrics |

### By impact

| Impact | Count |
|--------|:-----:|
| High | 6 |
| Medium | 10 |
| Low | 8 |
| **Total** | **24** |

---

*End of improvement suggestions.*
