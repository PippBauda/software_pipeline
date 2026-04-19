# Changelog

All notable changes to the Software Pipeline specification and tooling.

## [4.1] — 2026-04-19

Comprehensive quality pass across the formal specification, all agent definitions (both platforms), and supporting documentation.

### Phase 1 — Formal Specification (`pipeline_4.1.md`)

- **1.1** Fixed version-rule numbering: renumbered V.6 to V.5 (was skipped).
- **1.2** Created the Stage Routing Table referenced by R.1 and R.CONTEXT — a formal lookup table listing every stage's agent, entry state(s), required input artifact paths, and resulting state.
- **1.3** Added Builder + O8.V to the Builder row in the agent table.
- **1.4** Added conversation log as an output artifact to cognitive stages C6, C7, C8, C9.
- **1.5** Added conversation log as an output artifact to operational stages O1, O2, O4, O5, O6, O7, O8.
- **1.6** Added error handling for O1 (Environment Setup).
- **1.7** Added error handling for O2 (Repository Scaffold).
- **1.8** Added optional user gate for O7 (Documentation Generation) — auto-proceeds in automode.
- **1.9** Added optional user gate for O8 (CI/CD Configuration) — auto-proceeds in automode.
- **1.10** Added note to C6/C7 for revisiting artifacts when C8 revision notes require it.
- **1.11** Defined "same root cause" criterion for the O8.V anti-loop guard.

### Phase 2 — Agent Definitions: OpenCode (`opencode/agents/`)

All seven OpenCode agent files were enriched with:

- Explicit validation criteria for every output artifact.
- Revision cycle definitions where applicable.
- Expanded format with bold sub-bullet headers for readability.
- Error handling and escalation procedures.
- "Stay in your lane" constraint — agents must not perform actions belonging to other agents or the orchestrator.

Affected files: `auditor.md`, `builder.md`, `validator.md`, `debugger.md`, `prompt-refiner.md`, `architect.md`, `analyst.md`.

Additional targeted fixes:
- `builder.md`: removed "commit executed" from O2 validation criteria (commit is orchestrator responsibility per R.1).
- `builder.md`: enriched O8.V section with artifact list and revision-cycle note (backported from Copilot).
- `validator.md`: expanded C8 to full sub-bullet format.
- `debugger.md`: restored Purpose line accidentally removed during initial enrichment.

### Phase 3 — Agent Definitions: Copilot (`copilot/agents/`)

All eight Copilot agent files were realigned to match the updated OpenCode definitions (source of truth).

Key changes:
- **orchestrator.agent.md**: updated V.5 numbering, B1/C-ADO1 procedure descriptions, O3 commit convention, system state list.
- **builder.agent.md**: removed "commit executed" from O2, reordered sections (Code Quality Standards before Return Protocol), added O8.V content, added bold headers to O1 execution steps, added explicit report filename to O3 execution steps.
- **prompt-refiner.agent.md**: added C2 validation criterion.
- **validator.agent.md**: aligned Report Quality Standards wording.
- **architect.agent.md**: aligned Output Quality Standards wording (arrow format, removed "must be"/"should be").
- **auditor.agent.md**: removed Outcome B1 and Plan execution/Transition C-ADO1 sections (described orchestrator behavior, not auditor), aligned capitalization and Identity wording.
- Five agents received "stay in your lane" constraint: `builder.agent.md`, `validator.agent.md`, `debugger.agent.md`, `architect.agent.md`, `analyst.agent.md`.

### Phase 4 — Documentation

- **pipeline_description.md**: fixed User Gates section — removed false claim that user gates are centralized in the Stage Routing Table (they are defined in each stage's dedicated section), added O7/O8 optional gates to the examples list.
- **README.md**: fixed Pipeline Stages table — O8.V agent changed from "Orchestrator" to "Orchestrator + Builder". Fixed Agents table — Builder stages changed from "(O1-O3, O7, O8)" to "(O1-O3, O7, O8, O8.V fixes)".

### Phase 5 — Plugin (`opencode/plugins/pipeline-compaction-controller.js`)

Full code review completed. No bugs or functional issues found. No changes made.
