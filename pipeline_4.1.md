# Software Development Pipeline Formal Model — v4.1

---

# Design Constraints

- **V.1 — Single-user model**: the pipeline is designed for a single user interacting with the orchestrator. No role management, permissions, or multi-user interactions are supported.
- **V.2 — Stateless agents**: all agents (including the orchestrator) are stateless. Context is reconstructed at each invocation from committed artifacts and the pipeline manifest. No implicit memory exists between invocations. When the same agent is invoked across consecutive stages (e.g., Prompt Refiner in C2→C3→C4), all relevant information from prior invocations MUST be fully encoded in the output artifacts — the agent cannot rely on conversational memory from previous stages. For stages with internal iteration (O3), the orchestrator applies V.2 by invoking the subagent once per iteration unit (module), ensuring each invocation has full context independent of previous iterations.
- **V.3 — Git as source of truth**: the Git repository is the single source of truth. The pipeline state is always determinable from the manifest and committed artifacts. Every handoff between orchestrator and subagent produces a commit, ensuring that interruptions at any point are traceable.
- **V.4 — Automode**: when activated by the user, user gates become auto-proceed except **C2** and **O10**, which always require explicit user confirmation. The orchestrator makes decisions autonomously with the mandatory constraint of resolving ALL issues found at every stage (always "full correction"). Automode can be activated at any point after C4 and deactivated at any time. In automode, hard stops are: O10 user confirmation, R.8 Level 3 fatal blockage, and R.0 preflight `BLOCKED`. See R.11.
- **V.6 — Context economy**: Pipeline artifacts flow between stages via disk, never via conversation context. Subagents return structured summaries (not full reports) to the orchestrator. The orchestrator's context must remain lean throughout the entire pipeline lifecycle. Full reports and large artifacts are always written to disk; only paths and brief summaries travel through the orchestrator.

---

# Agents

The pipeline uses the following specialized agents:

| Agent | Stages | Responsibility |
|-------|--------|----------------|
| Orchestrator (direct/managed) | C1, O8.V, O9, O10 | Pipeline infrastructure, CI verification, release coordination, closure |
| Prompt Refiner | C2, C3, C4 | Intent clarification, problem formalization, requirements extraction |
| Analyst | C5 | External source analysis |
| Architect | C6, C7, C9 | Constraints, domain modeling, architecture synthesis, implementation planning |
| Validator | C8, O4, O5 | Architecture validation, system validation, security audit |
| Builder | O1, O2, O3, O7, O8 | Environment setup, scaffold, code generation, documentation, CI/CD |
| Debugger | O6 | Runtime debugging and smoke testing |
| Auditor | B1, C-ADO1 | Continuity audit, conformance audit |

Stages marked "Orchestrator (direct)" are executed by the orchestrator itself without invoking an external agent. The orchestrator still follows R.1 for commit, manifest update, and traceability.

**Agent-to-Stage constraint**: the orchestrator MUST delegate each stage to the agent declared in the table above. The orchestrator MUST NOT execute stages assigned to other agents, regardless of the circumstances (including after R.5 re-entry or R.7 correction loops).

---

# Cognitive Pipeline

Goal: progressively transform an ambiguous user idea into a complete, validated implementation plan.

---

## C1 — Initialization

- **Agent**: Orchestrator (direct)
- **Purpose**: set up the pipeline infrastructure and establish a traceable starting point for the project.
- **Input**:
  - `user_request` — user request to start a new project or adopt an existing one (natural language)
- **Output**:
  - `pipeline-state/manifest.json` — pipeline manifest HEAD (state: `C1_INITIALIZED`)
  - `pipeline-state/manifest-history.json` — pipeline manifest HISTORY (empty arrays)
  - `logs/session-init-1.md` — initialization session log
  - directory structure: `docs/`, `logs/`, `pipeline-state/`, `archive/`
- **Transformation**: an informal request is converted into a traceable repository structure with a state manifest.
- **Validation criteria**:
  - the Git repository is initialized and accessible
  - directories `docs/`, `logs/`, `pipeline-state/`, `archive/` exist
  - `manifest.json` contains state `C1_INITIALIZED` with timestamp
  - the initial commit has been executed
- **Dual mode**:
  - **New project**: standard initialization → `C1_INITIALIZED` → run R.0 Entry Preflight → proceed to C2
  - **Project adoption**: when the user requests adoption of an existing project (not developed with this pipeline), the orchestrator creates the pipeline infrastructure (directories, manifest) and transitions directly to C-ADO1. The manifest is set to `C_ADO1_AUDITING` and the Auditor is invoked for the conformance audit.
- **Resulting state**: `C1_INITIALIZED` (new project) or `C_ADO1_AUDITING` (adoption)

---

## C2 — Intent Clarification

- **Agent**: Prompt Refiner
- **Purpose**: interpret and disambiguate the user's original idea, establishing terminology, context, and assumptions.
- **Input**:
  - `user_request` — project description in natural language
  - `pipeline-state/manifest.json` — current pipeline state
- **Output**:
  - `docs/intent.md` — interpreted intent: goal, system context, assumptions, clarified terminology, explicit gaps, and open questions. This artifact MUST encode all relevant conversation information so that subsequent stages can operate without context loss (see V.2).
  - `logs/prompt-refiner-c2-conversation-1.md` — conversation log
- **Transformation**: an informally expressed idea is analyzed to identify the actual goal, usage context, and implicit assumptions, producing a structured intent document.
- **Validation criteria**:
  - `intent.md` contains sections for: interpreted goal, system context, assumptions, terminology, gaps, open questions
  - unresolved **gaps**, explicit **assumptions**, and **open questions** are captured when present
  - no unresolved gap is silently converted into a requirement without user confirmation
  - the user has confirmed that the interpretation is correct (user gate passed)
  - the conversation log has been committed
- **User gate**: confirmation of the interpreted intent (**ALWAYS manual, never auto-proceed**)
- **Loop behavior (mandatory)**:
  - Prompt Refiner returns `NEEDS_CLARIFICATION` or `READY_FOR_CONFIRMATION`
  - On `NEEDS_CLARIFICATION`, the orchestrator collects user answers and re-runs C2
  - On `READY_FOR_CONFIRMATION`, user either confirms or requests another clarification round
  - C2 remains `C2_IN_PROGRESS` until explicit user confirmation
- **Revision cycle**: if the user is unsatisfied, feedback is passed to the Prompt Refiner and the stage repeats
- **Resulting state**: `C2_INTENT_CLARIFIED` only after explicit user confirmation and no unresolved blocking gaps

---

## C3 — Problem Formalization

- **Agent**: Prompt Refiner
- **Purpose**: produce a concise technical system definition from the clarified intent.
- **Input**:
  - `docs/intent.md`
  - `logs/prompt-refiner-c2-conversation-<N>.md` — last C2 conversation log (for context reconstruction per V.2)
- **Output**:
  - `docs/problem-statement.md` — technical system definition: system goal, expected inputs, expected outputs, high-level behavior
  - `logs/prompt-refiner-c3-conversation-1.md` — conversation log
- **Transformation**: the clarified intent is translated into a structured technical definition, shifting from user domain language to technical domain language.
- **Validation criteria**:
  - `problem-statement.md` contains: system goal, expected inputs, expected outputs, high-level behavior
  - the definition is consistent with `intent.md`
  - the user has confirmed the formalization (user gate passed)
- **User gate**: confirmation of the problem formalization
- **Revision cycle**: if the user is unsatisfied, feedback is passed to the Prompt Refiner and the stage repeats
- **Resulting state**: `C3_PROBLEM_FORMALIZED`

---

## C4 — Requirements Extraction

- **Agent**: Prompt Refiner
- **Purpose**: extract functional requirements, non-functional requirements, and acceptance criteria from the problem definition.
- **Input**:
  - `docs/intent.md`
  - `docs/problem-statement.md`
  - `logs/prompt-refiner-c3-conversation-<N>.md` — last C3 conversation log (for context reconstruction per V.2)
- **Output**:
  - `docs/project-spec.md` — complete project specification: functional requirements, non-functional requirements, scope, constraints, acceptance criteria
  - `logs/prompt-refiner-c4-conversation-1.md` — conversation log
- **Transformation**: the technical problem definition is decomposed into discrete, verifiable, and traceable requirements with explicit acceptance criteria.
- **Validation criteria**:
  - `docs/project-spec.md` contains sections for: functional requirements (numbered), non-functional requirements (numbered), constraints, acceptance criteria
  - every requirement is traceable to `problem-statement.md`
  - the user has confirmed document completeness (user gate passed)
- **User gate**: confirmation of requirements completeness
- **Revision cycle**: if the user is unsatisfied, feedback is passed to the Prompt Refiner and the stage repeats
- **Resulting state**: `C4_REQUIREMENTS_EXTRACTED`

---

## C5 — External Source Analysis [conditional]

- **Agent**: Analyst
- **Purpose**: analyze external code and architectures relevant to the project, extracting reusable patterns and logic.
- **Entry condition**: `docs/project-spec.md` contains references to external code sources (orchestrator decision confirmed by user)
- **Input**:
  - `docs/project-spec.md` — references to external sources
- **Output**:
  - `docs/upstream-analysis.md` — detailed analysis of external sources (extracted logic, configuration models, architectural patterns, licenses)
  - `logs/analyst-conversation-1.md` — conversation log
- **Transformation**: references to external sources are converted into a structured analysis document focused on elements relevant to the current project.
- **Validation criteria**:
  - every source referenced in `docs/project-spec.md` has been analyzed or documented as inaccessible
  - `upstream-analysis.md` links each extracted element to its original source
  - the user has confirmed analysis quality (user gate passed)
- **Access error handling**: if an external source is inaccessible (authentication, network, invalid URL), the Analyst documents the failure in the report with: source, error type, estimated impact on the project, and requests user instructions to proceed (alternative source, skip, credentials).
- **Bypass**: if no external sources exist, the stage is skipped and `upstream-analysis.md` is not produced. Subsequent stages must function with or without this artifact.
- **Resulting state**: `C5_EXTERNAL_ANALYZED` (or `C5_SKIPPED`)

---

## C6 — Constraint Analysis and Domain Modeling

- **Agent**: Architect
- **Purpose**: identify system operational constraints and build the domain conceptual model.
- **Input**:
  - `docs/project-spec.md`
  - `docs/upstream-analysis.md` (optional)
- **Output**:
  - `docs/constraints.md` — performance, security, environment, scalability constraints
  - `docs/domain-model.md` — domain entities, relationships, operations
- **Transformation**: requirements and external analysis are analyzed to extract explicit and implicit constraints and to build the application domain conceptual model.
- **Validation criteria**:
  - every constraint is classified by category (performance, security, environment, scalability)
  - the domain model covers all entities mentioned in requirements
  - no constraints are mutually conflicting
- **Note**: no user gate is required at this stage. Errors in constraints or the domain model are caught by C8 (Architecture Validation), which performs systematic cross-referencing and can trigger a return to C7 with revision notes.
- **Resulting state**: `C6_DOMAIN_MODELED`

---

## C7 — Architecture Synthesis

- **Agent**: Architect
- **Purpose**: define the system architecture, APIs, interface contracts, and configuration model.
- **Input**:
  - `docs/project-spec.md`
  - `docs/upstream-analysis.md` (optional)
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture.md` — system architecture (structure, components, dependencies, interaction patterns)
  - `docs/api.md` — API definition
  - `docs/configuration.md` — configuration model (parameters, config file format, defaults, environment variables)
  - `docs/interface-contracts.md` — interface contracts between components
- **Transformation**: requirements, constraints, and domain model are synthesized into a coherent architectural structure with component responsibilities, contracts, and implementation sequence.
- **Validation criteria**:
  - every functional requirement is mapped to at least one architectural component
  - every constraint is addressed in the architecture
  - interface contracts are unambiguous
  - the user has confirmed the architecture (user gate passed)
- **User gate**: architecture confirmation
- **Resulting state**: `C7_ARCHITECTURE_SYNTHESIZED`

---

## C8 — Architecture Validation

- **Agent**: Validator
- **Purpose**: verify architecture consistency against requirements, constraints, and domain model before proceeding to implementation.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/project-spec.md`
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture-review.md` — architecture validation report (requirement coverage, constraint conformance, identified risks, mitigation proposals)
- **Transformation**: systematic cross-referencing between architecture, requirements, and constraints to produce a structured conformance assessment.
- **Validation criteria**:
  - every requirement is traced to at least one component
  - no constraints are violated
  - identified risks have mitigation proposals
- **Decision rule**:
  - if architecture is invalid → return to C7 with revision notes
  - if architecture is valid → proceed
- **Resulting state**: `C8_ARCHITECTURE_VALIDATED`

---

## C9 — Implementation Planning

- **Agent**: Architect
- **Purpose**: decompose the architecture into implementable tasks, define the dependency graph, execution sequence, and test strategy.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/task-graph.md` — task graph with dependencies
  - `docs/implementation-plan.md` — implementation plan with execution order and per-module specifications
  - `docs/module-map.md` — module map with responsibilities and interfaces
  - `docs/test-strategy.md` — test strategy: test types (unit, integration, e2e), coverage criteria, minimum thresholds, acceptance criteria per module
- **Transformation**: the architecture is decomposed into implementable work units with their dependencies, priorities, and verification criteria.
- **Validation criteria**:
  - every architectural component is mapped to at least one task
  - the dependency graph is acyclic
  - every module has declared responsibilities, interfaces, and dependencies
  - the test strategy defines at least: test types, coverage threshold, criteria per module
  - the user has confirmed the plan (user gate passed)
- **User gate**: plan and test strategy confirmation
- **Resulting state**: `C9_IMPLEMENTATION_PLANNED`

---

## Cognitive Pipeline Output

Final artifacts produced:

```
docs/intent.md
docs/problem-statement.md
docs/project-spec.md
docs/upstream-analysis.md          (conditional)
docs/constraints.md
docs/domain-model.md
docs/architecture.md
docs/api.md
docs/configuration.md
docs/interface-contracts.md
docs/architecture-review.md
docs/task-graph.md
docs/implementation-plan.md
docs/module-map.md
docs/test-strategy.md
```

**Cognitive-to-Operational Handoff**: before proceeding to O1, the orchestrator performs an automatic integrity check verifying that: (1) all expected cognitive artifacts listed above are present in the repository (excluding conditional ones marked as skipped), (2) the manifest reflects state `C9_IMPLEMENTATION_PLANNED`, and (3) no artifact references are broken (every artifact referenced as input by another artifact exists). If the check fails, the orchestrator reports the missing or inconsistent artifacts and halts, requiring user intervention.

These artifacts are consumed by the Operational Pipeline.

---

# Operational Pipeline

Goal: execute the implementation plan and produce working, tested, secure, documented, and releasable software.

---

## O1 — Environment Setup

- **Agent**: Builder
- **Purpose**: configure the project development environment based on architectural specifications and the configuration model.
- **Input**:
  - `docs/architecture.md`
  - `docs/configuration.md`
  - `docs/constraints.md`
- **Output**:
  - `docs/environment.md` — environment specification: required runtimes (language, version), dependencies (with lockfile), environment variables, build tools, GitHub CLI (`gh`) — mandatory pipeline requirement (must be installed and authenticated for CI verification in O8.V), recommended external tools (linters, SAST scanners, dependency auditors) for use in later stages (O5, O8)
  - environment configuration files (`package.json`, `requirements.txt`, `Dockerfile`, or equivalent for the chosen language)
- **Transformation**: architectural specifications and the configuration model are translated into the concrete development environment configuration, including tooling recommendations for quality and security stages.
- **Validation criteria**:
  - every dependency is specified with version
  - a lockfile is present for reproducibility
  - required environment variables are documented in `environment.md`
  - the environment can be recreated from scratch using the artifacts (portability)
- **Resulting state**: `O1_ENVIRONMENT_READY`

---

## O2 — Repository Scaffold

- **Agent**: Builder
- **Purpose**: create the project structure based on the architectural plan, module map, and configuration model.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/architecture.md`
  - `docs/configuration.md`
- **Output**:
  - `docs/repository-structure.md` — documented repository structure
  - physical directory and placeholder file structure
  - project configuration files based on `configuration.md`
- **Transformation**: the implementation plan, module map, and configuration model are converted into the physical project structure.
- **Validation criteria**:
  - every module in `module-map.md` has a corresponding directory
  - the structure reflects dependencies declared in the architecture
  - configuration files are consistent with `configuration.md`
  - the commit has been executed
- **Resulting state**: `O2_SCAFFOLD_CREATED`

---

## O3 — Module Generation (Orchestrator-Managed Iteration)

- **Agent**: Builder (one invocation per module, managed by the orchestrator)
- **Purpose**: implement code module by module following the implementation plan and dependency graph, producing code and tests jointly for each module.
- **Invocation model**: unlike other stages where the orchestrator delegates the entire stage to a single subagent invocation, O3 is managed as an **iterative loop by the orchestrator**. The orchestrator reads the task graph to determine module order and count, then invokes the Builder **once per module**. Between each module invocation, the orchestrator commits, updates manifest progress, and provides an executive summary. This design prevents context compaction from affecting per-module documentation and ensures each Builder invocation has full, focused context (see V.2).
- **Input** (orchestrator reads at O3 start):
  - `docs/task-graph.md` — to determine module order and count
  - `docs/implementation-plan.md` — per-module specifications
  - `docs/module-map.md` — module responsibilities and interfaces
- **Input** (per-module Builder invocation):
  - module assignment from orchestrator (module name, index M/N)
  - `docs/implementation-plan.md` (focus on assigned module)
  - `docs/module-map.md` (focus on assigned module)
  - `docs/task-graph.md` (for dependency context)
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/test-strategy.md`
  - `docs/environment.md`
  - previously committed modules in `src/` (for integration context)
- **Output** (per module):
  - `src/<module>/` — module source code
  - `tests/<module>/` — module tests (conforming to `test-strategy.md`)
  - `logs/builder-report-module-<module-name>-<N>.md` — per-module report with sub-sections:
    - module spec confirmed
    - code implemented (files produced)
    - tests implemented (files produced)
    - test execution results
    - issues encountered
- **Output** (on completion):
  - `logs/builder-cumulative-report-1.md` — cumulative report (produced by a final Builder invocation)
- **Orchestrator-managed loop**:
  1. Read `task-graph.md` to determine module order and total count (N)
  2. Set manifest: `current_state` → `O3_IN_PROGRESS`, `progress.modules_total` = N, `progress.modules_completed` = 0
  3. Commit: `[O3] [Orchestrator] Module generation started (N modules planned)`
  4. For each module (in dependency order):
     a. Set `progress.current_module` = `<module-name>`
     b. Dispatch commit: `[O3] [Orchestrator] Dispatching Builder for module <module-name> (M/N)`
     c. Invoke the Builder with: module assignment, relevant artifacts, correction notes if any
     d. Builder implements module code + tests, runs tests, produces per-module report
     e. Return commit: `[O3] [Builder] Module <module-name> implemented (M/N)`
     f. Update manifest: `progress.modules_completed` += 1
     g. Executive summary to user (informational — no user gate per module)
  5. Invoke Builder for cumulative report
  6. Final commit: `[O3] [Orchestrator] All N modules completed`
  7. Manifest → `O3_MODULES_GENERATED`
- **Validation criteria**:
  - every module declared in the plan is implemented
  - every module has tests conforming to the strategy defined in `test-strategy.md`
  - module tests pass before proceeding to the next module
  - a commit has been executed for each completed module
  - a per-module report exists for each module
- **Error handling**: if a module fails, the **orchestrator** (not the Builder) notifies the user and awaits instructions (retry, skip, stop). If the user chooses **skip**, the orchestrator checks the dependency graph (`docs/task-graph.md`) and reports all downstream modules that depend on the skipped module, asking the user whether to skip those as well or stop.
- **Correction loops**: when O3 is invoked via R.7 with correction notes from O4/O5/O6, the orchestrator identifies which modules need correction from the notes and invokes the Builder only for those modules (not all modules). Unaffected modules retain their existing code and commits.
- **Resulting state**: `O3_MODULES_GENERATED`

---

## O4 — System Validation (Validator)

- **Agent**: Validator
- **Purpose**: verify overall system conformance against the architecture, requirements, and interface contracts, with explicit quality gates.
- **Input**:
  - `src/` — complete source code
  - `tests/` — complete test suite
  - `docs/architecture.md`
  - `docs/interface-contracts.md`
  - `docs/test-strategy.md`
  - `docs/project-spec.md`
  - `docs/constraints.md`
- **Output**:
  - `docs/validator-report.md` — validation report with independent sub-sections:
    - **Architectural conformance**: result (PASS/FAIL), non-conformance details
    - **Test results**: result (PASS/FAIL), tests passed/failed, coverage percentage
    - **Static analysis**: result (PASS/FAIL), linting violations, cyclomatic complexity
    - **Quality gate**: overall result (PASS/FAIL) with threshold verification from `test-strategy.md`
- **Transformation**: produced code is systematically compared against architectural specifications, requirements, and quality thresholds, producing a structured assessment per category.
- **Validation criteria**:
  - all tests pass
  - every functional requirement is covered by at least one test
  - no interface contract violations
  - code coverage ≥ threshold defined in `test-strategy.md`
  - cyclomatic complexity within defined limits
- **User gate**: the user chooses between:
  - **a)** full correction → return to O3 with all notes (correction loop, see R.7)
  - **b)** selective correction → return to O3 with selected points (correction loop, see R.7)
  - **c)** no correction → proceed
- **Resulting state**: `O4_SYSTEM_VALIDATED`

---

## O5 — Security Audit

- **Agent**: Validator
- **Purpose**: verify application security through vulnerability analysis, dependency auditing, and security pattern verification.
- **Input**:
  - `src/` — complete source code
  - `docs/constraints.md` — security constraints
  - `docs/architecture.md`
  - `docs/environment.md` — recommended external tools (SAST scanners, dependency auditors)
  - dependency configuration files (lockfile)
- **Output**:
  - `docs/security-audit-report.md` — security report with sub-sections:
    - **OWASP analysis**: verification of applicable Top 10 risks (LLM-based code review)
    - **Dependency audit**: known vulnerabilities in dependencies (CVE). If external tools are available (as recommended in `docs/environment.md`), their output is included; otherwise, the LLM performs a best-effort analysis with limitations noted.
    - **Security patterns**: verification of authentication, authorization, input sanitization patterns
    - **External tool results**: output from SAST/dependency audit tools if available, or explicit note that no external tools were used
    - **Limitations**: explicit declaration of analysis limitations (e.g., no dynamic testing, no runtime analysis, CVE database currency)
    - **Recommendations**: corrective actions ordered by severity
- **Transformation**: code and dependencies are systematically analyzed against known security patterns and declared constraints, using LLM analysis as primary method and external tools (if configured in `docs/environment.md`) as supplementary validation.
- **Validation criteria**:
  - every dependency has been checked for known vulnerabilities (via tool or LLM analysis)
  - applicable OWASP risks have been verified
  - every found vulnerability has a severity and recommendation
  - analysis limitations are explicitly documented
- **User gate**: the user chooses between:
  - **a)** full correction → return to O3 with all security notes (correction loop, see R.7)
  - **b)** selective correction → return to O3 with selected points (correction loop, see R.7)
  - **c)** no correction needed → proceed
- **Resulting state**: `O5_SECURITY_AUDITED`

---

## O6 — Debug and Smoke Test (Debugger)

- **Agent**: Debugger
- **Purpose**: exercise the application in a controlled environment, capture logs, and identify runtime bugs not found during validation.
- **Input**:
  - `src/` — complete source code
  - `docs/architecture.md`
  - `docs/validator-report.md`
  - `docs/test-strategy.md`
  - `docs/security-audit-report.md` (optional — if O5 was executed)
- **Output**:
  - `docs/debugger-report.md` — report with sub-sections:
    - **Smoke tests**: scenarios executed, results (PASS/FAIL per scenario)
    - **Bugs found**: for each bug: reproduction scenario, associated logs, severity, involved component
    - **Log analysis**: anomalies detected during execution
  - `logs/runtime-logs/` — logs captured during execution
- **Transformation**: the application is executed in realistic scenarios and results are analyzed to identify anomalous behavior not revealed during validation.
- **Validation criteria**:
  - all defined smoke tests have been executed
  - logs have been captured and analyzed
  - every found bug is documented with: scenario, logs, severity
- **User gate**: the user chooses between:
  - **a)** full correction → return to O3 with all notes (correction loop, see R.7)
  - **b)** selective correction → return to O3 with selected points (correction loop, see R.7)
  - **c)** no bugs → proceed
- **Resulting state**: `O6_DEBUG_COMPLETED`

---

## O7 — Documentation Generation

- **Agent**: Builder
- **Purpose**: produce user and developer documentation for the project.
- **Input**:
  - `src/` — complete source code
  - `docs/project-spec.md`
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/configuration.md`
  - `docs/environment.md`
- **Output**:
  - `README.md` — project documentation: description, requirements, installation, usage, configuration
  - `docs/api-reference.md` — developer API documentation (generated from code and `api.md`)
  - `docs/installation-guide.md` — installation and configuration guide
- **Transformation**: architectural artifacts, project specification, and source code are synthesized into documentation oriented to end users and developers.
- **Validation criteria**:
  - `README.md` contains: description, prerequisites, installation instructions, usage instructions
  - `api-reference.md` covers all public APIs
  - `installation-guide.md` is sufficient to reproduce the environment from scratch
- **Resulting state**: `O7_DOCUMENTATION_GENERATED`

---

## O8 — CI/CD Configuration

- **Agent**: Builder
- **Purpose**: configure the continuous integration and automated deployment pipeline.
- **Input**:
  - `docs/architecture.md`
  - `docs/test-strategy.md`
  - `docs/environment.md`
  - `docs/repository-structure.md`
- **Output**:
  - CI/CD configuration files (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, or equivalent)
  - `docs/cicd-configuration.md` — CI/CD configuration documentation: steps, triggers, environments
- **Transformation**: the test strategy, repository structure, and environment specifications are translated into a configured CI/CD pipeline.
- **Validation criteria**:
  - the CI/CD pipeline is configured and documented
  - triggers are defined (push, PR, tag)
  - steps include at least: install, lint, test, build
  - configuration is consistent with `test-strategy.md`
- **Resulting state**: `O8_CICD_CONFIGURED`

---

## O8.V — CI Verification

- **Agent**: Orchestrator (managed iterative loop, delegates analysis and fixes to Builder)
- **Purpose**: verify that the CI/CD pipeline configured in O8 passes on the live GitHub environment, and iteratively fix failures until the workflow is green.
- **Prerequisite**: GitHub CLI (`gh`) must be installed, authenticated, and the repository must have a GitHub remote. These are established during O1 and verified during O2.
- **Hard precheck (mandatory before loop start)**:
  1. Run R.0 Entry Preflight with O8.V scope
  2. Verify explicitly: `gh` available, `gh auth status` valid, `origin` remote configured and reachable
  3. If any check fails: preflight result `BLOCKED`, O8.V does not start, user intervention required
  4. Automode does NOT bypass this block
- **Input**:
  - CI/CD configuration files (from O8)
  - `docs/cicd-configuration.md`
  - `docs/environment.md`
  - `src/`, `tests/` — complete source code and tests
- **Output**:
  - `docs/ci-verification-report.md` — verification report with:
    - Workflow name and URL
    - Number of iterations (1 = first-pass success)
    - Final result (PASS)
    - History of failures and fixes (if any iteration > 1)
- **Execution flow**:
  1. Commit all pending changes and push to remote
  2. Trigger CI workflow: `gh workflow run <workflow-name>` (or equivalent trigger)
  3. Monitor execution: `gh run watch` until completion
  4. Read result:
     - **PASS** → produce `docs/ci-verification-report.md`, proceed
     - **FAIL** → collect raw failure log and enter correction loop (see below)
- **CI failure correction loop**:
  When CI fails, the orchestrator collects the raw failure log (`gh run view --log-failed`) and invokes the **Builder** to analyze, classify, and fix the issue. The orchestrator does NOT classify the error itself — that is technical work delegated to the Builder.

  **Builder receives**: raw CI failure log + relevant artifacts (`docs/cicd-configuration.md`, `docs/environment.md`, affected source files).

  **Builder returns** a structured CI fix report:
  | Field | Description |
  |-------|-------------|
  | `classification` | Error type: `ci-config`, `code-test`, `dependency`, or `infrastructure` |
  | `root_cause` | Brief description of the root cause |
  | `fix_applied` | Description of the fix (or "none" if infrastructure error) |
  | `confidence` | `high`, `medium`, or `low` — Builder's confidence that the fix resolves the issue |
  | `escalation_needed` | `true` if the fix is too significant for an in-place correction |
  | `files_modified` | List of modified files |

  **Orchestrator routing based on Builder report**:
  | Condition | Orchestrator action |
  |-----------|-------------------|
  | `classification: infrastructure` | Wait and retry after delay (no Builder fix needed) |
  | `escalation_needed: false` | Commit fix (`[O8V] [Builder] CI fix: <description>`), push, re-trigger CI |
  | `escalation_needed: true` | Escalate via R.8 (see below) |

  All fixes are **in-place corrections within the O8.V loop** — the Builder is invoked to analyze and fix, the orchestrator commits and re-triggers CI. No re-entry into previous pipeline stages occurs within this loop.

  After each correction:
  1. The Builder analyzes, classifies, fixes, and returns the structured report
  2. The orchestrator commits the fix: `[O8V] [Builder] CI fix: <description>`
  3. Push and re-trigger: `gh workflow run` → `gh run watch`
  4. Repeat until CI passes

  **Escalation for significant changes**: if the Builder reports `escalation_needed: true` (e.g., a module needs substantial rewriting, an architectural contradiction emerges, or a dependency requires fundamental redesign), the orchestrator escalates via R.8:
  - **Normal mode**: R.8 Level 2 — the orchestrator proposes re-entry to the user at the appropriate stage (typically O3, O1, or earlier) via R.5. The user confirms.
  - **Automode**: R.8 Level 2 is resolved automatically — the orchestrator determines the appropriate re-entry stage, executes R.5 re-entry, and the pipeline re-traverses all intermediate stages (automode auto-proceeds through applicable gates; C2 and O10 remain manual). If re-entry targets C2, automode is disabled before resumption per R.5/S.1. The pipeline will eventually return to O8.V for re-verification. **Anti-loop guard**: if after an automatic re-entry the CI fails again for the same root cause, the orchestrator does NOT perform a second automatic re-entry — instead it triggers R.8 Level 3 (fatal blockage), which halts the pipeline in automode.
- **Iteration limit**: after 5 consecutive in-place fix failures (without escalation), the orchestrator halts and escalates to the user (R.8 Level 2 in normal mode, automatic re-entry in automode as described above).
- **Validation criteria**:
  - the CI workflow has passed on the live GitHub environment
  - the verification report is complete
  - all fix iterations (if any) are documented in the report
- **Resulting state**: `O8V_CI_VERIFIED`

---

## O9 — Release and Deployment

- **Agent**: Orchestrator (direct)
- **Purpose**: prepare the software release with semantic versioning and, if applicable, deployment configuration.
- **Input**:
  - `src/` — complete source code
  - `docs/architecture.md`
  - `docs/environment.md`
  - `pipeline-state/manifest.json`
- **Output**:
  - Git tag with semantic version (e.g., `v1.0.0`)
  - `CHANGELOG.md` — changelog of modifications
  - `docs/release-notes.md` — release notes
  - deployment configuration (if applicable: `Dockerfile`, deploy scripts, cloud configuration)
- **Transformation**: the completed project is prepared for distribution with version metadata and (optionally) deployment configuration.
- **Validation criteria**:
  - the version tag follows semantic versioning
  - the changelog is complete and tracks changes
  - release notes are consistent with the changelog
- **User gate**: release confirmation
- **Resulting state**: `O9_RELEASED`

---

## O10 — Closure and Final Report

- **Agent**: Orchestrator (direct)
- **Purpose**: verify repository integrity, consolidate the pipeline state, and provide a final report to the user.
- **Input**:
  - all artifacts produced by the pipeline (cognitive + operational)
  - `pipeline-state/manifest.json`
- **Output**:
  - `docs/final-report.md` — cumulative final report
  - `pipeline-state/manifest.json` — manifest updated with state `COMPLETED`
- **Transformation**: all artifacts are inventoried, verified for integrity, and synthesized into a final report.
- **Validation criteria**:
  - every artifact declared in the manifest is present in the repository
  - no untracked files remain outside the manifest
  - the manifest is updated with final state and timestamp
- **User gate**: the user chooses between:
  - **Iteration**: re-entry at a specific pipeline point (C2–O9) providing instructions. On re-entry the **Re-Entry Protocol** (R.5) is applied. The re-entry point is validated by the orchestrator (see S.1 under State Machine). The orchestrator presents the **Re-Entry Guide** (R.10) to help the user select the correct re-entry stage.
  - **Closure**: the pipeline is concluded
- **Resulting state**: `COMPLETED`

---

# Flow B — Project Resume

---

## B1 — Continuity Audit

- **Agent**: Auditor
- **Purpose**: analyze an existing repository to determine if the project can be resumed from its interruption point.
- **Input**:
  - repository contents
  - `pipeline-state/manifest.json` (HEAD — current state, if present)
  - `pipeline-state/manifest-history.json` (HISTORY — full stage log, if present)
- **Output**:
  - `docs/audit-report.md` — audit report with sub-sections:
    - **Artifact inventory**: found artifacts, classified by originating stage
    - **Consistency analysis**: cross-referencing between artifacts and expected pipeline structure
    - **Pipeline state**: last valid state identified
    - **Interruption point**: stage at which the project stopped
    - **IN_PROGRESS detection**: if the manifest `current_state` ends with `_IN_PROGRESS`, the stage was started but never completed — this indicates an interrupted invocation. The audit MUST note this and recommend re-executing that stage from scratch.
    - **Recommendation**: resume (with re-entry point) or adoption (with justification)
  - `logs/auditor-analysis-1.md` — analysis log
- **Transformation**: artifacts present in the repository are compared against the expected pipeline structure to determine project state and consistency.
- **Validation criteria**:
  - every found artifact has been classified against its originating stage
  - the interruption point has been uniquely identified
  - the report contains an explicit recommendation (resume or adoption)
  - if `manifest.json` exists, its `schema_version` is verified for compatibility
  - if `current_state` is `_IN_PROGRESS`, this is documented as an interrupted invocation
- **RESUME/ADOPTION threshold criteria**:
  - **RESUMABLE** if: `manifest.json` exists AND is valid AND its `schema_version` is compatible AND all artifacts referenced in the manifest are present AND the last completed stage is uniquely identifiable
  - **ADOPTION** if: `manifest.json` is absent OR corrupted OR schema version incompatible OR artifacts do not match the manifest OR the last completed stage cannot be uniquely determined
- **User gate**: the user confirms the audit result
- **Preflight**: before executing the audit recommendation (resume/adoption transition), run R.0 Entry Preflight. If `BLOCKED`, halt and request user intervention.
- **Outcome**:
  - **Resumable**: re-entry into the main flow (C/O) at the identified point. The orchestrator reconstructs context by reading: manifest, artifacts from the last completed stage, conversation logs.
  - **Not resumable**: recommendation to switch to Flow C (Adoption)
- **Resulting state**: state of the last completed stage (as determined by audit)

---

# Flow C — Project Adoption

---

## C-ADO1 — Conformance Audit

- **Agent**: Auditor
- **Purpose**: analyze a non-conforming repository to produce an adoption plan that makes it pipeline-compatible.
- **Entry points**:
  - From C1 in adoption mode (user requests adoption of an existing project at pipeline start)
  - From B1 when the project is not resumable
  - From STOPPED state when the user requests adoption
- **Input**:
  - repository contents
  - previous audit artifacts (if present)
- **Output**:
  - `docs/adoption-report.md` — adoption report with sub-sections:
    - **Inventory**: existing artifacts mapped to pipeline stages
    - **Gap analysis**: missing artifacts per stage, with responsible stage
    - **Conformance plan**: ordered actions to fill gaps, with responsible agent per action
    - **Entry point**: stage at which to re-enter, with justification
- **Transformation**: repository contents are compared against the expected pipeline structure, identifying gaps and producing an operational plan to fill them.
- **Validation criteria**:
  - every gap has been documented with the missing artifact and responsible stage
  - the conformance plan specifies necessary actions in order, with the responsible agent
  - the pipeline entry point is justified
- **User gate**: the user must confirm the adoption plan
- **Preflight**: before conformance-plan execution, run R.0 Entry Preflight. If `BLOCKED`, halt and request user intervention.
- **Plan execution**: the orchestrator executes the conformance plan actions by invoking the appropriate agents for each missing artifact, in the order specified by the plan. Each produced artifact follows the standard pattern (R.1).
- **Transition**: once the plan is complete, re-entry into the main flow at the identified point
- **Resulting state**: state of the identified re-entry stage

---

# Cross-Cutting Rules

## R.0 — Entry Preflight (Mandatory)

Before any pipeline entry flow, the orchestrator executes a runtime/tooling preflight.

**When mandatory**:
- before first dispatch after C1 startup (new project)
- before B1 (resume audit)
- before C-ADO1 (adoption audit)
- before resuming from R.5 re-entry
- before starting O8.V CI verification loop

**Checks**:
- `git` CLI available and repository writable
- `git rev-parse --is-inside-work-tree` succeeds
- `git status` succeeds
- if O8.V is in path: `gh` CLI available, `gh auth status` valid, `origin` remote configured
- if `docs/environment.md` exists (O1+), runtime/package-manager CLIs declared there are available

**Outputs**:
- `docs/runtime-preflight.md` (latest snapshot)
- `logs/orchestrator-preflight-<N>.md` (detailed checks)

**Decision**:
- `PASS`: continue
- `WARN`: continue with explicit warning in executive summary
- `BLOCKED`: halt and request user intervention (**not bypassable by automode**)

## R.1 — Standard Interaction Pattern

Every stage follows this 9-step pattern (+ preflight when required by R.0):

0. **Preflight (conditional, per R.0)**: if current transition is an entry flow or O8.V start, run Entry Preflight and honor PASS/WARN/BLOCKED decision before continuing.
1. **Context reconstruction**: the orchestrator re-reads `manifest.json` (HEAD) from disk to determine current state and progress (per R.CONTEXT). It identifies required input artifacts from the Stage Routing Table by path. The orchestrator does NOT load full artifact content into its own context.
2. **Dispatch commit**: the orchestrator updates `manifest.json` setting `current_state` to `<STAGE>_IN_PROGRESS`, then commits with message `[<stage-id>] [Orchestrator] Dispatching to <agent-name>`
3. **Invocation**: the orchestrator invokes the specialized agent **as declared in each stage's Agent field and in the Agent table** — the orchestrator MUST NOT perform the agent's work itself regardless of stage complexity or simplicity. The orchestrator transmits: stage assignment, input artifact **paths** (not content), a context brief (project name, current state, 1-2 sentences), any user feedback or correction notes. The subagent reads artifact content from disk using its own tools.
4. **Agent work**: the agent writes artifacts to disk and returns a **structured summary** only (not the full report) to the orchestrator. For C2, the summary includes: status, `blocking_gaps`, `open_questions`, `assumptions`, and `intent_version`.
5. **Stage completion commit**: the orchestrator commits the produced artifacts with message `[<stage-id>] [<agent-name>] <description>`
6. **Manifest update**: the orchestrator updates HEAD (`manifest.json`): set `current_state`, `progress`, upsert `latest_stages[<stage-id>]`. Append to HISTORY (`manifest-history.json`): add entry to `stages_completed`. Both include: resulting state, timestamp, produced artifacts, commit hash, responsible agent, progress metrics (see R.9). **C2 exception**: for intermediate clarification rounds (`NEEDS_CLARIFICATION` or user requests another clarification round), keep `current_state` = `C2_IN_PROGRESS`, update `latest_stages[C2]` as in-progress metadata only, and do NOT append C2 to `stages_completed` until explicit user confirmation.
7. **Executive summary**: the orchestrator writes in the chat a brief summary based on the agent's returned summary, indicating the location of the full report in the repository (e.g., "Full report: `docs/validator-report.md`"). The orchestrator does NOT read the full report into its context — the agent's returned summary is sufficient.
   - **At compaction breakpoints** (post-C9, post-O3 with >5 modules, post-O10, and post-reentry after R.5): before the executive summary, the orchestrator writes a **Pipeline Checkpoint** block per R.CONTEXT point 7. This structured block is designed to survive context compaction and serve as the reconstruction seed for the next phase.
8. **User gate** (if required): awaits confirmation or feedback. **C2 is a hard interactive gate and MUST NEVER auto-proceed, including when automode is active.**
9. **Revision** (if needed): the cycle repeats from step 2 with the user's notes

### C2 — Mandatory Interactive Clarification Loop

Treat C2 as a loop, not a single-pass stage:

1. Prompt Refiner returns one of: `NEEDS_CLARIFICATION`, `READY_FOR_CONFIRMATION`, or `FAILED`
2. On `NEEDS_CLARIFICATION`: keep state `C2_IN_PROGRESS`, present numbered open questions to the user, and wait for manual answers
3. On `READY_FOR_CONFIRMATION`: present final gate — user either confirms intent (exit C2) or requests further clarification (loop continues)
4. Exit condition: transition to `C2_INTENT_CLARIFIED` ONLY after explicit user confirmation and no unresolved blocking gaps
5. Automode does not bypass any C2 loop step

**For stages the orchestrator executes directly** (C1, O9, O10):
1. Set `current_state` to `<STAGE>_IN_PROGRESS`, commit: `[<stage-id>] [Orchestrator] Stage started`
2. Execute the stage work
3. Commit results: `[<stage-id>] [Orchestrator] <description>`
4. Update manifest to resulting state
5. Executive summary, user gate, revision as above

**For O3 (orchestrator-managed iteration)**: see O3 section for the detailed per-module loop. The general principle of dispatch/return commits applies to each module invocation within O3.

## R.2 — Atomicity and Stop

- Every agent operation is an atomic unit of work: invocation completion + artifact production + commit
- **Stop triggers**:
  - Explicit user command (always available)
  - Fatal agent error (automatic)
  - No automatic timeout or budget-based stops — the user must stop explicitly
- On stop request: in-progress changes are discarded and rollback to last commit
- **Stop during commit**: if stop occurs during the commit operation, rollback to the previous commit (pre-operation). The partial commit is discarded.
- **Stop during O3 module loop**: each committed module is independent. Stop interrupts the in-progress module (discarded) and preserves already committed modules. The manifest `progress.modules_completed` reflects the last committed module count. The manifest `current_state` remains `O3_IN_PROGRESS`.
- The pipeline state is always determinable from the manifest and committed artifacts

## R.3 — Traceability

- Every invocation produces a log in `logs/`
- **Log naming convention**: log files include an incremental suffix to prevent overwriting on re-executions: `logs/<agent>-<stage-id>-<description>-<N>.md` where `<N>` is an integer starting from 1, incremented for each re-execution of the same stage. Examples: `logs/prompt-refiner-c2-conversation-1.md`, `logs/prompt-refiner-c2-conversation-2.md` (after revision cycle).
- **Log format**: Markdown, with structure:
  ```
  # Log [stage-id] — [timestamp]
  ## Agent: [agent name]
  ## Stage: [stage name]
  ### Conversation
  - **[role]** [timestamp]: [content]
  ```
- The manifest (`pipeline-state/manifest.json`) is updated at every commit with:
  - completed stage (or IN_PROGRESS for dispatch commits)
  - timestamp
  - produced artifacts (paths)
  - commit hash
  - responsible agent
- Conversations are serialized in Markdown format and committed in `logs/`

## R.4 — Portability

- The manifest and artifacts are sufficient to determine pipeline state on a different workspace
- Absolute paths or untracked local configurations are not allowed
- All runtime dependencies are specified with versions in `docs/environment.md`
- All required environment variables are documented in `docs/environment.md` and `docs/configuration.md`
- A lockfile is present for dependency reproducibility

## R.5 — Re-Entry Protocol

When the user chooses to re-enter the pipeline at a previous point (from O10/COMPLETED, or from B1/C-ADO1):

1. **Archival**: artifacts produced by stages after the re-entry point are moved to `archive/<timestamp>/`, preserving the original structure
2. **Manifest update**: `manifest.json` is updated to reflect the new state (the re-entry stage state), with reference to the archive for traceability
3. **Automode safety**: if re-entry target is `C2`, the orchestrator sets `automode: false` in `manifest.json` before resuming so C2 remains fully interactive.
4. **Commit**: the re-entry is committed with message `[RE-ENTRY] [Orchestrator] Return to <stage-id> — artifacts archived in archive/<timestamp>/`
5. **Post-reentry checkpoint**: the orchestrator writes a `Pipeline Checkpoint [post-reentry]` containing: resulting state, `from_state -> target_stage`, archive path, scope impact, next stage/agent, required input artifacts, pending gate
6. **Context compaction**: after writing the post-reentry checkpoint, the orchestrator triggers autonomous context compaction (on OpenCode via plugin). Manual compaction remains a fallback.
7. **Resumption**: execution resumes from the indicated stage with artifacts from preceding stages intact
8. **Preflight**: run R.0 Entry Preflight before first post-reentry dispatch. If preflight is `BLOCKED`, halt and request user intervention.
9. **Delegation**: the orchestrator identifies the agent responsible for the target stage from the Agent-to-Stage mapping and delegates to that agent following R.1 (starting from step 2, dispatch commit). The orchestrator MUST NOT execute stages assigned to other agents.

**Scope**: R.5 applies ONLY to user-initiated re-entry (from COMPLETED or from auxiliary flows B1/C-ADO1). Correction loops (O4→O3, O5→O3, O6→O3) are governed by R.7 and do NOT trigger archival.

**Archive policy**: the archive is never automatically deleted. All archived artifacts are retained for full traceability. Manual cleanup by the user is permitted but not required.

## R.6 — Git Conventions

- **Branch**: pipeline execution occurs on branch `pipeline/<project-name>`
- **Commit messages**: format `[<stage-id>] [<agent-name>] <description>` where `<agent-name>` is the agent that performed the work. Examples:
  - `[C1] [Orchestrator] Pipeline initialized`
  - `[C2] [Orchestrator] Dispatching to Prompt Refiner`
  - `[C2] [Prompt Refiner] Intent clarification completed`
  - `[O3] [Orchestrator] Dispatching Builder for module auth (1/5)`
  - `[O3] [Builder] Module auth implemented (1/5)`
  - `[RE-ENTRY] [Orchestrator] Return to O3 — artifacts archived in archive/20260316T120000/`
- **Tags**: on pipeline completion, tag with semantic version (e.g., `v1.0.0`)
- **Merge**: on completion and user confirmation, merge to `main`

## R.7 — Correction Loops

When a validation stage (O4, O5, or O6) identifies issues and the user chooses correction (option a or b):

1. **Return to O3**: the correction notes from the originating stage are passed to the orchestrator, which manages the O3 module loop for only the affected modules
2. **Re-execution from O4**: after O3 completes the corrections, the flow resumes from O4 (System Validation) and proceeds sequentially through all subsequent validation stages until reaching the stage that originated the correction. **Each re-traversed stage is delegated to its assigned agent**: O4 → Validator, O5 → Validator, O6 → Debugger. Each stage follows R.1 (dispatch commit → invoke assigned agent → return commit). The orchestrator MUST NOT execute these stages itself.
3. **No archival**: correction loops do not trigger R.5. Validation reports (`validator-report.md`, `security-audit-report.md`, `debugger-report.md`) are overwritten at the next execution of their respective stages
4. **Commit format**: correction loop commits follow the standard R.6 format, e.g., `[O3] [Builder] Module <name> corrected (correction from O4)`

**Examples**:
- O4→O3 correction: O3 → O4 (re-validates)
- O5→O3 correction: O3 → O4 → O5 (re-validates then re-audits)
- O6→O3 correction: O3 → O4 → O5 → O6 (full re-validation chain)

## R.8 — Escalation Protocol

When an agent encounters a problem it cannot resolve autonomously:

1. **Level 1 — In-context clarification**: the agent requests clarification from the user within the current stage context. The orchestrator relays the question and provides the answer back to the agent. The stage continues.
   - **In automode**: the orchestrator resolves the clarification autonomously based on project artifacts and context, without asking the user.
2. **Level 2 — Upstream revision**: the agent signals that an upstream artifact is ambiguous, inconsistent, or incomplete. The orchestrator reports the issue to the user and proposes re-entry at the appropriate upstream stage (following R.5). The user confirms or overrides.
   - **In automode**: the orchestrator determines the appropriate re-entry stage autonomously, executes R.5, and the pipeline re-traverses all intermediate stages automatically (automode auto-proceeds through applicable gates, except C2 and O10). If re-entry targets C2, automode is disabled before resumption per R.5/S.1.
3. **Level 3 — Fatal blockage**: the agent cannot proceed and no upstream revision would resolve the issue. The orchestrator applies R.2 (stop), documenting the blockage in the log. **This is the only escalation level that halts the pipeline in automode.** Non-escalation hard stops still apply (e.g., R.0 preflight `BLOCKED`, O10 manual closure gate). The user must intervene to resume.

## R.9 — Progress Metrics

The orchestrator maintains progress information in the manifest and communicates it in executive summaries:

- **Pipeline-level progress**: `manifest.json` records `progress.current_stage`, `progress.current_stage_index` (1-based), and `progress.total_stages` (count of stages in the active flow)
- **Sub-stage progress** (O3 only): during module generation, the manifest additionally records `progress.modules_completed`, `progress.modules_total`, and `progress.current_module`
- **Executive summary**: each executive summary (R.1 step 7) includes current progress (e.g., "Stage 12/19 — Module 3/8 completed")

## R.CONTEXT — Context Freshness

At every stage transition, the orchestrator reconstructs context from disk — NEVER relying on conversation history for artifact content:

1. **Re-read `pipeline-state/manifest.json`** (HEAD) from disk. From `current_state`, consult the State Machine for valid transitions. Then consult the Stage Routing Table to identify the next stage's entry conditions and required input artifact paths. Do NOT skip these lookups — perform them explicitly, even if you "remember" the next stage.
2. **Pass artifact paths** (not content) in subagent invocation prompts. Subagents read content from disk using their own tools.
3. **Accept only structured summaries** from returning subagents (per V.6). Full reports remain on disk.
4. **Conversation history** is for user interaction flow only — never for pipeline state. Routing decisions (which stage is next, what has been completed, which modules remain) MUST be derived from `manifest.json` on disk. **Conflict rule**: if the orchestrator's conversational memory of the pipeline state contradicts the manifest, the manifest ALWAYS wins.
5. **History access**: read `pipeline-state/manifest-history.json` ONLY when executing B1 (Resume audit), R.5 (Re-entry archival), or when the user explicitly requests pipeline history.
6. **Stale summary warning**: after O3 (or any stage producing many subagent exchanges), treat conversational summaries from earlier stages as potentially truncated or compressed by the harness. For any decision requiring cognitive-phase artifact content (e.g., requirements, architecture), re-read the source file from disk — never rely on an earlier summary.
7. **Compaction breakpoints**: at four pipeline breakpoints — **(a)** after C9 (cognitive→operational transition), **(b)** after O3 if more than 5 modules were generated, **(c)** after O10 when state becomes `COMPLETED`, and **(d)** immediately after R.5 re-entry archival/commit — the orchestrator produces a **Pipeline Checkpoint** block and triggers autonomous context compaction when supported by the platform. This is the primary mechanism for keeping the orchestrator's context lean across long pipeline runs and across pipeline restarts.

   The checkpoint is a structured block written directly in the conversation containing: current state, progress, automode/fast-track status, known issues, active user instructions, next stage with required input artifacts, and pending gate status. The checkpoint format is defined by each platform's agent configuration.

   **Breakpoint-specific behavior**:
   - **Post-C9** (`post-cognitive`): checkpoint captures handoff status, module count, and operational phase entry state. All cognitive reasoning, user gate conversations, and intermediate decisions are safe to discard — they are fully encoded in committed artifacts.
   - **Post-O3** (`post-o3`): checkpoint captures module completion status, any flagged issues, and validation readiness. All per-module subagent conversations and dispatch details are safe to discard — per-module reports and code are committed.
   - **Post-O10** (`post-o10`): checkpoint captures final completion status, release context, and the current user iteration/closure decision state. All pre-O10 operational conversations are safe to discard — final artifacts and manifest are committed.
   - **Post-reentry** (`post-reentry`): checkpoint captures re-entry target stage, archive path, scope impact, and immediate next dispatch. All superseded conversations from invalidated scope are safe to discard.

   After writing the checkpoint, autonomous compaction should run (platform support permitting). The checkpoint block must be preserved verbatim through summarization. Manual compaction remains a fallback safety mechanism.

This prevents context window saturation during long pipeline runs. The orchestrator operates as a thin coordination layer: manifest state + routing decisions + brief summaries.

## R.10 — Post-Completion Re-Entry Guide

When the user selects "Iteration" at O10, or returns to a COMPLETED project in a new session, the orchestrator presents this guide to help select the appropriate re-entry point:

| Scenario | Recommended Re-Entry | Agent | Rationale |
|----------|---------------------|-------|-----------|
| New feature or requirement (raw/ambiguous request) | C2 | Prompt Refiner | Disambiguate intent, then formalize → extract requirements → cascade through design and implementation |
| New feature or requirement (clear, well-defined spec) | C3 or C4 | Prompt Refiner | Formalize or extract requirements directly, then cascade through design and implementation |
| Architecture redesign | C7 | Architect | Redesign architecture; all operational stages will be re-executed |
| Bug fix (user-reported, diagnosis needed) | O6 | Debugger | Diagnose via smoke tests, then correction loop R.7 for code fix |
| Bug fix (known root cause) | O3 | Builder | Direct code fix, then re-validation through O4→O5→O6 |
| Security vulnerability | O5 | Validator | Re-audit security, then correction loop R.7 if fix needed |
| Documentation update only | O7 | Builder | Regenerate documentation |
| CI/CD reconfiguration | O8 | Builder | Reconfigure pipeline |
| New release version | O9 | Orchestrator | Tag new version, generate changelog |

**New session with COMPLETED project**: when a user initiates a new pipeline session with an existing project whose manifest shows `COMPLETED`, the orchestrator reads the manifest, informs the user of the project status, and presents this re-entry guide. The user selects the re-entry point and R.5 is applied.

**Notes**:
- Re-entry at a cognitive stage (C2–C9) invalidates all operational stages per S.1 — the orchestrator MUST inform the user of this impact before proceeding.
- Re-entry at an operational stage (O1–O9) preserves cognitive artifacts.
- The user may choose a different stage than recommended — the orchestrator validates the choice per S.1 but does not block it.
- **Fast Track option**: for interventions that do not require architectural or requirements changes, the orchestrator may propose Fast Track mode (R.12) as an alternative to the standard full-pipeline re-entry. See R.12 for criteria and flow.

## R.11 — Automode

Automode allows the user to delegate all decisions to the pipeline, bypassing user gates with a mandatory policy of resolving all issues found at every stage.

**Activation**:
- The user can activate automode at any point after C4 (requirements confirmed) by explicit request
- The orchestrator records `automode: true` in `manifest.json`
- Commit: `[AUTOMODE] [Orchestrator] Automode activated`

**Behavior when active**:
- All user gates become **auto-proceed**, except exemptions below
- At stages with revision cycles (C7, C8, C9): if the agent or validator finds issues, the orchestrator ALWAYS chooses "revise" and loops until resolved
- At O4/O5/O6: if issues are found, the orchestrator ALWAYS chooses "full correction" (option a) and triggers R.7. The orchestrator NEVER chooses "no correction → proceed"
- C8 "architecture invalid": the orchestrator ALWAYS returns to C7 with revision notes
- Executive summaries are still written to the user (passive monitoring)
- The user can intervene at any time: any user message during automode is treated as an instruction and takes priority over automode behavior

**Exemptions**:
- **C2 (Intent Clarification)**: always requires explicit user confirmation — automode does NOT auto-proceed at C2.
- **O10 (Closure)**: always requires explicit user confirmation — automode does NOT auto-proceed past O10. The user must confirm closure or select iteration.
- **R.8 Level 3 (Fatal blockage)**: always halts the pipeline, even in automode.
- **R.0 preflight `BLOCKED`**: always halts progression until user intervention, even in automode.

**Note**: R.8 Level 1 and Level 2 are NOT exempt from automode — the orchestrator handles them autonomously (see R.8 for details).

**Deactivation**:
- The user says "automode off" (or equivalent) at any time
- The orchestrator records `automode: false` in `manifest.json`
- Commit: `[AUTOMODE] [Orchestrator] Automode deactivated`
- From this point, user gates resume normally

## R.12 — Fast Track Mode

Fast Track provides a shortened operational path for focused interventions on COMPLETED projects that do not alter architecture or requirements.

**Eligibility criteria** (ALL must be true):
1. The project is in `COMPLETED` state
2. The intervention does NOT require changes to `architecture.md`, `interface-contracts.md`, or `api.md`
3. The intervention does NOT add new functional requirements to `project-spec.md`
4. The intervention does NOT introduce new dependencies to `environment.md`
5. The request is **sufficiently clear and unambiguous** — the orchestrator can determine exact scope and affected modules without further clarification from the user

**Activation flow**:
1. The user requests an intervention on a COMPLETED project
2. The orchestrator evaluates the eligibility criteria above
3. If eligible, the orchestrator proposes Fast Track to the user with explicit justification (listing which criteria are met and why)
4. The user confirms Fast Track (if rejected → standard full-pipeline re-entry via R.5 + R.10)
5. The orchestrator records in `manifest.json`: `fast_track.active = true`, `fast_track.activated_at`, `fast_track.reason`, and `fast_track.affected_modules`

**Declassification**: if during Fast Track evaluation or execution the orchestrator determines the request is ambiguous, under-specified, or has scope that cannot be confidently determined, Fast Track is **not eligible**. The orchestrator informs the user and falls back to standard re-entry via R.10 (starting from C2 for disambiguation).

**Fast Track execution**:
1. **Archive**: apply R.5 archival for stages O4 onward (reports/releases that will be re-executed). For O3, archive only the **affected modules'** artifacts — unaffected module code and reports are preserved in place, not archived.
2. **O3**: invoke Builder only for affected modules (any number of modules is allowed — scope is determined by the intervention, not an arbitrary limit)
3. **O4**: System Validation → Validator — **ALWAYS mandatory**, never skippable
4. **O5**: Security Audit → Validator — mandatory IF the changes touch input handling, authentication, authorization, or dependencies. The orchestrator decides; user can override.
5. **O6**: Debug → Debugger — mandatory IF the trigger was a bug report. Otherwise optional; the orchestrator decides; user can override.
6. **O7**: Documentation → Builder — SKIP if no new APIs, configuration changes, or user-facing behavior changes. The orchestrator decides; user can override.
7. **O8**: CI/CD → Builder — SKIP if CI/CD configuration is unchanged. The orchestrator decides; user can override.
8. **O8.V**: CI Verification → Orchestrator — mandatory if O8 was executed. Skip if O8 was skipped.
9. **O9**: Release → Orchestrator — patch version bump (mandatory)
10. **O10**: Closure → Orchestrator — standard user gate applies (user confirms closure or selects further iteration). Set `fast_track.active = false` upon closure.

**Skip tracking**: for every skipped stage, the orchestrator records in `manifest.json` under `fast_track.skipped_stages`: stage id, justification, and whether it was the orchestrator's decision or user override.

**Safety net**:
- O4 is ALWAYS executed — no exceptions
- If O4 finds architectural conformance issues that indicate the change has architectural impact, the Fast Track is **automatically cancelled**. The orchestrator informs the user and switches to the standard full-pipeline re-entry.
- If O4/O5/O6 find issues, R.7 correction loops apply normally (no shortcuts on corrections)

---

# Manifest Schema (Split Architecture)

The pipeline state is split across two files for context efficiency:

## HEAD — `pipeline-state/manifest.json`

Read at every stage transition (R.CONTEXT). Must stay small (<5 KB).

```json
{
  "schema_version": "4.1",
  "pipeline_id": "<unique-pipeline-identifier>",
  "project_name": "<project-name>",
  "created_at": "<ISO-8601-timestamp>",
  "current_state": "<state-id>",
  "progress": {
    "current_stage": "<stage-id>",
    "current_stage_index": 0,
    "total_stages": 0,
    "modules_completed": 0,
    "modules_total": 0,
    "current_module": "<module-name>"
  },
  "automode": false,
  "fast_track": {
    "active": false,
    "activated_at": null,
    "reason": null,
    "affected_modules": [],
    "skipped_stages": []
  },
  "latest_stages": {
    "<stage-id>": {
      "state": "<resulting-state>",
      "agent": "<agent-name>",
      "timestamp": "<ISO-8601-timestamp>",
      "commit_hash": "<git-commit-hash>",
      "artifacts": ["<path1>", "<path2>"],
      "execution_index": 1
    }
  }
}
```

## HISTORY — `pipeline-state/manifest-history.json`

Append-only log. **Never read during normal pipeline flow.** Read only by B1 (Resume audit), R.5 (Re-entry protocol), and on explicit user request.

```json
{
  "schema_version": "4.1",
  "pipeline_id": "<unique-pipeline-identifier>",
  "stages_completed": [
    {
      "stage_id": "<stage-id>",
      "state": "<resulting-state>",
      "agent": "<agent-name>",
      "timestamp": "<ISO-8601-timestamp>",
      "commit_hash": "<git-commit-hash>",
      "artifacts": ["<path1>", "<path2>"],
      "execution_index": 1
    }
  ],
  "re_entries": [
    {
      "timestamp": "<ISO-8601-timestamp>",
      "from_state": "<state-before-re-entry>",
      "to_stage": "<re-entry-stage-id>",
      "archive_path": "archive/<timestamp>/",
      "commit_hash": "<git-commit-hash>",
      "reason": "<user-provided-reason>"
    }
  ],
  "corrections": [
    {
      "timestamp": "<ISO-8601-timestamp>",
      "originating_stage": "<O4|O5|O6>",
      "correction_type": "full|selective",
      "notes_summary": "<brief-description>"
    }
  ]
}
```

## Field descriptions

- `schema_version`: manifest schema version (`4.1`), verified by B1 for compatibility. Both HEAD and HISTORY share the same version.
- `pipeline_id`: unique identifier for this pipeline execution. Same value in both files.
- `project_name`: human-readable project name, used in branch naming (R.6)
- `current_state`: the current state from the state machine. Can be a completed state (e.g., `C2_INTENT_CLARIFIED`) or an in-progress state (e.g., `C2_IN_PROGRESS`) indicating an active or interrupted invocation.
- `progress`: real-time progress tracking (see R.9). `current_module` is populated only during O3.
- `latest_stages` (HEAD only): map keyed by canonical stage_id (C1, C2, ..., O10). Contains only the most recent execution metadata per stage. Updated (upserted) at every stage completion — replaces previous entry for that stage_id. For C2 intermediate clarification rounds, it may hold in-progress metadata before final confirmation. Provides O(1) lookup for current pipeline state.
- `stages_completed` (HISTORY only): ordered append-only array of all completed stage records. `execution_index` is incremented when a stage is re-executed (revision cycle or correction loop).
- `re_entries` (HISTORY only): history of all re-entry events (R.5)
- `corrections` (HISTORY only): history of all correction loops (R.7)
- `automode`: whether automode is currently active (R.11). Default `false`.
- `fast_track`: Fast Track tracking data (R.12). Contains: `active` flag, activation timestamp, reason, affected modules, and skipped stages with justification.

## Update protocol

At every stage completion:
1. **HEAD**: update `current_state`, `progress`, upsert `latest_stages[<stage-id>]`
2. **HISTORY**: append entry to `stages_completed`
3. At re-entry (R.5): additionally append to HISTORY `re_entries`
4. At correction (R.7): additionally append to HISTORY `corrections`

**C2 intermediate rounds** (`NEEDS_CLARIFICATION` / user requests another round):
1. **HEAD**: keep `current_state = C2_IN_PROGRESS`, upsert `latest_stages[C2]` as in-progress metadata
2. **HISTORY**: do NOT append `stages_completed`
3. Append to `stages_completed` only when C2 is explicitly confirmed and state transitions to `C2_INTENT_CLARIFIED`

---

# Pipeline State Machine

## Valid States

### Completed states
```
C1_INITIALIZED
C2_INTENT_CLARIFIED
C3_PROBLEM_FORMALIZED
C4_REQUIREMENTS_EXTRACTED
C5_EXTERNAL_ANALYZED (or C5_SKIPPED)
C6_DOMAIN_MODELED
C7_ARCHITECTURE_SYNTHESIZED
C8_ARCHITECTURE_VALIDATED
C9_IMPLEMENTATION_PLANNED
O1_ENVIRONMENT_READY
O2_SCAFFOLD_CREATED
O3_MODULES_GENERATED
O4_SYSTEM_VALIDATED
O5_SECURITY_AUDITED
O6_DEBUG_COMPLETED
O7_DOCUMENTATION_GENERATED
O8_CICD_CONFIGURED
O8V_CI_VERIFIED
O9_RELEASED
COMPLETED
```

### In-progress states
```
C1_IN_PROGRESS
C2_IN_PROGRESS
C3_IN_PROGRESS
C4_IN_PROGRESS
C5_IN_PROGRESS
C6_IN_PROGRESS
C7_IN_PROGRESS
C8_IN_PROGRESS
C9_IN_PROGRESS
O1_IN_PROGRESS
O2_IN_PROGRESS
O3_IN_PROGRESS
O4_IN_PROGRESS
O5_IN_PROGRESS
O6_IN_PROGRESS
O7_IN_PROGRESS
O8_IN_PROGRESS
O8V_IN_PROGRESS
O9_IN_PROGRESS
O10_IN_PROGRESS
```

### System states
```
STOPPED
B1_AUDITING
C_ADO1_AUDITING
```

## Valid Transitions

```
# Dispatch transitions (orchestrator sets IN_PROGRESS before invoking agent)
C1_INITIALIZED           → C2_IN_PROGRESS                  [dispatch to Prompt Refiner after R.0 preflight PASS/WARN]
C2_IN_PROGRESS           → C2_INTENT_CLARIFIED             [user confirms intent after C2 clarification loop]
C2_INTENT_CLARIFIED      → C3_IN_PROGRESS                  [dispatch to Prompt Refiner]
C3_IN_PROGRESS           → C3_PROBLEM_FORMALIZED           [agent completes]
C3_PROBLEM_FORMALIZED    → C4_IN_PROGRESS                  [dispatch to Prompt Refiner]
C4_IN_PROGRESS           → C4_REQUIREMENTS_EXTRACTED       [agent completes]
C4_REQUIREMENTS_EXTRACTED → C5_IN_PROGRESS | C5_SKIPPED    [dispatch to Analyst or skip]
C5_IN_PROGRESS           → C5_EXTERNAL_ANALYZED            [agent completes]
C5_EXTERNAL_ANALYZED     → C6_IN_PROGRESS                  [dispatch to Architect]
C5_SKIPPED               → C6_IN_PROGRESS                  [dispatch to Architect]
C6_IN_PROGRESS           → C6_DOMAIN_MODELED               [agent completes]
C6_DOMAIN_MODELED        → C7_IN_PROGRESS                  [dispatch to Architect]
C7_IN_PROGRESS           → C7_ARCHITECTURE_SYNTHESIZED     [agent completes]
C7_ARCHITECTURE_SYNTHESIZED → C8_IN_PROGRESS               [dispatch to Validator]
C8_IN_PROGRESS           → C8_ARCHITECTURE_VALIDATED       [agent completes]
C8_ARCHITECTURE_VALIDATED → C7_IN_PROGRESS                 [architecture invalid — revision]
C8_ARCHITECTURE_VALIDATED → C9_IN_PROGRESS                 [dispatch to Architect]
C9_IN_PROGRESS           → C9_IMPLEMENTATION_PLANNED       [agent completes]
C9_IMPLEMENTATION_PLANNED → O1_IN_PROGRESS                 [after handoff check — dispatch to Builder]
O1_IN_PROGRESS           → O1_ENVIRONMENT_READY            [agent completes]
O1_ENVIRONMENT_READY     → O2_IN_PROGRESS                  [dispatch to Builder]
O2_IN_PROGRESS           → O2_SCAFFOLD_CREATED             [agent completes]
O2_SCAFFOLD_CREATED      → O3_IN_PROGRESS                  [orchestrator starts module loop]
O3_IN_PROGRESS           → O3_MODULES_GENERATED            [all modules completed]
O3_MODULES_GENERATED     → O4_IN_PROGRESS                  [dispatch to Validator]
O4_IN_PROGRESS           → O4_SYSTEM_VALIDATED             [agent completes]
O4_SYSTEM_VALIDATED      → O3_IN_PROGRESS                  [correction — R.7]
O4_SYSTEM_VALIDATED      → O5_IN_PROGRESS                  [dispatch to Validator]
O5_IN_PROGRESS           → O5_SECURITY_AUDITED             [agent completes]
O5_SECURITY_AUDITED      → O3_IN_PROGRESS                  [correction — R.7]
O5_SECURITY_AUDITED      → O6_IN_PROGRESS                  [dispatch to Debugger]
O6_IN_PROGRESS           → O6_DEBUG_COMPLETED              [agent completes]
O6_DEBUG_COMPLETED       → O3_IN_PROGRESS                  [correction — R.7]
O6_DEBUG_COMPLETED       → O7_IN_PROGRESS                  [dispatch to Builder]
O7_IN_PROGRESS           → O7_DOCUMENTATION_GENERATED      [agent completes]
O7_DOCUMENTATION_GENERATED → O8_IN_PROGRESS                [dispatch to Builder]
O8_IN_PROGRESS           → O8_CICD_CONFIGURED              [agent completes]
O8_CICD_CONFIGURED       → O8V_IN_PROGRESS                 [orchestrator starts CI verification]
O8V_IN_PROGRESS          → O8V_CI_VERIFIED                 [CI passes]
O8V_CI_VERIFIED          → O9_IN_PROGRESS                  [orchestrator starts O9]

# Fast Track transitions (R.12)
# When Fast Track is active, stages may be skipped per R.12 rules.
# The orchestrator transitions directly from the last completed stage to the
# next non-skipped stage's _IN_PROGRESS state. O4 is never skippable.
# Skipped stages are tracked in manifest.fast_track.skipped_stages.
O9_IN_PROGRESS           → O9_RELEASED                     [orchestrator completes]
O9_RELEASED              → O10_IN_PROGRESS                 [orchestrator starts O10]
O10_IN_PROGRESS          → COMPLETED                       [orchestrator completes]
COMPLETED                → any state C2–O9 _IN_PROGRESS    [re-entry — R.5, validated]
any state                → STOPPED                         [user stop or fatal error]
STOPPED                  → B1_AUDITING                     [resume request]
STOPPED                  → C_ADO1_AUDITING                 [adoption request]
C1_INITIALIZED           → C_ADO1_AUDITING                 [adoption mode from C1]
B1_AUDITING              → any state C1–O9                 [resumable — audit result]
B1_AUDITING              → C_ADO1_AUDITING                 [not resumable — adoption]
C_ADO1_AUDITING          → any state C1–O9                 [conformance plan complete]

# IN_PROGRESS recovery (from B1 or manual resume)
any *_IN_PROGRESS state  → same stage _IN_PROGRESS         [re-execute from scratch]
```

## State Machine Scoping Rules (S.1)

**Re-entry validation**: when the user requests re-entry from COMPLETED, the orchestrator validates the re-entry point:
- Re-entry at a **cognitive stage** (C2–C9) automatically invalidates all operational stages (O1–O10). All operational artifacts are archived per R.5.
- Re-entry at an **operational stage** (O1–O9) preserves cognitive artifacts and archives only operational artifacts from the re-entry point onward.
- Re-entry targeting **C2** forces `automode: false` before resumption, preserving mandatory interactive clarification.
- The orchestrator reports the impact to the user before executing the re-entry.

**Correction loops vs re-entry**: correction loops (O4/O5/O6→O3) are governed by R.7 and do NOT trigger R.5. They are internal operational cycles, not re-entries.

**IN_PROGRESS recovery**: if the manifest shows an `_IN_PROGRESS` state (indicating an interrupted invocation), B1 (Continuity Audit) recommends re-executing that stage from scratch. The `_IN_PROGRESS` artifacts (if any partial files were created but not committed) are discarded.

## Invariants

- The current state is always recorded in `manifest.json`
- Only one state is active at any time
- User-initiated backward transitions (re-entry) activate R.5 (Re-Entry Protocol)
- Correction loops activate R.7 (Correction Loops) — no archival
- The `STOPPED` state preserves the last valid state in the manifest to enable resume
- Auxiliary flow states (`B1_AUDITING`, `C_ADO1_AUDITING`) are transient — they resolve to a main pipeline state
- Every transition between orchestrator and subagent produces a commit (dispatch and return)
- An `_IN_PROGRESS` state always has a corresponding dispatch commit in the Git history
- When automode is active, every user gate resolves to "proceed" or "full correction" — never to "skip" or "no correction", except C2 and O10 which always require explicit user confirmation
- R.0 preflight `BLOCKED` state is always a hard stop until user intervention (automode does not bypass)
- When Fast Track is active, O4 is never skipped and any architectural finding cancels the Fast Track

---

# Pipeline Summary

```
COGNITIVE PIPELINE

C1  Initialization                   (Orchestrator)
C2  Intent Clarification             (Prompt Refiner)
C3  Problem Formalization            (Prompt Refiner)
C4  Requirements Extraction          (Prompt Refiner)
C5  External Source Analysis         (Analyst)          [conditional]
C6  Constraint Analysis and Domain   (Architect)
C7  Architecture Synthesis           (Architect)
C8  Architecture Validation          (Validator)
C9  Implementation Planning          (Architect)

    [Cognitive-to-Operational Handoff Check]

↓

OPERATIONAL PIPELINE

O1  Environment Setup                (Builder)
O2  Repository Scaffold              (Builder)
O3  Module Generation                (Builder — per-module, orchestrator-managed)
O4  System Validation                (Validator)
O5  Security Audit                   (Validator)
O6  Debug and Smoke Test             (Debugger)
O7  Documentation Generation         (Builder)
O8  CI/CD Configuration              (Builder)
O8V CI Verification                  (Orchestrator — iterative loop)
O9  Release and Deployment           (Orchestrator)
O10 Closure and Final Report         (Orchestrator)

AUXILIARY FLOWS

B1      Continuity Audit             (Auditor)          [Resume]
C-ADO1  Conformance Audit            (Auditor)          [Adoption]
```

---

*End of formal pipeline model v4.1.*
