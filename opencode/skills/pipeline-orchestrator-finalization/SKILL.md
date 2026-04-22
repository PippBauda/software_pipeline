---
name: pipeline-orchestrator-finalization
description: "Orchestrator procedures for pipeline finalization: O9 release preparation (version determination, NO tag creation), O10 closure (final report, merge, tag, branch cleanup, re-entry guide), and post-O10 checkpoint. Load when entering finalization phase (after O8.V)."
---

# Pipeline Orchestrator — Finalization Phase (O9-O10)

Load this skill after O8.V CI verification passes.

---

## O9 — Release Preparation (Orchestrator-Executed)

**You execute O9 directly. Follow every step.**

1. Set manifest: `current_state` → `O9_IN_PROGRESS`. Commit: `[O9] [Orchestrator] Stage started`
2. Read existing tags: `git tag --list 'v*'` to determine version baseline
3. **Determine version** per these rules:
   - First release (no tags): `v1.0.0`
   - Re-entry from COMPLETED at cognitive stage (C2-C9): minor bump
   - Re-entry from COMPLETED at operational stage (O1-O9): patch bump
   - Fast Track (R.12): patch bump
4. **>>> DO NOT CREATE A GIT TAG <<<** — O10 creates the tag after merge to default branch
5. Produce `CHANGELOG.md` — complete changelog for determined version
6. Produce `docs/release-notes.md` — include determined version number
7. Record version in `manifest.json` → `latest_stages[O9].version`
8. **Validate**: version follows semver, changelog is complete, release notes consistent with changelog
9. Commit artifacts + manifest: `[O9] [Orchestrator] Release v<X.Y.Z> prepared`
10. Executive summary: show determined version to user
11. **User gate**: confirm release. User may override version number.
12. **Resulting state**: `O9_RELEASED`

---

## O10 — Closure and Final Report (Orchestrator-Executed)

**You execute O10 directly. Follow every step — do not skip any.**

### Step 1: Stage start
- Set manifest: `current_state` → `O10_IN_PROGRESS`. Commit: `[O10] [Orchestrator] Stage started`

### Step 2: Pre-report tasks
- If `docs/decision-log.md` exists → compact it per R.15 rules (merge superseded entries, remove transient, target ~15-25 permanent entries)

### Step 3: Validation
- Verify every artifact declared in manifest `latest_stages` is present on disk
- Verify no untracked pipeline files outside manifest
- Verify manifest has final state + timestamp

### Step 4: Produce final report
- Write `docs/final-report.md` — consolidate pipeline state, summary of all stages, final status

### Step 5: Update manifest
- Set `current_state` → `COMPLETED`, add final timestamp
- Commit artifacts + manifest: `[O10] [Orchestrator] Pipeline completed`

### Step 6: User gate
Present options to user:

- **(a) Iteration**: re-enter pipeline at a specific point (C2-O9)
  - Load `pipeline-orchestrator-advanced` skill for R.5 + R.10
  - Present Re-Entry Guide (R.10) to user
  - Execute R.5 re-entry protocol

- **(b) Closure**: execute the full closure sequence (Step 7 below)

**Automode behavior**: auto-proceed to Closure (option b). Execute full closure sequence automatically.

### Step 7: Closure Sequence (execute ALL sub-steps in order)

7a. **Merge**: merge `pipeline/<project-name>` to the default branch (`manifest.json` → `default_branch`)
   ```
   git checkout <default_branch>
   git merge pipeline/<project-name>
   ```

7b. **Tag**: create Git tag on the merge result with version from O9 (`latest_stages[O9].version`)
   ```
   git tag v<X.Y.Z>
   ```
   **This is the ONLY place in the entire pipeline where a Git tag is created.**

7c. **Branch cleanup**:
   - **Normal mode**: ask user to confirm or decline deletion of `pipeline/<project-name>`
   - **Automode**: delete branch automatically
   ```
   git branch -d pipeline/<project-name>
   ```

### Step 8: Post-closure executive summary

Include in summary:
- Final project status
- Version released
- Merge target branch
- Tag created
- Branch status (deleted or retained)

### >>> MANDATORY: Write Pipeline Checkpoint [post-o10] <<<

Write this block EXACTLY in the conversation:

```
## Pipeline Checkpoint [post-o10]
- **State**: COMPLETED
- **Progress**: stage <Y>/<Y>
- **Automode**: <true/false>
- **Fast Track**: <true/false>
- **Handoff verified**: yes
- **Modules generated**: <N>
- **Completion state**: COMPLETED
- **Re-entry path**: n/a
- **Archive reference**: n/a
- **Known issues**: <brief list or "none">
- **Active user instructions**: <verbatim or "none">
- **Next stage**: n/a (pipeline complete)
- **Required input artifacts**: n/a
- **Pending gate**: no
```

Then append: `Autonomous compaction is triggered at this checkpoint. If needed, /compact remains available as manual fallback.`

### Step 9: Re-Entry Guide (ALWAYS present after closure)

**In both normal mode and automode**, after the checkpoint, present the Re-Entry Guide so the user knows their options for future work on this project. Load `pipeline-orchestrator-advanced` skill and present R.10 table:

> To make further changes to this project, you can re-enter the pipeline. Use one of these recommended entry points:
>
> | Scenario | Re-Entry | Agent |
> |----------|----------|-------|
> | New feature (ambiguous) | C2 | Prompt Refiner |
> | New feature (clear spec) | C3/C4 | Prompt Refiner |
> | Architecture redesign | C7 | Architect |
> | Bug fix (diagnosis needed) | O6 | Debugger |
> | Bug fix (known cause) | O3 | Builder |
> | Security vulnerability | O5 | Validator |
> | Documentation update | O7 | Builder |
> | CI/CD reconfiguration | O8 | Builder |
> | New release version | O9 | Orchestrator |

**Resulting state**: `COMPLETED`

---

## Reference: R.6 Git Conventions

- **Commit format**: `[<stage-id>] [<agent-name>] <description>`
- **Tags**: created ONLY by O10 after merge to default branch
- **Merge**: O10 merges to default branch, then tags
- **No force push**

## Reference: R.15 Decision Log Compaction

At O10 (before final report): compact `docs/decision-log.md` — merge superseded entries, remove transient decisions, retain permanent choices. Target: ~15-25 permanent entries.
