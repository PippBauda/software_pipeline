---
name: pipeline-orchestrator-o3
description: "Orchestrator procedures for the operational build phase: O3 module loop management, O1/O2 dispatch, codebase digest generation (R.13), and post-O3 checkpoint. Load when entering the operational phase (after cognitive-to-operational handoff)."
---

# Pipeline Orchestrator — Operational Build Phase (O1-O3)

Load this skill after the cognitive-to-operational handoff (post-C9 checkpoint).

---

## O1/O2 — Dispatch to Builder

O1 (Environment Setup) and O2 (Repository Scaffold) are delegated to the Builder. Follow R.1 for each:

1. **Context reconstruction**: re-read `manifest.json`. Consult Stage Routing Table for entry conditions and input artifacts.
2. **Dispatch commit**: `[O1] [Orchestrator] Dispatching to Builder` / `[O2] [Orchestrator] Dispatching to Builder`
3. **Invoke Builder** (`subagent_type: "builder"`) with stage assignment + input artifact paths. Include R.15 decision log instruction.
4. **On return**: stage completion commit (atomic, artifacts + manifest). Executive summary. Both auto-proceed (no user gate).

---

## O3 — Module Loop Management

You manage the O3 iteration loop. The Builder is invoked once per module.

**Steps:**

1. Read `docs/task-graph.md` to determine module order and total count (N)
2. Set manifest: `current_state` → `O3_IN_PROGRESS`, `progress.modules_total` = N, `progress.modules_completed` = 0
3. Commit: `[O3] [Orchestrator] Module generation started (N modules planned)`
4. **For each module** (in dependency order from task-graph):
   - a. Set `progress.current_module` = `<module-name>`
   - b. Dispatch commit: `[O3] [Orchestrator] Dispatching Builder for module <module-name> (M/N)`
   - c. Invoke Builder (`subagent_type: "builder"`) with: module assignment (name, index M/N), **paths** to: `implementation-plan.md`, `module-map.md`, `task-graph.md`, `architecture.md`, `api.md`, `interface-contracts.md`, `test-strategy.md`, `environment.md`, list of previously committed module paths in `src/`. Include R.15 decision log instruction.
   - d. Builder implements code + tests, runs tests, writes per-module report, returns structured summary
   - e. Update manifest (`progress.modules_completed` += 1), commit artifacts + manifest: `[O3] [Builder] Module <module-name> implemented (M/N)`
   - f. Executive summary with progress: "Stage X/Y — Module M/N completed" (no user gate per module)
5. Invoke Builder for cumulative report (`logs/builder-cumulative-report-1.md`)
6. Invoke Builder for codebase digest generation (`docs/codebase-digest.md` — R.13). If `docs/decision-log.md` exists, instruct Builder to include summary line with total count and most recent stage.
7. Final commit: `[O3] [Orchestrator] All N modules completed`
8. Update manifest → `O3_MODULES_GENERATED`

**Error handling (per module):**

- **Normal mode**: notify user, await instructions (retry, skip, stop). On skip: check dependency graph and report downstream modules affected.
- **Automode**: automatic single retry with failure output as correction context. If retry also fails → escalate as R.8 Level 3 (pipeline halts). Load `pipeline-orchestrator-advanced` skill for R.8. **Never auto-skip failing modules.**

**Correction loops (R.7):** Invoke Builder only for affected modules. Unaffected modules retain existing code. After corrections: invoke Builder to regenerate `docs/codebase-digest.md` (R.13), then construct correction scope for downstream validation agents.

---

### >>> MANDATORY: Write Pipeline Checkpoint [post-o3] (if >5 modules) <<<

After step 8 above, if more than 5 modules were generated, write this block EXACTLY:

```text
## Pipeline Checkpoint [post-o3]
- **State**: O3_MODULES_GENERATED
- **Progress**: stage <X>/<Y> | modules <N>/<N>
- **Automode**: <true/false>
- **Fast Track**: <true/false>
- **Handoff verified**: yes
- **Modules generated**: <N>
- **Completion state**: n/a
- **Re-entry path**: n/a
- **Archive reference**: n/a
- **Known issues**: <brief list or "none">
- **Active user instructions**: <verbatim or "none">
- **Next stage**: O4 → Validator
- **Required input artifacts**: docs/codebase-digest.md, src/, tests/, docs/architecture.md, docs/interface-contracts.md, docs/test-strategy.md, docs/project-spec.md, docs/constraints.md
- **Pending gate**: no (auto-proceed to O4)
```

Then append: `Autonomous compaction is triggered at this checkpoint. If needed, /compact remains available as manual fallback.`

**After the checkpoint** (or after step 8 if <=5 modules): load the `pipeline-orchestrator-validation` skill, then dispatch O4 following R.1.

---

## Reference: R.13 — Codebase Digest

- `docs/codebase-digest.md` MUST exist before dispatching O4+ stages
- If missing, invoke Builder to generate it first
- On correction loops: regenerate after corrections
- Correction scope format:

```yaml
correction_scope:
  corrected_modules: [<module-names>]
  changed_files: [<file-paths>]
  change_summary: "<brief description>"
  originating_stage: "<O4|O5|O6>"
```

## Reference: R.6 Commit Format

`[<stage-id>] [<agent-name>] <description>`

## Reference: R.9 Progress Metrics

- Pipeline: `progress.current_stage`, `current_stage_index`, `total_stages`
- O3 sub-progress: `modules_completed`, `modules_total`, `current_module`
- Executive summary: "Stage X/Y — Module M/N completed"
