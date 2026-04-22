---
name: pipeline-orchestrator-validation
description: "Orchestrator procedures for the validation and CI phase: O4-O6 dispatch with correction loop routing (R.7), O7-O8 dispatch, and O8.V CI verification loop. Load when entering validation phase (after O3)."
---

# Pipeline Orchestrator — Validation & CI Phase (O4-O8.V)

Load this skill after O3 completion (post-o3 checkpoint or O3_MODULES_GENERATED).

---

## Pre-dispatch Check

Before dispatching O4, verify `docs/codebase-digest.md` exists. If missing → invoke Builder to generate it first (R.13).

---

## O4 — System Validation

1. **Context reconstruction**: re-read `manifest.json`. Verify entry condition: `O3_MODULES_GENERATED`.
2. **Dispatch commit**: `[O4] [Orchestrator] Dispatching to Validator`
3. **Invoke Validator** (`subagent_type: "validator"`) with paths: `docs/codebase-digest.md`, `src/`, `tests/`, `docs/architecture.md`, `docs/interface-contracts.md`, `docs/test-strategy.md`, `docs/project-spec.md`, `docs/constraints.md`. If correction scope exists (R.7), include it. Include R.15 decision log instruction.
4. **On return**: stage completion commit. Executive summary.
5. **User gate**: (a) full correction → R.7; (b) selective correction → R.7; (c) proceed to O5.
6. **Automode**: always choose full correction if issues found.

---

## O5 — Security Audit

1. **Dispatch commit**: `[O5] [Orchestrator] Dispatching to Validator`
2. **Invoke Validator** with paths: `docs/codebase-digest.md`, `src/`, `docs/constraints.md`, `docs/architecture.md`, `docs/environment.md`, lockfile. If correction scope exists, include it. Include R.15 decision log instruction.
3. **On return**: stage completion commit. Executive summary.
4. **User gate**: (a) full correction → R.7; (b) selective → R.7; (c) proceed to O6.
5. **Automode**: always choose full correction if issues found.

---

## O6 — Debug and Smoke Test

1. **Dispatch commit**: `[O6] [Orchestrator] Dispatching to Debugger`
2. **Invoke Debugger** (`subagent_type: "debugger"`) with paths: `docs/codebase-digest.md`, `src/`, `docs/architecture.md`, `docs/environment.md`, `docs/validator-report.md`, `docs/test-strategy.md`, `docs/security-audit-report.md` (if exists). If correction scope exists, include it. Include R.15 decision log instruction.
3. **On return**: stage completion commit. Executive summary.
4. **User gate**: (a) full correction → R.7; (b) selective → R.7; (c) proceed to O7.
5. **Automode**: always choose full correction if issues found.

---

## R.7 — Correction Loops

When O4, O5, or O6 identifies issues and user chooses correction:

1. **Return to O3**: construct correction notes from originating stage findings → invoke Builder for affected modules only
2. **Digest regeneration**: after O3 corrections, invoke Builder to regenerate `docs/codebase-digest.md`
3. **Construct correction scope**:

   ```yaml
   correction_scope:
     corrected_modules: [<module-names>]
     changed_files: [<file-paths>]
     change_summary: "<brief description>"
     originating_stage: "<O4|O5|O6>"
   ```

4. **Re-execute from O4** sequentially through all stages until reaching the originating stage:
   - O4→O3 correction chain: O3 → O4
   - O5→O3 correction chain: O3 → O4 → O5
   - O6→O3 correction chain: O3 → O4 → O5 → O6
5. **No archival**: correction loops do NOT trigger R.5
6. **Commit format**: `[O3] [Builder] Module <name> corrected (correction from O4|O5|O6)`

---

## O7 — Documentation

1. **Dispatch commit**: `[O7] [Orchestrator] Dispatching to Builder`
2. **Invoke Builder** (`subagent_type: "builder"`) with paths: `docs/codebase-digest.md`, `src/`, `docs/project-spec.md`, `docs/architecture.md`, `docs/api.md`, `docs/configuration.md`, `docs/environment.md`. Include R.15 decision log instruction.
3. **On return**: stage completion commit. Executive summary. **Auto-proceed** to O8.

---

## O8 — CI/CD Configuration

1. **Dispatch commit**: `[O8] [Orchestrator] Dispatching to Builder`
2. **Invoke Builder** with paths: `docs/architecture.md`, `docs/test-strategy.md`, `docs/environment.md`, `docs/repository-structure.md`. Include R.15 decision log instruction.
3. **On return**: stage completion commit. Executive summary. **Auto-proceed** to O8.V.

---

## O8.V — CI Verification (Orchestrator-Executed)

### Hard precheck

1. Load skill `pipeline-orchestrator-preflight` and execute R.0 with O8.V scope
2. Verify explicitly: `gh` CLI available, `gh auth status` succeeds, `origin` remote exists and is reachable
3. If ANY check fails → BLOCKED → halt → request user intervention. **Automode does NOT bypass.**

### Execution flow

1. Set manifest: `current_state` → `O8V_IN_PROGRESS`. Commit: `[O8V] [Orchestrator] CI verification started`
2. Commit all pending changes and push to remote
3. Trigger CI: `gh workflow run <workflow-name>` (or equivalent)
4. Monitor: `gh run watch` until completion
5. Read result:
   - **PASS** → produce `docs/ci-verification-report.md` → commit → manifest → `O8V_CI_VERIFIED` → executive summary → **load `pipeline-orchestrator-finalization` skill** → proceed to O9
   - **FAIL** → collect raw log (`gh run view --log-failed`) → invoke Builder for fix (see below)

### CI failure correction loop

1. Pass to Builder (`subagent_type: "builder"`): raw CI failure log + `docs/cicd-configuration.md` + `docs/environment.md` + affected source files
2. Builder returns: `classification`, `root_cause`, `fix_applied`, `confidence`, `escalation_needed`, `files_modified`
3. Route based on response:
   - `classification: infrastructure` → wait and retry (no fix needed)
   - `escalation_needed: false` → commit fix (`[O8V] [Builder] CI fix: <description>`), push, re-trigger CI
   - `escalation_needed: true` → load `pipeline-orchestrator-advanced` skill for R.8 escalation
4. **Iteration limit**: 5 consecutive fix failures → escalate to user

---

## Reference: R.6 — Git Conventions

`[<stage-id>] [<agent-name>] <description>`

---

## Reference: R.9 — Progress Metrics

Executive summary: include "Stage X/Y" progress.

---

## Reference: ALWAYS Rules for This Phase

- ALWAYS include `docs/codebase-digest.md` path when invoking agents for O4, O5, O6, O7
- ALWAYS pass correction scope to validation agents during R.7 correction loops
- ALWAYS instruct dispatched agents to log genuine alternative choices to `docs/decision-log.md` (R.15)
- In automode: ALWAYS choose "full correction" when issues are found
