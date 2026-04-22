---
name: pipeline-orchestrator-startup
description: "Orchestrator procedures for pipeline startup: C1 initialization, R.0 entry preflight, R.1 standard interaction pattern, cognitive phase dispatch (C2-C9), C2 mandatory interactive loop, and cognitive-to-operational handoff with post-cognitive checkpoint. Load at pipeline start."
---

# Pipeline Orchestrator — Startup & Cognitive Phase

Load this skill when starting a new pipeline (C1), or when dispatching cognitive stages (C2-C9).

---

## R.0 — Entry Preflight (Mandatory)

Execute before first dispatch after C1, before B1, before C-ADO1, before R.5 re-entry, and before O8.V start.

**Steps:**

1. Verify `git` CLI available and repository writable
2. `git rev-parse --is-inside-work-tree` succeeds
3. `git status` succeeds
4. If O8.V is in path: verify `gh` CLI available, `gh auth status` valid, `origin` remote configured
5. If `docs/environment.md` exists (O1+): verify declared runtime/package manager CLIs are available
6. **LSP infrastructure check** (every session): invoke **Builder** (`subagent_type: "builder"`) with task: *"Verify and install all available OpenCode LSP language servers system-wide."* The Builder must execute:
   - **Auto-installable servers**: create temp files for each auto-install extension (`touch /tmp/lsp-check.sh /tmp/lsp-check.lua /tmp/lsp-check.yaml`), use `lsp` tool (`hover`) on each to trigger server download, then clean up temp files. Covers: astro, bash, clangd, lua, kotlin, php, svelte, terraform, tinymist, vue, yaml.
   - **Tool-dependent servers**: for each, check if the CLI exists — `go version` (gopls), `rustc --version` (rust-analyzer), `python3 --version` (pyright), `node --version` (typescript), `dart --version`, `swift --version`, `dotnet --version` (csharp/fsharp), `java -version` (jdtls), `ruby --version` (ruby-lsp), `zig version` (zls), `elixir --version` (elixir-ls), `gleam --version`, `clojure-lsp --version`, `haskell-language-server-wrapper --version` (hls), `ocamllsp --version`, `nixd --version`, `deno --version`. For each available CLI: install the LSP server if a package manager command exists (e.g. `go install golang.org/x/tools/gopls@latest`, `pip install pyright`, `npm i -g typescript typescript-language-server`). For unavailable CLIs: skip silently.
   - **Return**: structured summary — installed servers (name + version), skipped (name + reason), failures.

   Record the Builder's summary in `docs/runtime-preflight.md` under an `## LSP Servers` section. This runs once per session — do not repeat on subsequent stages.

**Outputs:** `docs/runtime-preflight.md` (snapshot), `logs/orchestrator-preflight-<N>.md` (detailed log)

**Decision:** PASS → continue | WARN → continue with warning in executive summary | BLOCKED → halt, request user intervention (not bypassable by automode)

---

## R.1 — Standard Interaction Pattern

Every stage follows this pattern. Execute each step explicitly — do not skip.

0. **Preflight** (conditional per R.0): if this is an entry flow or O8.V start, run Entry Preflight first.
1. **Context reconstruction**: re-read `pipeline-state/manifest.json` from disk. Consult the Stage Routing Table (in orchestrator.md) for the next stage's entry conditions and required input artifact paths. Do NOT load full artifact content.
2. **Dispatch commit**: update `manifest.json` → `current_state` = `<STAGE>_IN_PROGRESS`. Commit: `[<stage-id>] [Orchestrator] Dispatching to <agent-name>`
3. **Invocation**: invoke the subagent per Agent-to-Stage Mapping. Transmit: stage assignment, input artifact **paths** (not content), context brief (project name, state, 1-2 sentences), user feedback/correction notes. Include: *"If you make a choice between genuine alternatives, append it to `docs/decision-log.md` (R.15). Don't log obvious spec applications."*
4. **Agent work**: agent writes artifacts to disk, returns structured summary only. **>>> CRITICAL: after the Task tool returns, use ONLY the `<task_result>` content. Do NOT read artifact files produced by the subagent (e.g. `docs/*-report.md`). The structured summary contains all information needed for routing and executive summary. <<<** For C2: require `status` + `blocking_gaps` + `open_questions` + `assumptions` + `intent_version`.
5. **Stage completion commit** (atomic): update `manifest.json` (HEAD): set `current_state`, `progress`, upsert `latest_stages[<stage-id>]`. Append to `manifest-history.json` (HISTORY): add entry to `stages_completed`. Include: resulting state, timestamp, produced artifacts, commit hash, agent, progress metrics (R.9). Commit artifacts + manifest together: `[<stage-id>] [<agent-name>] <description>`. **C2 exception**: intermediate rounds keep `C2_IN_PROGRESS`, don't append `stages_completed` until user confirmation.
6. **Executive summary**: brief summary for user based on agent's returned summary. Reference full report on disk. **>>> Do NOT read full reports into context — this is a hard rule, not a suggestion. Doing so causes context overflow and step skipping. <<<**
7. **Checkpoint** (conditional): if at a compaction breakpoint, write the Pipeline Checkpoint block (see Checkpoint Format below). This is a **mandatory step, not optional**.
8. **User gate** (if required by Routing Table): await confirmation. C2 is a hard gate — NEVER auto-proceed even in automode.
9. **Revision** (if needed): repeat from step 2 with user's notes.

**For stages you execute directly** (C1, O9, O10): simplified variant:

1. Set `current_state` → `<STAGE>_IN_PROGRESS`, commit: `[<stage-id>] [Orchestrator] Stage started`
2. Execute stage work
3. Update manifest + commit results together: `[<stage-id>] [Orchestrator] <description>`
4. Executive summary → checkpoint (if applicable) → user gate → revision

---

## C1 — Initialization

C1 is NOT a pipeline stage — it is automatic infrastructure setup.

**Trigger**: new project request (no `manifest.json`), OR adoption request.

**Steps:**

1. Initialize Git repository (if needed)
2. Detect default branch: `git symbolic-ref --short HEAD` — record as `default_branch`
3. Create and switch to branch `pipeline/<project-name>` per R.6. If branch exists → STOP, ask user.
4. Create directories: `docs/`, `logs/`, `pipeline-state/`, `archive/`
5. Create `pipeline-state/manifest.json` (HEAD) with state `C1_INITIALIZED`, `branch` field, `default_branch` field
6. Create `pipeline-state/manifest-history.json` (HISTORY) with empty arrays
7. Create `logs/session-init-1.md`
8. Commit: `[C1] [Orchestrator] Pipeline initialized`

**Then:**

- **New project**: run R.0 Entry Preflight → dispatch C2
- **Adoption**: set manifest to `C_ADO1_AUDITING` → invoke Auditor (load `pipeline-orchestrator-advanced` skill for C-ADO1)

---

## C2 — Mandatory Interactive Clarification Loop

Treat C2 as a loop, not a single-pass stage:

1. Invoke Prompt Refiner. It returns: `NEEDS_CLARIFICATION`, `READY_FOR_CONFIRMATION`, or `FAILED`.
2. On `NEEDS_CLARIFICATION`: keep state `C2_IN_PROGRESS`, present numbered open questions to user, wait for manual answers.
3. On `READY_FOR_CONFIRMATION`: present final gate — user confirms or requests further clarification.
4. Exit condition: transition to `C2_INTENT_CLARIFIED` ONLY after explicit user confirmation and no unresolved blocking gaps.
5. **Automode does NOT bypass any C2 step.**

---

## Cognitive Phase Dispatch (C3-C9)

For each stage C3 through C9, follow R.1 exactly. Key reminders:

- **C5 skip**: if `project-spec.md` contains no external source references, skip C5 (set `C5_SKIPPED`), auto-proceed to C6.
- **C6 → C7**: auto-proceed (no user gate).
- **C8 → C7 revision**: if Validator returns INVALID, return to C7 with revision notes.
- **C9**: user gate to confirm implementation plan.

---

## Cognitive-to-Operational Handoff

Before proceeding from C9 to O1, perform integrity check:

1. All expected cognitive artifacts are present (excluding conditional ones marked as skipped)
2. Manifest reflects state `C9_IMPLEMENTATION_PLANNED`
3. No broken artifact references

If check fails → report missing/inconsistent artifacts → **halt** (require user intervention).

**After handoff verification, execute this checkpoint:**

### >>> MANDATORY: Write Pipeline Checkpoint [post-cognitive] <<<

Write this block EXACTLY in the conversation:

```text
## Pipeline Checkpoint [post-cognitive]
- **State**: <current_state from manifest>
- **Progress**: stage <X>/<Y>
- **Automode**: <true/false>
- **Fast Track**: <true/false>
- **Handoff verified**: <yes/no>
- **Modules generated**: 0
- **Completion state**: n/a
- **Re-entry path**: n/a
- **Archive reference**: n/a
- **Known issues**: <brief list or "none">
- **Active user instructions**: <verbatim or "none">
- **Next stage**: O1 → Builder
- **Required input artifacts**: <list of paths>
- **Pending gate**: <yes/no, details>
```

Then append: `Autonomous compaction is triggered at this checkpoint. If needed, /compact remains available as manual fallback.`

**After the checkpoint**: load the `pipeline-orchestrator-o3` skill for operational phase. Then dispatch O1 following R.1.

---

## Reference: R.6 Git Conventions (Compact)

- **Branch**: `pipeline/<project-name>`, created at C1 only
- **Commit format**: `[<stage-id>] [<agent-name>] <description>`
- **No force push**

## Reference: R.3 Traceability

- Every invocation → log in `logs/`
- **Log naming**: `logs/<agent>-<stage-id>-<description>-<N>.md`
- Manifest updated at every commit

## Reference: R.9 Progress Metrics

- Pipeline-level: `progress.current_stage`, `current_stage_index` (1-based), `total_stages`
- Executive summary: include progress (e.g., "Stage 5/19")
