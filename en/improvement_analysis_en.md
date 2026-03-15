# Improvement Analysis — pipeline_1.0 → pipeline_2.0

This document tracks all 24 suggestions from `suggestion_analysis_en.md` and their implementation status in `pipeline_2.0_en.md`.

---

## Summary

| Status | Count |
|--------|-------|
| Implemented | 24 |
| Partial | 0 |
| Deferred | 0 |
| Rejected | 0 |
| **Total** | **24** |

---

## Detailed Status

### S-01 — Agent-to-Stage Mapping Table
- **Impact**: High
- **Decision**: User confirmed mapping
- **Status**: ✅ Implemented
- **Location**: New "Agents" section added after Design Constraints, with full agent-stage mapping table
- **Details**: Added explicit table with columns Agent, Stages, Responsibility. Stages marked "Orchestrator (direct)" are clarified as executed by the orchestrator itself. Each stage header now includes `**Agent**: <name>`.

### S-02 — Context Continuity for Prompt Refiner (C2→C3→C4)
- **Impact**: High
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: V.2 constraint updated; C3 and C4 input lists; C2 output notes
- **Details**: V.2 constraint now explicitly addresses consecutive same-agent invocations. C3 input includes last C2 conversation log. C4 input includes last C3 conversation log. C2 output `intent.md` carries a note about encoding all information for subsequent stages.

### S-03 — Add `docs/environment.md` to O3 Inputs
- **Impact**: Medium
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: O3 input list
- **Details**: `docs/environment.md` added to O3 inputs so the Builder can reference runtime and dependency information during code generation.

### S-04 — Add `docs/constraints.md` to O4 Inputs
- **Impact**: Medium
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: O4 input list
- **Details**: `docs/constraints.md` added so the Validator can verify constraint conformance during system validation.

### S-05 — Add `docs/test-strategy.md` to O6 Inputs
- **Impact**: Medium
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: O6 input list
- **Details**: `docs/test-strategy.md` added so the Debugger can reference test criteria when designing smoke tests.

### S-06 — Add `docs/security-audit-report.md` as Optional Input to O6
- **Impact**: Medium
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: O6 input list
- **Details**: `docs/security-audit-report.md` added as optional input, allowing the Debugger to focus smoke tests on areas flagged by the security audit.

### S-07 — Add `docs/project-spec.md` to O7 Inputs
- **Impact**: Medium
- **Decision**: N/A (direct implementation, uses renamed artifact per S-21)
- **Status**: ✅ Implemented
- **Location**: O7 input list
- **Details**: `docs/project-spec.md` (renamed from `PROMPT.md` per S-21) added to O7 inputs for documentation generation.

### S-08 — Add `docs/domain-model.md` to C9 Inputs
- **Impact**: Medium
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: C9 input list
- **Details**: `docs/domain-model.md` added so the Architect can reference domain concepts when planning implementation tasks.

### S-09 — Add B1_AUDITING and C_ADO1_AUDITING States
- **Impact**: High
- **Decision**: Option a) — Add states to state machine
- **Status**: ✅ Implemented
- **Location**: State Machine section — Valid States, Valid Transitions, Invariants
- **Details**: `B1_AUDITING` and `C_ADO1_AUDITING` added as valid states. Transitions: `STOPPED → B1_AUDITING`, `STOPPED → C_ADO1_AUDITING`, `B1_AUDITING → any C1-O9`, `B1_AUDITING → C_ADO1_AUDITING`, `C_ADO1_AUDITING → any C1-O9`. Invariant added: auxiliary states are transient and resolve to a main pipeline state.

### S-10 — Re-Entry Coherence Validation
- **Impact**: High
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: State Machine Scoping Rules (S.1)
- **Details**: New subsection specifying that cognitive re-entry invalidates all operational stages (with archival), and operational re-entry archives only from the re-entry point onward. Orchestrator reports impact before executing.

### S-11 — Correction Loops vs R.5 Clarification
- **Impact**: High
- **Decision**: Confirmed — correction loops do NOT trigger R.5
- **Status**: ✅ Implemented
- **Location**: R.5 scope clause, R.7 (new rule), State Machine Scoping Rules
- **Details**: R.5 now has an explicit "Scope" paragraph limiting it to user-initiated re-entry. New R.7 rule defines correction loop behavior. State Machine Scoping Rules distinguish correction loops from re-entries.

### S-12 — Full Re-Execution from O4 on Correction Loops
- **Impact**: High
- **Decision**: Option a) — Full re-execution from O4 onwards
- **Status**: ✅ Implemented
- **Location**: R.7 (Correction Loops)
- **Details**: R.7 specifies that after O3 corrections, flow always resumes from O4 and proceeds sequentially. Examples given: O4→O3→O4, O5→O3→O4→O5, O6→O3→O4→O5→O6.

### S-13 — Module Skip Dependency Cascade
- **Impact**: Medium
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: O3 error handling section
- **Details**: When user chooses "skip" for a failed module, the orchestrator checks the dependency graph and reports all downstream dependent modules, asking whether to skip those as well or stop.

### S-14 — Define manifest.json Schema
- **Impact**: Medium
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: New "Manifest Schema" section after Cross-Cutting Rules
- **Details**: Full JSON schema with field descriptions. Includes `schema_version`, `pipeline_id`, `project_name`, `current_state`, `progress`, `stages_completed` array (with `execution_index`), `re_entries` array, `corrections` array.

### S-15 — Log Incremental Suffix
- **Impact**: Low
- **Decision**: Option a) — Incremental suffix `<N>`
- **Status**: ✅ Implemented
- **Location**: R.3 (Traceability)
- **Details**: Log naming convention updated to `logs/<agent>-<stage-id>-<description>-<N>.md` with examples showing increment on re-execution.

### S-16 — Archive Retention Policy
- **Impact**: Low
- **Decision**: Option a) — Archive never deleted (full traceability)
- **Status**: ✅ Implemented
- **Location**: R.5 (Re-Entry Protocol) — Archive policy paragraph
- **Details**: Explicit statement that archive is never automatically deleted. Manual cleanup by user is permitted but not required.

### S-17 — Schema Version in Manifest
- **Impact**: Low
- **Decision**: N/A (included in S-14)
- **Status**: ✅ Implemented
- **Location**: Manifest Schema section; B1 validation criteria
- **Details**: `schema_version` field defined in manifest schema. B1 validation criteria updated to verify schema version compatibility.

### S-18 — Cognitive-to-Operational Handoff Check
- **Impact**: Medium
- **Decision**: Option a) — Automatic orchestrator check (no new stage)
- **Status**: ✅ Implemented
- **Location**: "Cognitive Pipeline Output" section, between C9 and O1
- **Details**: Added "Cognitive-to-Operational Handoff" paragraph specifying automatic integrity check: (1) all expected cognitive artifacts present, (2) manifest reflects C9_IMPLEMENTATION_PLANNED, (3) no broken artifact references. Failure halts pipeline requiring user intervention. State machine transition annotated with `[after handoff check]`.

### S-19 — C6 User Gate Decision
- **Impact**: Low
- **Decision**: Option b) — Document why no gate is needed
- **Status**: ✅ Implemented
- **Location**: C6 stage description
- **Details**: Added "Note" explaining that no user gate is required because errors in constraints or domain model are caught by C8 (Architecture Validation) which can trigger return to C7 with revision notes.

### S-20 — O1/O2 User Gate Decision
- **Impact**: Low
- **Decision**: Option b) — No gate
- **Status**: ✅ Implemented
- **Location**: O1 and O2 stage descriptions
- **Details**: O1 and O2 have no user gate (no change from v1.0). Environment and scaffold are verified by their validation criteria without requiring explicit user confirmation.

### S-21 — Rename PROMPT.md to docs/project-spec.md
- **Impact**: Medium
- **Decision**: Option a) — Rename to `docs/project-spec.md`
- **Status**: ✅ Implemented
- **Location**: Throughout entire document (C4, O4, O7, Cognitive Pipeline Output, anywhere referencing PROMPT.md)
- **Details**: All references to `PROMPT.md` renamed to `docs/project-spec.md`. The artifact is now produced by C4 and lives in the `docs/` directory consistently with all other cognitive artifacts.

### S-22 — Hybrid Testing Approach (LLM + External Tools)
- **Impact**: Medium
- **Decision**: Option c) — Hybrid (LLM primary + external tools optional), tools configured in O1
- **Status**: ✅ Implemented
- **Location**: O1 output (environment.md), O5 input and output, O8 input
- **Details**: O1 now produces `docs/environment.md` which includes recommended external tools (linters, SAST scanners, dependency auditors). O5 references `docs/environment.md` for tool availability and documents whether external tools were used. O5 output includes "External tool results" and "Limitations" sub-sections. O8 references `docs/environment.md`.

### S-23 — Escalation Protocol
- **Impact**: Low
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: R.8 (Escalation Protocol) — new rule
- **Details**: Three-level escalation: Level 1 (in-context clarification), Level 2 (upstream revision via R.5), Level 3 (fatal blockage via R.2). Each level specifies trigger condition and orchestrator behavior.

### S-24 — Progress Metrics
- **Impact**: Low
- **Decision**: N/A (direct implementation)
- **Status**: ✅ Implemented
- **Location**: R.1 step 5, R.9 (Progress Metrics) — new rule, Manifest Schema (progress object)
- **Details**: R.1 step 5 updated to include progress metrics. New R.9 rule defines pipeline-level progress (`current_stage_index` / `total_stages`) and sub-stage progress for O3 (`modules_completed` / `modules_total`). Executive summaries include progress string. Manifest schema includes `progress` object.

---

## Cross-Cutting Changes

Beyond individual suggestions, the following structural changes were applied:

1. **Rule renumbering**: former R.5 (Re-Entry Protocol) and R.6 (Git Conventions) retained. New R.7 (Correction Loops), R.8 (Escalation Protocol), R.9 (Progress Metrics) added.
2. **Manifest Schema section**: new dedicated section between Cross-Cutting Rules and State Machine, providing the full JSON schema with field descriptions.
3. **Agents section**: new section after Design Constraints providing a comprehensive agent-stage mapping table.
4. **State Machine updates**: added `B1_AUDITING` and `C_ADO1_AUDITING` states, added State Machine Scoping Rules (S.1) subsection, updated invariants.
5. **Pipeline Summary**: updated to include `[Cognitive-to-Operational Handoff Check]` between cognitive and operational sections.

---

*End of improvement analysis.*
