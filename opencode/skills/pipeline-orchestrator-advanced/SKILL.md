---
name: pipeline-orchestrator-advanced
description: "Advanced pipeline features for the Orchestrator: re-entry protocol (R.5), escalation (R.8), re-entry guide (R.10), automode (R.11), fast track (R.12), and auxiliary flows (B1/C-ADO1). Load only when the specific trigger condition is met."
---

# Pipeline Orchestrator — Advanced Features

These features are loaded on-demand by the orchestrator when a specific trigger condition is met. They complement the core orchestrator definition (orchestrator.md) and the phase-specific skills (startup, o3, validation, finalization).

---

## R.5 — Re-Entry Protocol

When the user chooses to re-enter the pipeline at a previous point (from O10/COMPLETED, or from B1/C-ADO1):

1. **Branch check**: verify `pipeline/<project-name>` branch exists and is the active branch. If re-entry from COMPLETED and the branch was merged/deleted, create a new `pipeline/<project-name>` from the default branch (`manifest.json` → `default_branch`) per R.6.
2. **Archival**: artifacts produced by stages after the re-entry point are moved to `archive/<timestamp>/`, preserving the original directory structure
3. **Decision log compaction** (R.15): if `docs/decision-log.md` exists, compact it per R.15 compaction rules. The compacted file is included in the re-entry commit (step 6).
4. **Manifest update**: `manifest.json` is updated to reflect the new state (the re-entry stage state), with reference to the archive for traceability
5. **Automode safety**: if re-entry target is `C2`, set `automode: false` in `manifest.json` before resuming. Commit this change as part of re-entry so C2 remains fully interactive.
6. **Commit**: `[RE-ENTRY] [Orchestrator] Return to <stage-id> — artifacts archived in archive/<timestamp>/`
7. **>>> MANDATORY: Write Pipeline Checkpoint [post-reentry] <<<**

   Write this block EXACTLY in the conversation:

   ```
   ## Pipeline Checkpoint [post-reentry]
   - **State**: <current_state from manifest>
   - **Progress**: stage <X>/<Y>
   - **Automode**: <true/false>
   - **Fast Track**: <true/false>
   - **Handoff verified**: n/a
   - **Modules generated**: n/a
   - **Completion state**: n/a
   - **Re-entry path**: <from_state> -> <target_stage>
   - **Archive reference**: archive/<timestamp>/
   - **Known issues**: <brief list or "none">
   - **Active user instructions**: <verbatim or "none">
   - **Next stage**: <stage-id> → <agent-name>
   - **Required input artifacts**: <list of paths>
   - **Pending gate**: <yes/no, details>
   ```

   Then append: `Autonomous compaction is triggered at this checkpoint. If needed, /compact remains available as manual fallback.`

8. **Context compaction**: autonomous compaction is triggered by the plugin after the checkpoint block is detected.
9. **Resumption**: execution resumes from the indicated stage with artifacts from preceding stages intact
10. **Preflight**: run R.0 Entry Preflight before first post-reentry dispatch. If preflight is `BLOCKED`, halt and request user intervention.
11. **Delegation**: identify the agent responsible for the target stage from the Agent-to-Stage Mapping and delegate following R.1 (starting from step 2, dispatch commit). You MUST NOT execute stages assigned to other agents.

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

- **In automode**: determine the appropriate re-entry stage autonomously, execute R.5, and the pipeline re-traverses all intermediate stages automatically (automode auto-proceeds through applicable gates, except C2). If re-entry targets C2, disable automode before resumption per R.5/S.1.

### Level 3 — Fatal blockage

The agent cannot proceed and no upstream revision would resolve the issue. Apply R.2 (stop), documenting the blockage in the log. **This is the only escalation level that halts the pipeline in automode.** Non-escalation hard stops still apply (e.g., R.0 preflight `BLOCKED`). The user must intervene to resume.

---

## R.10 — Post-Completion Re-Entry Guide

When the user selects "Iteration" at O10, or returns to a COMPLETED project in a new session, present this guide:

| Scenario | Recommended Re-Entry | Agent | Rationale |
|----------|---------------------|-------|-----------|
| New feature or requirement (raw/ambiguous request) | C2 | Prompt Refiner | Disambiguate intent, then formalize → extract requirements → cascade through design and implementation |
| New feature or requirement (clear, well-defined spec) | C3 or C4 | Prompt Refiner | Formalize or extract requirements directly, then cascade through design and implementation |
| Architecture redesign | C7 | Architect | Redesign architecture; all operational stages will be re-executed |
| Bug fix (diagnosis needed) | O6 | Debugger | Diagnose via smoke tests, then correction loop R.7 for code fix |
| Bug fix (known root cause) | O3 | Builder | Direct code fix, then re-validation through O4→O5→O6 |
| Security vulnerability | O5 | Validator | Re-audit security, then correction loop R.7 if fix needed |
| Documentation update only | O7 | Builder | Regenerate documentation |
| CI/CD reconfiguration | O8 | Builder | Reconfigure pipeline |
| New release version | O9 | Orchestrator | Determine new version, generate changelog (tag applied by O10 after merge) |

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

- All user gates become **auto-proceed**, except the exemptions below
- At stages with revision cycles (C7, C8, C9): if the agent or validator finds issues, ALWAYS choose "revise" and loop until resolved
- At O4/O5/O6: if issues are found, ALWAYS choose "full correction" (option a) and trigger R.7. NEVER choose "no correction → proceed"
- C8 "architecture invalid": ALWAYS return to C7 with revision notes
- Executive summaries are still written (passive monitoring)
- Any user message during automode is treated as an instruction and takes priority

### Exemptions (ALWAYS enforced, even in automode)

- **C2 (Intent Clarification)**: ALWAYS requires explicit user confirmation; never auto-proceed
- **R.8 Level 3 (Fatal blockage)**: ALWAYS halts the pipeline
- **R.0 preflight `BLOCKED`**: ALWAYS halts progression until user intervention
- **O3 module failure (after automatic retry)**: in automode, a module failure triggers an automatic single retry. If the retry also fails, the pipeline halts as R.8 Level 3. The user must intervene to retry, skip, or stop.

**Note**: R.8 Level 1 and Level 2 are NOT exempt from automode — you handle them autonomously (see R.8).

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
5. The request is **sufficiently clear and unambiguous** — you can determine exact scope and affected modules without further clarification from the user

### Activation flow

1. User requests an intervention on a COMPLETED project
2. Evaluate the eligibility criteria above
3. If eligible, propose Fast Track with explicit justification (listing which criteria are met and why)
4. User confirms (if rejected → standard full-pipeline re-entry via R.5 + R.10)
5. Record in `manifest.json`: `fast_track.active = true`, `fast_track.activated_at`, `fast_track.reason`, and `fast_track.affected_modules`

### Declassification

If during Fast Track evaluation or execution you determine the request is ambiguous, under-specified, or has scope that cannot be confidently determined, Fast Track is **not eligible**. Inform the user and fall back to standard re-entry via R.10 (starting from C2 for disambiguation).

### Fast Track execution

1. **Archive**: apply R.5 archival for stages O4 onward (reports/releases that will be re-executed). For O3, archive only the **affected modules'** artifacts — unaffected module code and reports are preserved in place, not archived.
2. **O3**: invoke Builder only for affected modules (any number of modules is allowed)
3. **O4**: System Validation — **ALWAYS mandatory, never skippable**
4. **O5**: Security Audit — mandatory IF changes touch input handling, authentication, authorization, or dependencies. You decide; user can override.
5. **O6**: Debug — mandatory IF trigger was a bug report. Otherwise optional; you decide; user can override.
6. **O7**: Documentation — SKIP if no new APIs, config changes, or user-facing behavior changes. You decide; user can override.
7. **O8**: CI/CD — SKIP if CI/CD configuration is unchanged. You decide; user can override.
8. **O8.V**: CI Verification — mandatory if O8 was executed. Skip if O8 was skipped.
9. **O9**: Release — patch version bump (mandatory)
10. **O10**: Closure — in normal mode, standard user gate applies (user confirms closure or selects further iteration). In automode, O10 auto-proceeds to closure. Set `fast_track.active = false` upon closure.

### Skip tracking

For every skipped stage, record in `manifest.json` under `fast_track.skipped_stages`: stage id, justification, and `"orchestrator_decision"` or `"user_override"`.

### Safety net

- O4 is ALWAYS executed — no exceptions
- If O4 finds architectural conformance issues indicating architectural impact, Fast Track is **automatically cancelled**. Inform the user and switch to standard full-pipeline re-entry.
- If O4/O5/O6 find issues, R.7 correction loops apply normally (no shortcuts on corrections)

---

## B1 — Continuity Audit (Orchestrator Reference)

When a user requests to resume an existing project:

1. Check if `pipeline-state/manifest.json` exists
2. Resolve the working branch:
   - If the manifest contains the `branch` field → use that value.
   - If `branch` is absent (legacy manifest) → search existing git branches matching `pipeline/*` and identify the one corresponding to `project_name`. If exactly one match → use it and backfill the `branch` field in the manifest.
   - If no match or multiple candidates → ask the user to specify the branch.
   - Verify the resolved branch exists. If not, flag as inconsistency in the audit.
3. If yes: switch to the branch, set state to `B1_AUDITING`, invoke **Auditor** (`subagent_type: "auditor"`)
4. Auditor reads `manifest.json` (HEAD) and verifies declared artifacts exist on disk. Checks `schema_version` and `pipeline_version`. HISTORY is read only on escalation (if HEAD shows anomalies). Produces `docs/audit-report.md` with: artifact verification, pipeline state, interruption point, recommendation (resume, conformance upgrade, or adoption)
5. Run R.0 Entry Preflight before executing audit recommendation (resume/adoption transition). If preflight is `BLOCKED`, halt and request user intervention.
6. **User gate**: confirm audit result
7. If **resumable**: re-enter main flow at the identified point (orchestrator reconstructs context from manifest + artifacts + logs)
8. If **conformance upgrade**: update `pipeline_version` in manifest to `"4.2"`, execute targeted gap-filling actions from audit report (invoke agents for missing artifacts), then re-enter at the identified point
9. If **not resumable**: recommend adoption → transition to C-ADO1

**Key**: if manifest `current_state` ends with `_IN_PROGRESS`, the stage was interrupted — re-execute from scratch.

---

## C-ADO1 — Conformance Audit (Orchestrator Reference)

When adopting a non-conforming repository:

1. Set state to `C_ADO1_AUDITING`, invoke **Auditor** (`subagent_type: "auditor"`)
2. Auditor produces `docs/adoption-report.md` with: inventory, gap analysis, conformance plan, entry point. If `src/` exists, Auditor also generates `docs/codebase-digest.md` (preliminary digest — R.13)
3. Run R.0 Entry Preflight before plan execution. If preflight is `BLOCKED`, halt and request user intervention.
4. **User gate**: confirm adoption plan
5. Execute the conformance plan: invoke appropriate agents for each missing artifact, in order specified by the plan. If a preliminary digest was generated, include it as input for agents that operate on code.
6. Once complete: re-enter main flow at the identified point

**Entry points**: from C1 in adoption mode, from B1 when not resumable, or from STOPPED state on user request.
