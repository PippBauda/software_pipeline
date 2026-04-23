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
4. **CRITICAL: DO NOT create a Git tag here — O10 creates the tag after merge.**
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

1. **Stage start**: Set manifest: `current_state` → `O10_IN_PROGRESS`. Commit: `[O10] [Orchestrator] Stage started`
2. **Pre-report tasks**: If `docs/decision-log.md` exists → compact it per R.15 rules (merge superseded entries, remove transient, target ~15-25 permanent entries)
3. **Validation**:
   - Verify every artifact declared in manifest `latest_stages` is present on disk
   - Verify no untracked pipeline files outside manifest
   - Verify manifest has final state + timestamp
4. **Produce final report**: Write `docs/final-report.md` — consolidate pipeline state, summary of all stages, final status
5. **Update manifest**:
   - Set `current_state` → `COMPLETED`, add final timestamp
   - Commit artifacts + manifest: `[O10] [Orchestrator] Pipeline completed`
6. **User gate**: Present options to user:
   - **(a) Iteration**: re-enter pipeline at a specific point (C2-O9)
     - Load `pipeline-orchestrator-advanced` skill for R.5 + R.10
     - Present Re-Entry Guide (R.10) to user
     - Execute R.5 re-entry protocol
   - **(b) Closure**: execute the full closure sequence (step 7 below)

   **Automode behavior**: auto-proceed to Closure (option b). Execute full closure sequence automatically.

7. **Closure Sequence** (execute ALL sub-steps in order):

   **a.** **Merge**: merge `pipeline/<project-name>` to the default branch (`manifest.json` → `default_branch`)

   ```bash
   git checkout <default_branch>
   git merge pipeline/<project-name>
   ```

   **b.** **Tag**: create Git tag on the merge result with version from O9 (`latest_stages[O9].version`)

   ```bash
   git tag v<X.Y.Z>
   ```

   **This is the ONLY place in the entire pipeline where a Git tag is created.**

   **c.** **Push merge + tag to remote**:

   ```bash
   git push origin <default_branch>
   git push origin v<X.Y.Z>
   ```

   **d.** **CI verification post-merge** (mandatory):

   1. Monitor CI on the default branch: `gh run watch` (or `gh run list --branch <default_branch> --limit 1` + poll)
   2. Wait for completion
   3. **PASS** → proceed to **e.**
   4. **FAIL** → **HALT**. Present failure to user with options:
      - (a) Investigate: show `gh run view --log-failed`, attempt fix on default branch
      - (b) Revert merge: `git revert HEAD` + `git push` + delete tag `git push origin :refs/tags/v<X.Y.Z>` + `git tag -d v<X.Y.Z>`
      - **Automode**: choose (a) — attempt one fix cycle, if still failing → halt and escalate to user

   **e.** **Branch cleanup**:

   - **Normal mode**: ask user to confirm or decline deletion of `pipeline/<project-name>`
   - **Automode**: delete branch automatically

   ```bash
   git branch -d pipeline/<project-name>
   git push origin --delete pipeline/<project-name>
   ```

8. **Post-closure executive summary**: Include in summary:
   - Final project status
   - Version released
   - Merge target branch
   - Tag created
   - Remote push status (merge + tag)
   - CI status on default branch (pass/fail)
   - Branch status (deleted or retained, local + remote)

   **CRITICAL: Write Pipeline Checkpoint [post-o10]**

   Write this block EXACTLY in the conversation:

   ```text
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

   **Then proceed IMMEDIATELY to step 9 (Re-Entry Guide) — do NOT end the conversation without it.**

9. **CRITICAL: Re-Entry Guide (MANDATORY — NEVER skip)**: After the checkpoint, you MUST present the Re-Entry Guide to the user. This applies in BOTH normal mode and automode — no exceptions. Load `pipeline-orchestrator-advanced` skill and present R.10 table:

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

## Reference: R.6 — Git Conventions

- **Commit format**: `[<stage-id>] [<agent-name>] <description>`
- **Tags**: created ONLY by O10 after merge to default branch
- **Merge**: O10 merges to default branch, then tags, then pushes both
- **Push**: O10 pushes merge + tag to remote, verifies CI passes
- **No force push**

---

## Reference: R.15 — Decision Log

At O10 (before final report): compact `docs/decision-log.md` — merge superseded entries, remove transient decisions, retain permanent choices. Target: ~15-25 permanent entries.
