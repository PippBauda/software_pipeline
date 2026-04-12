# Software Development Pipeline v4.1

A formal, multi-agent software development pipeline that transforms ambiguous ideas into working, tested, secure, documented, and releasable software. The pipeline is driven by AI agents coordinated by an Orchestrator, with full traceability via Git and a structured manifest.

## Overview

The pipeline has two macro-phases:

1. **Cognitive Pipeline** (C2-C9) — progressive refinement from idea to validated implementation plan
2. **Operational Pipeline** (O1-O10) — execution of the plan into working software

Plus two auxiliary flows: **B1** (Resume) and **C-ADO1** (Adoption) for existing projects.

### Pipeline Stages

| Stage | Agent | Purpose |
|-------|-------|---------|
| C1 | Orchestrator | Infrastructure setup (automatic) |
| C2 | Prompt Refiner | Intent clarification |
| C3 | Prompt Refiner | Problem formalization |
| C4 | Prompt Refiner | Requirements extraction |
| C5 | Analyst | External source analysis (conditional) |
| C6 | Architect | Constraint analysis & domain modeling |
| C7 | Architect | Architecture synthesis |
| C8 | Validator | Architecture validation |
| C9 | Architect | Implementation planning |
| O1 | Builder | Environment setup |
| O2 | Builder | Repository scaffold |
| O3 | Builder (xN) | Module code generation (per-module loop) |
| O4 | Validator | System validation |
| O5 | Validator | Security audit |
| O6 | Debugger | Runtime debugging & smoke tests |
| O7 | Builder | Documentation generation |
| O8 | Builder | CI/CD configuration |
| O8.V | Orchestrator | CI verification loop |
| O9 | Orchestrator | Release & deployment |
| O10 | Orchestrator | Closure & final report |

### Agents

| Agent | Role |
|-------|------|
| **Orchestrator** | Coordinates all stages, manages manifest, handles Git commits |
| **Prompt Refiner** | Requirements engineering specialist (C2-C4) |
| **Analyst** | External code source analysis (C5) |
| **Architect** | System design, APIs, implementation planning (C6, C7, C9) |
| **Validator** | Architecture validation, system validation, security audit (C8, O4, O5) |
| **Builder** | Implementation: environment, scaffold, code, docs, CI/CD (O1-O3, O7, O8) |
| **Debugger** | Runtime debugging and smoke testing (O6) |
| **Auditor** | Continuity and conformance audits (B1, C-ADO1) |

## Repository Structure

```
software_pipeline/
├── .config/opencode/           # OpenCode platform files
│   ├── agents/                 # Agent definitions (8 agents)
│   │   ├── orchestrator.md     # Primary agent (520 lines)
│   │   ├── builder.md          # Subagent (130 lines)
│   │   ├── architect.md        # Subagent (98 lines)
│   │   ├── validator.md        # Subagent (103 lines)
│   │   ├── auditor.md          # Subagent (129 lines)
│   │   ├── debugger.md         # Subagent (73 lines)
│   │   ├── analyst.md          # Subagent (79 lines)
│   │   └── prompt-refiner.md   # Subagent (97 lines)
│   ├── skills/
│   │   └── pipeline-orchestrator-advanced/
│   │       └── SKILL.md        # Tier 2 rules (161 lines)
│   ├── plugins/
│   │   └── pipeline-compaction-controller.js  # Optional autonomous compaction trigger
│   ├── compaction-prompt.txt   # Externalized compaction prompt
│   └── opencode.json           # Global config (compaction settings)
│
├── .copilot/agents/            # GitHub Copilot platform files
│   ├── orchestrator.agent.md   # (607 lines — includes Tier 2 inline)
│   ├── builder.agent.md        # (210 lines)
│   ├── architect.agent.md      # (146 lines)
│   ├── validator.agent.md      # (132 lines)
│   ├── auditor.agent.md        # (155 lines)
│   ├── debugger.agent.md       # (80 lines)
│   ├── analyst.agent.md        # (74 lines)
│   └── prompt-refiner.agent.md # (121 lines)
│
├── pipeline_4.1.md             # Formal pipeline definition (1233 lines)
├── pipeline_description.md     # Human-readable pipeline description (204 lines)
└── README.md                   # This file
```

## Supported Platforms

The pipeline is implemented for two AI coding platforms:

### OpenCode (primary)

- **Agent location**: `~/.config/opencode/agents/`
- **Skills**: `~/.config/opencode/skills/`
- **Config**: `~/.config/opencode/opencode.json`
- **Architecture**: 2-tier rule system
  - **Tier 1** (inline in `orchestrator.md`): core rules always available (R.1-R.4, R.6, R.7, R.9, R.CONTEXT, State Machine, Manifest Schema)
  - **Tier 2** (on-demand skill `pipeline-orchestrator-advanced`): advanced features loaded only when needed (R.5, R.8, R.10, R.11, R.12, B1/C-ADO1)
- **Subagent invocation**: via `Task` tool with `subagent_type` parameter
- **Model**: `github-copilot/claude-opus-4.6`

### GitHub Copilot (secondary)

- **Agent location**: project-level `.copilot/agents/` (copied into each target project)
- **Architecture**: all rules inline (Copilot has no skill system)
- **Subagent invocation**: via `@agent-name` mentions
- **Model**: `Claude Opus 4.6 (copilot)`

## Deployment

### OpenCode

Copy (or symlink) the config files from this repo to the system-wide OpenCode config directory:

```bash
# Agents
cp .config/opencode/agents/*.md ~/.config/opencode/agents/

# Skill
mkdir -p ~/.config/opencode/skills/pipeline-orchestrator-advanced/
cp .config/opencode/skills/pipeline-orchestrator-advanced/SKILL.md \
   ~/.config/opencode/skills/pipeline-orchestrator-advanced/

# Required plugin for autonomous compaction at pipeline checkpoints
mkdir -p ~/.config/opencode/plugins/
cp .config/opencode/plugins/pipeline-compaction-controller.js \
   ~/.config/opencode/plugins/

# Compaction prompt file referenced by opencode.json
cp .config/opencode/compaction-prompt.txt ~/.config/opencode/compaction-prompt.txt

# Global config (compaction settings)
cp .config/opencode/opencode.json ~/.config/opencode/opencode.json
```

After deployment, agents are available globally in all OpenCode sessions.

### GitHub Copilot

Copy the Copilot agent files into the target project's root:

```bash
# From the target project root
mkdir -p .copilot/agents/
cp /path/to/software_pipeline/.copilot/agents/*.agent.md .copilot/agents/
```

This must be done per-project. Copilot agents are project-scoped.

## Usage

In an OpenCode session, the Orchestrator is the primary agent. Start a pipeline by describing your project idea:

```
I want to build a web application that...
```

The Orchestrator will:
1. Initialize the pipeline infrastructure (C1)
2. Guide you through requirements refinement (C2-C4)
3. Design the architecture (C6-C8)
4. Plan implementation (C9)
5. Build, test, validate, and release the software (O1-O10)

At each **user gate**, the pipeline pauses for your confirmation before proceeding.

### Key Commands

- **Start new project**: describe your idea
- **Resume existing project**: `resume` (triggers B1 audit)
- **Adopt existing codebase**: `adopt` (triggers C-ADO1 audit)
- **Automode**: `automode on` / `automode off` — bypasses user gates with automatic "fix everything" policy
- **Stop**: `stop` at any time to halt the pipeline

### Autonomous Compaction

OpenCode deployments are expected to include `~/.config/opencode/plugins/pipeline-compaction-controller.js` so compaction is triggered automatically right after `Pipeline Checkpoint` emission at the defined breakpoints.

Environment knobs (optional):

- `OPENCODE_PIPELINE_COMPACTION_DRY_RUN=1` — detect checkpoints but do not call compaction (logs only)
- `OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS=120000` — minimum time between autonomous compactions per session

### Startup Health Check

At session startup, the plugin runs a health check and emits diagnostic logs via `app.log`.

Expected startup signals:

- `Startup check: plugin ready` (level `info`) — plugin loaded, `session.summarize` available
- `Startup check: session.summarize unavailable` (level `warn`) — plugin loaded but cannot trigger compaction API
- `Startup check: invalid OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS...` (level `warn`) — invalid cooldown env value; fallback to `120000`

What is validated:

- dry-run state
- effective cooldown
- tracked checkpoint IDs
- availability of `session.summarize` and `app.log`

How to use it:

1. Start OpenCode with desired env vars (or none).
2. Verify startup diagnostic log appears once per session.
3. Emit a checkpoint (`## Pipeline Checkpoint [...]`) and confirm behavior:
   - normal mode: compaction runs automatically
   - dry-run mode: only diagnostic log, no compaction

Example (dry-run):

```bash
export OPENCODE_PIPELINE_COMPACTION_DRY_RUN=1
opencode
```

### Troubleshooting (Plugin)

- Plugin not triggering:
  - Verify deployment path: `~/.config/opencode/plugins/pipeline-compaction-controller.js`
  - Restart OpenCode after copying plugin/config files
  - Ensure the orchestrator actually emits `## Pipeline Checkpoint [post-cognitive|post-o3|post-o10|post-reentry]`
- Compaction too frequent:
  - Increase cooldown: `export OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS=180000`
- Want safe validation first:
  - Enable dry-run mode: `export OPENCODE_PIPELINE_COMPACTION_DRY_RUN=1`
- Compaction quality looks wrong:
  - Verify `~/.config/opencode/compaction-prompt.txt` exists and `opencode.json` uses `"prompt": "{file:compaction-prompt.txt}"`

## Key Design Principles

- **Git as source of truth** — every stage transition produces a commit
- **Stateless agents** — context reconstructed from disk artifacts at each invocation
- **Manifest-driven state** — `pipeline-state/manifest.json` tracks all progress
- **Split manifest** — HEAD (small, read every transition) + HISTORY (append-only log, read only for audits)
- **Context economy** — artifacts flow via disk, agents return summaries only
- **Correction loops** — validation stages (O4/O5/O6) can send code back for fixes without full re-entry
- **Re-entry protocol** — return to any previous stage from a completed pipeline, with archival

## Pipeline Definition

- `pipeline_4.1.md` — the complete formal specification (1233 lines), serves as the canonical reference
- `pipeline_description.md` — a concise human-readable overview (204 lines)

## Version

**Pipeline**: v4.1  
**Manifest schema**: 4.1
