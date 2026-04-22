# Software Development Pipeline v4.2

A formal, multi-agent software development pipeline that transforms ambiguous ideas into working, tested, secure, documented, and releasable software. The pipeline is driven by AI agents coordinated by an Orchestrator, with full traceability via Git and a structured manifest.

## Quick Start

1. **Install** — run `./install.sh` and follow the prompts (two steps for OpenCode):

   ```bash
   # Step 1: agents, skills, plugins (global — safe for all workspaces)
   ./install.sh --platform opencode --scope global

   # Step 2: activate compaction in your project
   ./install.sh --platform opencode --scope workspace --target /path/to/project
   ```

2. **Open** — start an OpenCode (or Copilot Chat) session in any project directory.

3. **Describe** — tell the Orchestrator what you want to build:

   ```text
   I want to build a REST API that manages a to-do list with user authentication.
   ```

4. The pipeline starts automatically. The Orchestrator guides you through requirements,
   architecture, code generation, testing, and release. At each step it will ask for
   your confirmation before proceeding.

> **Tip**: after requirements are confirmed (stage C4), type `automode on` to let the
> pipeline run fully autonomously through build, test, security audit, and release.

No prior technical knowledge is required — the agents handle the implementation.

## Prerequisites

### For running the pipeline (end users)

| Requirement | Notes |
|-------------|-------|
| [OpenCode](https://opencode.ai) or [GitHub Copilot](https://github.com/features/copilot) | The AI platform the agents run on |
| [Git](https://git-scm.com) | Required for all pipeline operations |
| [GitHub CLI (`gh`)](https://cli.github.com) | **Required for CI verification (O8.V).** Must be installed and authenticated (`gh auth login`). See note below. |

> **GitHub CLI note**: `gh` is used in stage O8.V to push to GitHub, trigger workflows,
> and monitor CI runs. This makes O8.V **GitHub-specific**. If your repository is hosted
> on GitLab, Bitbucket, or another platform, O8.V will be blocked at the preflight check.
> In that case, you can either: (a) mirror the repository to GitHub for CI verification,
> or (b) skip O8.V and configure CI manually, proceeding directly from O8 to O9.

### For LSP-enhanced code analysis (optional but recommended)

The pipeline agents can use Language Server Protocol (LSP) tools for richer code navigation
(symbol lookup, go-to-definition, find-references). This improves the quality of validation,
security audit, and debug stages.

To activate LSP in OpenCode: open **Settings → Experimental → LSP** and enable it for the
language(s) used in your project. No configuration is needed beyond toggling the setting.
LSP is optional — agents fall back to text-based navigation when it is unavailable.

### For contributing / developing the pipeline itself

- Node.js >= 20 (see `engines` in `.tooling/package.json`)

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
| O8.V | Orchestrator + Builder | CI verification loop |
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
| **Builder** | Implementation: environment, scaffold, code, docs, CI/CD (O1-O3, O7, O8, O8.V fixes) |
| **Debugger** | Runtime debugging and smoke testing (O6) |
| **Auditor** | Continuity and conformance audits (B1, C-ADO1) |

## Repository Structure

```text
software_pipeline/
├── opencode/                   # OpenCode platform files (deployment source)
│   ├── agents/                 # Agent definitions (8 agents)
│   │   ├── orchestrator.md     # Primary agent
│   │   ├── builder.md          # Subagent
│   │   ├── architect.md        # Subagent
│   │   ├── validator.md        # Subagent
│   │   ├── auditor.md          # Subagent
│   │   ├── debugger.md         # Subagent
│   │   ├── analyst.md          # Subagent
│   │   └── prompt-refiner.md   # Subagent
│   ├── skills/
│   │   ├── pipeline-orchestrator-startup/
│   │   │   └── SKILL.md        # C1, R.0, R.1, cognitive dispatch, handoff
│   │   ├── pipeline-orchestrator-o3/
│   │   │   └── SKILL.md        # O1-O3 module loop, R.13 digest
│   │   ├── pipeline-orchestrator-validation/
│   │   │   └── SKILL.md        # O4-O8.V, R.7 correction loops
│   │   ├── pipeline-orchestrator-finalization/
│   │   │   └── SKILL.md        # O9, O10 closure sequence
│   │   └── pipeline-orchestrator-advanced/
│   │       └── SKILL.md        # R.5, R.8, R.10, R.11, R.12, B1/C-ADO1
│   ├── plugins/
│   │   └── pipeline-compaction-controller.js  # Required autonomous compaction trigger
│   ├── compaction-prompt.txt   # Pipeline-aware compaction rules (workspace-local)
│   ├── opencode-global.json    # Global config (no compaction override)
│   └── opencode-workspace.json # Workspace config (compaction prompt reference)
│
├── copilot/                    # GitHub Copilot platform files (deployment source)
│   └── agents/
│       ├── orchestrator.agent.md   # (includes Tier 2 inline)
│       ├── builder.agent.md
│       ├── architect.agent.md
│       ├── validator.agent.md
│       ├── auditor.agent.md
│       ├── debugger.agent.md
│       ├── analyst.agent.md
│       └── prompt-refiner.agent.md
│
├── pipeline_4.2.md             # Formal pipeline definition
├── pipeline_description.md     # Human-readable pipeline description
└── README.md                   # This file
```

> **Note**: The `opencode/` and `copilot/` folders are **not** dot-prefixed so they are not auto-detected by the respective tools. This is intentional — this repo is the pipeline definition source, not a pipeline project. See [Deployment](#deployment) for how to install them.

## Supported Platforms

The pipeline is implemented for two AI coding platforms:

### OpenCode (primary)

- **Architecture**: modular skill-based system
  - **Core** (inline in `orchestrator.md`): lean routing layer — identity, constraints, agent mapping, stage routing table, state machine, manifest schema, skill trigger table
  - **Phase skills** (loaded on-demand): `pipeline-orchestrator-startup` (C1-C9), `pipeline-orchestrator-o3` (O1-O3), `pipeline-orchestrator-validation` (O4-O8.V), `pipeline-orchestrator-finalization` (O9-O10)
  - **Advanced skill** (loaded on-demand): `pipeline-orchestrator-advanced` (R.5, R.8, R.10, R.11, R.12, B1/C-ADO1)
- **Subagent invocation**: via `Task` tool with `subagent_type` parameter
- **Model**: `github-copilot/claude-opus-4.6`

### GitHub Copilot (secondary)

- **Architecture**: all rules inline (Copilot has no skill system)
- **Subagent invocation**: via `@agent-name` mentions
- **Model**: `Claude Opus 4.6 (copilot)`

## Deployment

The pipeline uses a **two-step deployment model** for OpenCode:

1. **Global install** — agents, skills, and plugins to `~/.config/opencode/`. Safe for all workspaces; does not alter compaction behavior.
2. **Workspace activation** — compaction prompt override to a specific project root. Only affects that workspace.

### OpenCode

#### Step 1: Global deployment

Copy agents, skills, and plugins to the system-wide OpenCode config directory (`~/.config/opencode/`):

```bash
# Agents
cp opencode/agents/*.md ~/.config/opencode/agents/

# Skills
for skill in pipeline-orchestrator-advanced pipeline-orchestrator-startup \
  pipeline-orchestrator-o3 pipeline-orchestrator-validation \
  pipeline-orchestrator-finalization; do
  mkdir -p ~/.config/opencode/skills/$skill/
  cp opencode/skills/$skill/SKILL.md ~/.config/opencode/skills/$skill/
done

# Required plugin for autonomous compaction at pipeline checkpoints
mkdir -p ~/.config/opencode/plugins/
cp opencode/plugins/pipeline-compaction-controller.js \
   ~/.config/opencode/plugins/

# Global config (no compaction prompt override — safe for all workspaces)
cp opencode/opencode-global.json ~/.config/opencode/opencode.json
```

After deployment, agents are available globally in all OpenCode sessions.
Compaction behavior is unchanged until you activate a workspace.

#### Step 2: Workspace activation

Copy the compaction prompt override to the project where you will run the pipeline.
This only affects compaction in that specific workspace:

```bash
cd /path/to/your/project
cp /path/to/software_pipeline/opencode/opencode-workspace.json opencode.json
cp /path/to/software_pipeline/opencode/compaction-prompt.txt   compaction-prompt.txt
```

After activation, the pipeline-aware compaction prompt is active only in that project.

#### Full project isolation (alternative)

Copy everything local to a single project. OpenCode auto-detects `.opencode/` at the workspace root:

```bash
cd /path/to/your/project

# Agents, skills, plugins
mkdir -p .opencode/agents/ .opencode/plugins/
cp /path/to/software_pipeline/opencode/agents/*.md .opencode/agents/
for skill in pipeline-orchestrator-advanced pipeline-orchestrator-startup \
  pipeline-orchestrator-o3 pipeline-orchestrator-validation \
  pipeline-orchestrator-finalization; do
  mkdir -p .opencode/skills/$skill/
  cp /path/to/software_pipeline/opencode/skills/$skill/SKILL.md \
     .opencode/skills/$skill/
done
cp /path/to/software_pipeline/opencode/plugins/pipeline-compaction-controller.js \
   .opencode/plugins/

# Workspace config + compaction prompt (project root)
cp /path/to/software_pipeline/opencode/opencode-workspace.json opencode.json
cp /path/to/software_pipeline/opencode/compaction-prompt.txt   compaction-prompt.txt
```

After deployment, agents are available only when working in that project.

### GitHub Copilot

#### Global deployment

Copy the agent files to the global Copilot agents directory:

```bash
mkdir -p ~/.copilot/agents/
cp copilot/agents/*.agent.md ~/.copilot/agents/
```

After deployment, agents are available globally in all Copilot sessions.

#### Per-project deployment

Copy the agent files into the target project. Copilot auto-detects `.copilot/agents/` at the workspace root:

```bash
cd /path/to/your/project
cp -r /path/to/software_pipeline/copilot .copilot
```

After deployment, agents are available only when working in that project.

## Usage

In an OpenCode session, the Orchestrator is the primary agent. Start a pipeline by describing your project idea:

```text
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
- **Automode**: `automode on` / `automode off` — auto-proceeds gates with automatic "fix everything" policy (except C2)
- **Stop**: `stop` at any time to halt the pipeline

### Entry Preflight

Before entry flows (new start after C1, resume, adoption, re-entry) and before O8.V, the orchestrator runs a mandatory runtime/tooling preflight.

- `PASS`: continues
- `WARN`: continues with warning
- `BLOCKED`: halts until user intervention (not bypassed by automode)

Artifacts:

- `docs/runtime-preflight.md`
- `logs/orchestrator-preflight-<N>.md`

### Autonomous Compaction

The compaction plugin must be deployed for autonomous compaction to work. Depending on deployment mode:

- **Global**: `~/.config/opencode/plugins/pipeline-compaction-controller.js`
- **Per-project**: `.opencode/plugins/pipeline-compaction-controller.js`

The plugin triggers compaction automatically right after `Pipeline Checkpoint` emission at the defined breakpoints.

Environment knobs (optional):

- `OPENCODE_PIPELINE_COMPACTION_DRY_RUN=1` — detect checkpoints but do not call compaction (logs only)
- `OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS=120000` — minimum time between autonomous compactions per session
- `OPENCODE_PIPELINE_COMPACTION_DEBUG=1` — emit debug logs for skip reasons (cooldown, dedup, format mismatch, etc.)

### Startup Health Check

When a session is created, the plugin runs a health check and emits diagnostic logs via `app.log`.

Expected startup signals:

- `Startup check: plugin ready` (level `info`) — plugin loaded, `session.summarize` available
- `Startup check: session.summarize unavailable` (level `warn`) — plugin loaded but cannot trigger compaction API
- `Startup check: invalid OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS...` (level `warn`) — invalid cooldown env value; fallback to `120000`

What is validated:

- dry-run state
- debug state
- effective cooldown
- tracked checkpoint IDs
- availability of `session.summarize` and `app.log`

How to use it:

1. Start OpenCode with desired env vars (or none).
2. Create/open a session (the check runs on `session.created`; if your environment does not expose it, it runs on first checkpoint trigger).
3. Verify startup diagnostic log appears once per session.
4. Emit a checkpoint (`## Pipeline Checkpoint [...]`) and confirm behavior:
   - normal mode: compaction runs automatically
   - dry-run mode: only diagnostic log, no compaction

How to see the logs:

- Terminal launch: run `opencode --print-logs --log-level DEBUG` to stream logs directly
- File logs (Linux/macOS): check `~/.local/share/opencode/log/` for timestamped log files

Example (dry-run):

```bash
export OPENCODE_PIPELINE_COMPACTION_DRY_RUN=1
opencode
```

### Troubleshooting (Plugin)

- Plugin not triggering:
  - Verify deployment path: `~/.config/opencode/plugins/pipeline-compaction-controller.js` (global) or `.opencode/plugins/pipeline-compaction-controller.js` (per-project)
  - Restart OpenCode after copying plugin/config files
  - Ensure the orchestrator actually emits `## Pipeline Checkpoint [post-cognitive|post-o3|post-o10|post-reentry]`
  - Enable debug logs: `export OPENCODE_PIPELINE_COMPACTION_DEBUG=1`
- Compaction too frequent:
  - Increase cooldown: `export OPENCODE_PIPELINE_COMPACTION_COOLDOWN_MS=180000`
- Want safe validation first:
  - Enable dry-run mode: `export OPENCODE_PIPELINE_COMPACTION_DRY_RUN=1`
- Compaction quality looks wrong:
  - Verify `compaction-prompt.txt` exists alongside the plugin and `opencode.json` uses `"prompt": "{file:compaction-prompt.txt}"`

## Expected Duration and Token Cost

The table below gives rough estimates for a **new project** run end-to-end (C1 → O10).
Actual values depend on project complexity, model speed, and number of correction loops.

| Project size | Modules | Wall-clock time | Approximate tokens |
|---|---|---|---|
| Small (e.g., a CLI tool, a simple API) | 3–5 | 30–60 min | 300 K–700 K |
| Medium (e.g., a full-stack web app) | 6–12 | 1–3 hours | 700 K–2 M |
| Large (e.g., a multi-service platform) | 13–20 | 3–6 hours | 2 M–5 M |

> **Note**: these are estimates for `claude-opus-4.6`. Faster/cheaper models reduce cost
> but may affect output quality. Automode reduces wall-clock time (no user gate wait time)
> but does not reduce token usage.

## Key Design Principles

- **Git as source of truth** — every stage transition produces a commit
- **Stateless agents** — context reconstructed from disk artifacts at each invocation
- **Manifest-driven state** — `pipeline-state/manifest.json` tracks all progress
- **Split manifest** — HEAD (small, read every transition) + HISTORY (append-only log, read only for audits)
- **Entry preflight** — mandatory runtime/tooling checks before entry flows and before O8.V
- **Context economy** — artifacts flow via disk, agents return summaries only
- **Correction loops** — validation stages (O4/O5/O6) can send code back for fixes without full re-entry
- **Re-entry protocol** — return to any previous stage from a completed pipeline, with archival

## Contributing

### Setup

```bash
cd .tooling
npm ci
```

### Commands

All commands run from the `.tooling/` directory:

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests (Node.js built-in test runner) |
| `npm run lint` | Lint JS files with ESLint |
| `npm run lint:fix` | Lint + auto-fix |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting (CI) |
| `npm run validate:schema` | Validate a manifest against the HEAD schema |

To run ESLint from the repository root (as CI does):

```bash
NODE_PATH=.tooling/node_modules npx --prefix .tooling eslint --config eslint.config.js .
```

### Project layout rules

- **Root directory** must stay clean — only pipeline specification files and essential config.
- All dev tooling (tests, scripts, schemas, dependencies) lives in `.tooling/`.
- Agent definitions live in `opencode/` and `copilot/` (not dot-prefixed, intentionally).
- New test fixtures go in `.tooling/tests/fixtures/`.

### Testing

Tests use the Node.js built-in test runner (`node:test`). Run with:

```bash
cd .tooling && npm test
```

When adding new functionality:

- Plugin changes: add tests in `.tooling/tests/pipeline-compaction-controller.test.js`
- Schema validation changes: add tests in `.tooling/tests/validate-manifest-schema.test.js`
- Each test file should clean up any environment variable mutations (save/restore pattern)

## Pipeline Definition

- `pipeline_4.2.md` — the complete formal specification, serves as the canonical reference
- `pipeline_description.md` — a concise human-readable overview

## Version

**Pipeline**: v4.2  
**Manifest schema**: 4.2
