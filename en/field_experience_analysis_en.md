# Field Experience Analysis — pipeline_2.0 → pipeline_3.0

This document tracks all issues identified during a full pipeline execution and their resolution in `pipeline_3.0_en.md`.

---

## Summary

| ID | Issue | Type | Impact | Status |
|----|-------|------|--------|--------|
| FE-01 | Commit format missing agent name | Traceability gap | High | ✅ Fixed |
| FE-02 | No dispatch commits or IN_PROGRESS states | Traceability gap | Critical | ✅ Fixed |
| FE-03 | O3 Builder loses context (conversation compaction) | Design flaw | Critical | ✅ Fixed |
| FE-04 | Orchestrator self-assigns after R.5 re-entry | Instruction gap | High | ✅ Fixed |
| FE-05 | No re-entry guidance by change type | Usability gap | Medium | ✅ Fixed |
| FE-06 | Adoption entry point unclear | Usability gap | Medium | ✅ Fixed |

---

## Detailed Analysis

### FE-01 — Commit Format Missing Agent Name

- **Observed behavior**: commit messages follow `[<stage-id>] <description>`, making it impossible to determine which agent performed the work from Git history alone.
- **Root cause**: R.6 defined commit format without the agent name field.
- **Impact**: reduced traceability — to determine who executed a stage, one must cross-reference the manifest rather than reading commit history directly.
- **Resolution**: R.6 updated. New format: `[<stage-id>] [<agent-name>] <description>`. Applied consistently across R.1, R.5, R.7, and all stage-specific commit references.
- **Affected rules**: R.1 (step 5, step 7), R.5 (step 3), R.6, R.7, O3 per-module commits.

### FE-02 — No Dispatch Commits or IN_PROGRESS States

- **Observed behavior**: if a conversation is interrupted between the orchestrator dispatching to a subagent and receiving the result, there is no record that the stage was ever started. The manifest still shows the previous completed state.
- **Root cause**: R.1 only commits AFTER the agent completes and returns. No intermediate state (`_IN_PROGRESS`) exists in the state machine. There is no commit at the point of dispatch.
- **Impact**: critical traceability gap — unexpected interruptions (session crash, network failure, context window overflow) leave no trace. B1 (Continuity Audit) cannot distinguish between "stage not started" and "stage started but interrupted."
- **Resolution**:
  - R.1 revised to a 9-step pattern with explicit dispatch commit (step 2) before agent invocation.
  - New `*_IN_PROGRESS` states added for every stage in the state machine.
  - Dispatch commit updates manifest to `_IN_PROGRESS` state before invoking the subagent.
  - B1 updated to detect `_IN_PROGRESS` states as interrupted stages.
- **New states added**: `C1_IN_PROGRESS`, `C2_IN_PROGRESS`, `C3_IN_PROGRESS`, `C4_IN_PROGRESS`, `C5_IN_PROGRESS`, `C6_IN_PROGRESS`, `C7_IN_PROGRESS`, `C8_IN_PROGRESS`, `C9_IN_PROGRESS`, `O1_IN_PROGRESS`, `O2_IN_PROGRESS`, `O3_IN_PROGRESS`, `O4_IN_PROGRESS`, `O5_IN_PROGRESS`, `O6_IN_PROGRESS`, `O7_IN_PROGRESS`, `O8_IN_PROGRESS`, `O9_IN_PROGRESS`, `O10_IN_PROGRESS`.

### FE-03 — O3 Builder Loses Context (Conversation Compaction)

- **Observed behavior**: during O3 (Module Generation), the Builder does not produce per-module reports (`logs/builder-report-module-<name>-<N>.md`) and does not perform intermediate commits between modules. Output quality degrades as the module count increases.
- **Root cause**: in v2.0, O3 is a single subagent invocation where the Builder handles ALL modules in one conversation. As the conversation grows (code generation for many modules), the language model's context window fills up and conversation compaction (summarization) discards the detailed O3 instructions — particularly per-module reporting requirements and commit-per-module protocol.
- **Impact**: critical — violates R.1 (no per-module commits), R.3 (no per-module logs), and the O3 specification itself (no per-module reports). Also violates R.2 atomicity — if interrupted mid-O3, all unfinished work is lost because no intermediate commits occurred.
- **Resolution**: O3 restructured from single-invocation to **orchestrator-managed per-module loop**.
  - The orchestrator reads `task-graph.md` to determine module order and count.
  - The orchestrator invokes the Builder **once per module**, providing the module assignment, relevant artifacts, and any context from previously completed modules.
  - Between each module invocation, the orchestrator commits, updates manifest progress, and provides executive summary.
  - Each Builder invocation has a fresh, focused context — immune to compaction of previous modules.
  - Error handling (skip/retry/stop) is managed by the orchestrator between invocations, not by the Builder internally.
- **Design principle**: this change applies V.2 (stateless agents) more rigorously — each module invocation is a self-contained unit of work that doesn't rely on conversational context from previous modules.

### FE-04 — Orchestrator Self-Assigns After R.5 Re-Entry

- **Observed behavior**: after selecting "Iteration" at O10 and completing the R.5 re-entry protocol (archive, manifest update, commit), the orchestrator executed the target stage itself instead of delegating to the correct subagent.
- **Root cause**: R.5 defines 4 steps (archive, manifest, commit, resume) but does NOT include an explicit instruction to delegate to the target stage's assigned agent. After completing the protocol, the orchestrator lacks a clear directive and defaults to self-execution.
- **Impact**: high — the wrong agent executes the stage, producing output that may not conform to the subagent's specialized instructions. The user must detect and correct this manually.
- **Resolution**: R.5 updated with a 5th step: **Delegation**. After completing steps 1-4, the orchestrator MUST identify the agent responsible for the target stage from the Agent-to-Stage mapping and delegate using R.1 (starting from the dispatch commit). Additionally, a constraint added: "The orchestrator MUST NOT execute stages assigned to other agents."

### FE-05 — No Re-Entry Guidance by Change Type

- **Observed behavior**: when the user selects "Iteration" at O10, no guidance is provided on which stage to re-enter based on the type of change needed (new feature, bug fix, security patch, etc.).
- **Root cause**: O10 and R.5 define the re-entry mechanism but not the decision criteria for choosing the re-entry point.
- **Impact**: medium — users may re-enter at the wrong stage, wasting effort or missing necessary intermediate stages.
- **Resolution**: new rule **R.10 — Post-Completion Re-Entry Guide** added. Provides a scenario-to-stage mapping table that the orchestrator presents when the user selects "Iteration." Also covers the case of returning to a COMPLETED project in a new session.

### FE-06 — Adoption Entry Point Unclear

- **Observed behavior**: the user was unsure how to initiate project adoption. Flow C (C-ADO1) exists but its entry point from a fresh start is not well-defined in the state machine.
- **Root cause**: the state machine defines `STOPPED → C_ADO1_AUDITING` and `B1_AUDITING → C_ADO1_AUDITING`, but for a project that has never been in the pipeline, there is no clear transition from the initial state.
- **Impact**: medium — users cannot easily discover the adoption pathway.
- **Resolution**: C1 updated with an explicit **adoption mode**. When the user requests adoption instead of a new project, the orchestrator creates the pipeline infrastructure (directories, manifest) and transitions directly to `C_ADO1_AUDITING`. A new transition `C1_INITIALIZED → C_ADO1_AUDITING` is added to the state machine.

---

## Cross-Cutting Changes

1. **R.1 revised**: 8-step → 9-step pattern with dispatch commit as step 2.
2. **R.6 updated**: commit format now `[<stage-id>] [<agent-name>] <description>`.
3. **R.5 updated**: 4-step → 5-step with explicit post-re-entry delegation.
4. **O3 restructured**: single-invocation → orchestrator-managed per-module loop.
5. **New R.10**: post-completion re-entry guide with scenario-to-stage mapping.
6. **State machine expanded**: `_IN_PROGRESS` states for all stages, new transitions for dispatch/completion pattern.
7. **C1 updated**: dual-mode (new project / adoption).
8. **B1 updated**: detects `_IN_PROGRESS` states as evidence of interrupted stages.
9. **Manifest schema**: `progress.current_module` added for O3 tracking; `schema_version` updated to `3.0`.
10. **V.2 note**: added explicit reference to O3 per-module invocation model as application of the statelessness principle.

---

*End of field experience analysis.*
