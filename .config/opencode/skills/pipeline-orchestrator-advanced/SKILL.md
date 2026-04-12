---
name: pipeline-orchestrator-advanced
description: "Advanced pipeline features for the Orchestrator: re-entry protocol (R.5), escalation (R.8), re-entry guide (R.10), automode (R.11), fast track (R.12), and auxiliary flows (B1/C-ADO1). Load only when the specific trigger condition is met."
---

# Pipeline Orchestrator — Advanced Features

These features are loaded on-demand by the orchestrator when a specific trigger condition is met. They complement the core rules (R.1, R.2, R.3, R.4, R.6, R.7, R.9) which are always available inline.

---

## R.5 — Re-Entry Protocol

When the user chooses to re-enter the pipeline at a previous point (from O10/COMPLETED, or from B1/C-ADO1):

1. **Archival**: artifacts produced by stages after the re-entry point are moved to `archive/<timestamp>/`, preserving the original directory structure
2. **Manifest update**: `manifest.json` is updated to reflect the new state (the re-entry stage state), with reference to the archive for traceability
3. **Commit**: `[RE-ENTRY] [Orchestrator] Return to <stage-id> — artifacts archived in archive/<timestamp>/`
4. **Post-reentry checkpoint**: write `## Pipeline Checkpoint [post-reentry]` in the conversation with: resulting state, `from_state -> target_stage`, archive path, scope impact, next stage/agent, required input artifacts, pending gate
5. **Context compaction**: trigger autonomous compaction immediately after the checkpoint (OpenCode plugin `pipeline-compaction-controller.js` is required).
6. **Resumption**: execution resumes from the indicated stage with artifacts from preceding stages intact
7. **Delegation**: identify the agent responsible for the target stage from the Agent-to-Stage Mapping and delegate following R.1 (starting from step 2, dispatch commit). You MUST NOT execute stages assigned to other agents.

**Scope**: R.5 applies ONLY to user-initiated re-entry (from COMPLETED or from auxiliary flows B1/C-ADO1). Correction loops (O4→O3, O5→O3, O6→O3) are governed by R.7 and do NOT trigger archival.

**Archive policy**: the archive is never automatically deleted. All archived artifacts are retained for full traceability. Manual cleanup by the user is permitted.

---

## R.8 — Escalation Protocol

When an agent encounters a problem it cannot resolve autonomously:

### Level 1 — In-context clarification
The agent requests clarification from the user within the current stage context. You relay the question and provide the answer back to the agent. The stage continues.
- **In automode**: resolve the clarification autonomously based on project artifacts and context, without asking the user.

### Level 2 — Upstream revision
The agent signals that an upstream artifact is ambiguous, inconsistent, or incomplete. Report the issue to the user and propose re-entry at the appropriate upstream stage (following R.5). The user confirms or overrides.
- **In automode**: determine the appropriate re-entry stage autonomously, execute R.5, and the pipeline re-traverses all intermediate stages automatically (automode auto-proceeds through all gates). No user interaction required.

### Level 3 — Fatal blockage
The agent cannot proceed and no upstream revision would resolve the issue. Apply R.2 (stop), documenting the blockage in the log. **This is the only escalation level that halts the pipeline even in automode.** The user must intervene to resume.

---

## R.10 — Post-Completion Re-Entry Guide

When the user selects "Iteration" at O10, or returns to a COMPLETED project in a new session, present this guide:

| Scenario | Recommended Re-Entry | Agent | Rationale |
|----------|---------------------|-------|-----------|
| New feature or requirement | C4 | Prompt Refiner | Update project-spec with new requirements, then cascade through design and implementation |
| Architecture redesign | C7 | Architect | Redesign architecture; all operational stages will be re-executed |
| Bug fix (diagnosis needed) | O6 | Debugger | Diagnose via smoke tests, then correction loop R.7 for code fix |
| Bug fix (known root cause) | O3 | Builder | Direct code fix, then re-validation through O4→O5→O6 |
| Security vulnerability | O5 | Validator | Re-audit security, then correction loop R.7 if fix needed |
| Documentation update only | O7 | Builder | Regenerate documentation |
| CI/CD reconfiguration | O8 | Builder | Reconfigure pipeline |
| New release version | O9 | Orchestrator | Tag new version, generate changelog |

**New session with COMPLETED project**: read the manifest, inform the user of project status, and present this guide. The user selects the re-entry point and R.5 is applied.

**Important notes**:
- Re-entry at a cognitive stage (C2–C9) invalidates all operational stages per S.1 — inform the user of this impact before proceeding.
- Re-entry at an operational stage (O1–O9) preserves cognitive artifacts.
- The user may choose a different stage than recommended — validate the choice per S.1 but do not block it.
- **Fast Track option**: for interventions not requiring architectural or requirements changes, propose Fast Track mode (R.12) as an alternative. See R.12 below.

---

## R.11 — Automode

Automode allows the user to delegate all decisions to the pipeline, bypassing user gates with a mandatory policy of resolving all issues.

### Activation
- User can activate at any point after C4 (requirements confirmed) by explicit request
- Record `automode: true` in `manifest.json`
- Commit: `[AUTOMODE] [Orchestrator] Automode activated`

### Behavior when active
- All user gates become **auto-proceed**
- At stages with revision cycles (C7, C8, C9): if the agent or validator finds issues, ALWAYS choose "revise" and loop until resolved
- At O4/O5/O6: if issues are found, ALWAYS choose "full correction" (option a) and trigger R.7. NEVER choose "no correction → proceed"
- C8 "architecture invalid": ALWAYS return to C7 with revision notes
- Executive summaries are still written (passive monitoring)
- Any user message during automode is treated as an instruction and takes priority

### Exemptions (ALWAYS enforced, even in automode)
- **O10 (Closure)**: ALWAYS requires explicit user confirmation
- **R.8 Level 3 (Fatal blockage)**: ALWAYS halts the pipeline

### Deactivation
- User says "automode off" (or equivalent) at any time
- Record `automode: false` in `manifest.json`
- Commit: `[AUTOMODE] [Orchestrator] Automode deactivated`
- User gates resume normally

---

## R.12 — Fast Track Mode

Fast Track provides a shortened operational path for focused interventions on COMPLETED projects that do not alter architecture or requirements.

### Eligibility criteria (ALL must be true)
1. The project is in `COMPLETED` state
2. The intervention does NOT require changes to `architecture.md`, `interface-contracts.md`, or `api.md`
3. The intervention does NOT add new functional requirements to `project-spec.md`
4. The intervention does NOT introduce new dependencies to `environment.md`

### Activation flow
1. User requests an intervention on a COMPLETED project
2. Evaluate the eligibility criteria above
3. If eligible, propose Fast Track with explicit justification (listing which criteria are met and why)
4. User confirms (if rejected → standard full-pipeline re-entry via R.5 + R.10)

### Fast Track execution
1. **Archive**: apply R.5 archival from the earliest affected stage onward
2. **O3**: invoke Builder only for affected modules
3. **O4**: System Validation — **ALWAYS mandatory, never skippable**
4. **O5**: Security Audit — mandatory IF changes touch input handling, authentication, authorization, or dependencies. You decide; user can override.
5. **O6**: Debug — mandatory IF trigger was a bug report. Otherwise optional; you decide; user can override.
6. **O7**: Documentation — SKIP if no new APIs, config changes, or user-facing behavior changes. You decide; user can override.
7. **O8**: CI/CD — SKIP if CI/CD configuration is unchanged. You decide; user can override.
8. **O8.V**: CI Verification — mandatory if O8 was executed. Skip if O8 was skipped.
9. **O9**: Release — patch version bump (mandatory)

### Skip tracking
For every skipped stage, record in `manifest.json` under `fast_track.skipped_stages`: stage id, justification, and whether it was your decision or user override.

### Safety net
- O4 is ALWAYS executed — no exceptions
- If O4 finds architectural conformance issues indicating architectural impact, Fast Track is **automatically cancelled**. Inform the user and switch to standard full-pipeline re-entry.
- If O4/O5/O6 find issues, R.7 correction loops apply normally (no shortcuts on corrections)

---

## B1 — Continuity Audit (Orchestrator Reference)

When a user requests to resume an existing project:

1. Check if `pipeline-state/manifest.json` exists
2. If yes: set state to `B1_AUDITING`, invoke **Auditor** (`subagent_type: "auditor"`)
3. Auditor reads both `manifest.json` (HEAD) and `manifest-history.json` (HISTORY) for full audit. Produces `docs/audit-report.md` with: artifact inventory, consistency analysis, pipeline state, interruption point, recommendation (resume or adoption)
4. **User gate**: confirm audit result
5. If **resumable**: re-enter main flow at the identified point (orchestrator reconstructs context from manifest + artifacts + logs)
6. If **not resumable**: recommend adoption → transition to C-ADO1

**Key**: if manifest `current_state` ends with `_IN_PROGRESS`, the stage was interrupted — re-execute from scratch.

---

## C-ADO1 — Conformance Audit (Orchestrator Reference)

When adopting a non-conforming repository:

1. Set state to `C_ADO1_AUDITING`, invoke **Auditor** (`subagent_type: "auditor"`)
2. Auditor produces `docs/adoption-report.md` with: inventory, gap analysis, conformance plan, entry point
3. **User gate**: confirm adoption plan
4. Execute the conformance plan: invoke appropriate agents for each missing artifact, in order specified by the plan
5. Once complete: re-enter main flow at the identified point

**Entry points**: from C1 in adoption mode, from B1 when not resumable, or from STOPPED state on user request.
