# Software Development Pipeline Formal Model — v1.0

---

# Design Constraints

- **V.1 — Single-user model**: the pipeline is designed for a single user interacting with the orchestrator. No role management, permissions, or multi-user interactions are supported.
- **V.2 — Stateless agents**: all agents (including the orchestrator) are stateless. Context is reconstructed at each invocation from committed artifacts and the pipeline manifest. No implicit memory exists between invocations.
- **V.3 — Git as source of truth**: the Git repository is the single source of truth. The pipeline state is always determinable from the manifest and committed artifacts.

---

# Cognitive Pipeline

Goal: progressively transform an ambiguous user idea into a complete, validated implementation plan.

---

## C1 — Initialization

- **Purpose**: set up the pipeline infrastructure and establish a traceable starting point for the project.
- **Input**:
  - `user_request` — user request to start a new project (natural language)
- **Output**:
  - `pipeline-state/manifest.json` — initial pipeline manifest (state: `C1_INITIALIZED`)
  - `logs/session-init.md` — initialization session log
  - directory structure: `docs/`, `logs/`, `pipeline-state/`, `archive/`
- **Transformation**: an informal request is converted into a traceable repository structure with a state manifest.
- **Validation criteria**:
  - the Git repository is initialized and accessible
  - directories `docs/`, `logs/`, `pipeline-state/`, `archive/` exist
  - `manifest.json` contains state `C1_INITIALIZED` with timestamp
  - the initial commit has been executed
- **Resulting state**: `C1_INITIALIZED`

---

## C2 — Intent Clarification

- **Purpose**: interpret and disambiguate the user's original idea, establishing terminology, context, and assumptions.
- **Input**:
  - `user_request` — project description in natural language
  - `pipeline-state/manifest.json` — current pipeline state
- **Output**:
  - `docs/intent.md` — interpreted intent: goal, system context, assumptions, clarified terminology
  - `logs/prompt-refiner-c2-conversation.md` — conversation log
- **Transformation**: an informally expressed idea is analyzed to identify the actual goal, usage context, and implicit assumptions, producing a structured intent document.
- **Validation criteria**:
  - `intent.md` contains sections for: interpreted goal, system context, assumptions, terminology
  - the user has confirmed that the interpretation is correct (user gate passed)
  - the conversation log has been committed
- **User gate**: confirmation of the interpreted intent
- **Revision cycle**: if the user is unsatisfied, feedback is passed to the Prompt Refiner and the stage repeats
- **Resulting state**: `C2_INTENT_CLARIFIED`

---

## C3 — Problem Formalization

- **Purpose**: produce a concise technical system definition from the clarified intent.
- **Input**:
  - `docs/intent.md`
- **Output**:
  - `docs/problem-statement.md` — technical system definition: system goal, expected inputs, expected outputs, high-level behavior
  - `logs/prompt-refiner-c3-conversation.md` — conversation log
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

- **Purpose**: extract functional requirements, non-functional requirements, and acceptance criteria from the problem definition.
- **Input**:
  - `docs/intent.md`
  - `docs/problem-statement.md`
- **Output**:
  - `PROMPT.md` — complete project specification: functional requirements, non-functional requirements, scope, constraints, acceptance criteria
  - `logs/prompt-refiner-c4-conversation.md` — conversation log
- **Transformation**: the technical problem definition is decomposed into discrete, verifiable, and traceable requirements with explicit acceptance criteria.
- **Validation criteria**:
  - `PROMPT.md` contains sections for: functional requirements (numbered), non-functional requirements (numbered), constraints, acceptance criteria
  - every requirement is traceable to `problem-statement.md`
  - the user has confirmed document completeness (user gate passed)
- **User gate**: confirmation of requirements completeness
- **Revision cycle**: if the user is unsatisfied, feedback is passed to the Prompt Refiner and the stage repeats
- **Resulting state**: `C4_REQUIREMENTS_EXTRACTED`

---

## C5 — External Source Analysis [conditional]

- **Purpose**: analyze external code and architectures relevant to the project, extracting reusable patterns and logic.
- **Entry condition**: `PROMPT.md` contains references to external code sources (orchestrator decision confirmed by user)
- **Input**:
  - `PROMPT.md` — references to external sources
- **Output**:
  - `docs/upstream-analysis.md` — detailed analysis of external sources (extracted logic, configuration models, architectural patterns, licenses)
  - `logs/analyst-conversation.md` — conversation log
- **Transformation**: references to external sources are converted into a structured analysis document focused on elements relevant to the current project.
- **Validation criteria**:
  - every source referenced in `PROMPT.md` has been analyzed or documented as inaccessible
  - `upstream-analysis.md` links each extracted element to its original source
  - the user has confirmed analysis quality (user gate passed)
- **Access error handling**: if an external source is inaccessible (authentication, network, invalid URL), the Analyst documents the failure in the report with: source, error type, estimated impact on the project, and requests user instructions to proceed (alternative source, skip, credentials).
- **Bypass**: if no external sources exist, the stage is skipped and `upstream-analysis.md` is not produced. Subsequent stages must function with or without this artifact.
- **Resulting state**: `C5_EXTERNAL_ANALYZED` (or `C5_SKIPPED`)

---

## C6 — Constraint Analysis and Domain Modeling

- **Purpose**: identify system operational constraints and build the domain conceptual model.
- **Input**:
  - `PROMPT.md`
  - `docs/upstream-analysis.md` (optional)
- **Output**:
  - `docs/constraints.md` — performance, security, environment, scalability constraints
  - `docs/domain-model.md` — domain entities, relationships, operations
- **Transformation**: requirements and external analysis are analyzed to extract explicit and implicit constraints and to build the application domain conceptual model.
- **Validation criteria**:
  - every constraint is classified by category (performance, security, environment, scalability)
  - the domain model covers all entities mentioned in requirements
  - no constraints are mutually conflicting
- **Resulting state**: `C6_DOMAIN_MODELED`

---

## C7 — Architecture Synthesis

- **Purpose**: define the system architecture, APIs, interface contracts, and configuration model.
- **Input**:
  - `PROMPT.md`
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

- **Purpose**: verify architecture consistency against requirements, constraints, and domain model before proceeding to implementation.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `PROMPT.md`
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

- **Purpose**: decompose the architecture into implementable tasks, define the dependency graph, execution sequence, and test strategy.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/constraints.md`
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
PROMPT.md
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

These artifacts are consumed by the Operational Pipeline.

---

# Operational Pipeline

Goal: execute the implementation plan and produce working, tested, secure, documented, and releasable software.

---

## O1 — Environment Setup

- **Purpose**: configure the project development environment based on architectural specifications and the configuration model.
- **Input**:
  - `docs/architecture.md`
  - `docs/configuration.md`
  - `docs/constraints.md`
- **Output**:
  - `docs/environment.md` — environment specification: required runtimes (language, version), dependencies (with lockfile), environment variables, build tools
  - environment configuration files (`package.json`, `requirements.txt`, `Dockerfile`, or equivalent for the chosen language)
- **Transformation**: architectural specifications and the configuration model are translated into the concrete development environment configuration.
- **Validation criteria**:
  - every dependency is specified with version
  - a lockfile is present for reproducibility
  - required environment variables are documented in `environment.md`
  - the environment can be recreated from scratch using the artifacts (portability)
- **Resulting state**: `O1_ENVIRONMENT_READY`

---

## O2 — Repository Scaffold

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

## O3 — Module Generation (Builder)

- **Purpose**: implement code module by module following the implementation plan and dependency graph, producing code and tests jointly for each module.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/task-graph.md`
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `docs/test-strategy.md`
- **Output** (per module):
  - `src/<module>/` — module source code
  - `tests/<module>/` — module tests (conforming to `test-strategy.md`)
  - `logs/builder-report-module-N.md` — per-module report with sub-sections:
    - module spec confirmed
    - code implemented (files produced)
    - tests implemented (files produced)
    - test execution results
    - issues encountered
- **Output** (on completion):
  - `logs/builder-cumulative-report.md` — cumulative report
- **Transformation**: each module's specifications are converted into working code with associated tests, following the task graph order and test strategy.
- **Validation criteria**:
  - every module declared in the plan is implemented
  - every module has tests conforming to the strategy defined in `test-strategy.md`
  - module tests pass before proceeding to the next module
  - a commit has been executed for each completed module
- **Internal cycle**: the Builder iterates over each module. Feedback to the user is informational only and does not require confirmation.
- **Error handling**: if a module fails, the orchestrator notifies the user and awaits instructions (retry, skip, stop).
- **Resulting state**: `O3_MODULES_GENERATED`

---

## O4 — System Validation (Validator)

- **Purpose**: verify overall system conformance against the architecture, requirements, and interface contracts, with explicit quality gates.
- **Input**:
  - `src/` — complete source code
  - `tests/` — complete test suite
  - `docs/architecture.md`
  - `docs/interface-contracts.md`
  - `docs/test-strategy.md`
  - `PROMPT.md`
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
  - **a)** full correction → return to O3 with all notes
  - **b)** selective correction → return to O3 with selected points
  - **c)** no correction → proceed
- **Resulting state**: `O4_SYSTEM_VALIDATED`

---

## O5 — Security Audit

- **Purpose**: verify application security through vulnerability analysis, dependency auditing, and security pattern verification.
- **Input**:
  - `src/` — complete source code
  - `docs/constraints.md` — security constraints
  - `docs/architecture.md`
  - dependency configuration files (lockfile)
- **Output**:
  - `docs/security-audit-report.md` — security report with sub-sections:
    - **OWASP analysis**: verification of applicable Top 10 risks
    - **Dependency audit**: known vulnerabilities in dependencies (CVE)
    - **Security patterns**: verification of authentication, authorization, input sanitization patterns
    - **Recommendations**: corrective actions ordered by severity
- **Transformation**: code and dependencies are systematically analyzed against known security patterns and declared constraints.
- **Validation criteria**:
  - every dependency has been checked for known vulnerabilities
  - applicable OWASP risks have been verified
  - every found vulnerability has a severity and recommendation
- **User gate**: the user chooses between:
  - **a)** full correction → return to O3 with all security notes
  - **b)** selective correction → return to O3 with selected points
  - **c)** no correction needed → proceed
- **Resulting state**: `O5_SECURITY_AUDITED`

---

## O6 — Debug and Smoke Test (Debugger)

- **Purpose**: exercise the application in a controlled environment, capture logs, and identify runtime bugs not found during validation.
- **Input**:
  - `src/` — complete source code
  - `docs/architecture.md`
  - `docs/validator-report.md`
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
  - **a)** full correction → return to O3 with all notes
  - **b)** selective correction → return to O3 with selected points
  - **c)** no bugs → proceed
- **Resulting state**: `O6_DEBUG_COMPLETED`

---

## O7 — Documentation Generation

- **Purpose**: produce user and developer documentation for the project.
- **Input**:
  - `src/` — complete source code
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/configuration.md`
  - `docs/environment.md`
- **Output**:
  - `README.md` — project documentation: description, requirements, installation, usage, configuration
  - `docs/api-reference.md` — developer API documentation (generated from code and `api.md`)
  - `docs/installation-guide.md` — installation and configuration guide
- **Transformation**: architectural artifacts and source code are synthesized into documentation oriented to end users and developers.
- **Validation criteria**:
  - `README.md` contains: description, prerequisites, installation instructions, usage instructions
  - `api-reference.md` covers all public APIs
  - `installation-guide.md` is sufficient to reproduce the environment from scratch
- **Resulting state**: `O7_DOCUMENTATION_GENERATED`

---

## O8 — CI/CD Configuration

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

## O9 — Release and Deployment

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
  - **Iteration**: re-entry at a specific pipeline point (C2–O9) providing instructions. On re-entry the **Re-Entry Protocol** (R.5) is applied.
  - **Closure**: the pipeline is concluded
- **Resulting state**: `COMPLETED`

---

# Flow B — Project Resume

---

## B1 — Continuity Audit

- **Purpose**: analyze an existing repository to determine if the project can be resumed from its interruption point.
- **Input**:
  - repository contents
  - `pipeline-state/manifest.json` (if present)
- **Output**:
  - `docs/audit-report.md` — audit report with sub-sections:
    - **Artifact inventory**: found artifacts, classified by originating stage
    - **Consistency analysis**: cross-referencing between artifacts and expected pipeline structure
    - **Pipeline state**: last valid state identified
    - **Interruption point**: stage at which the project stopped
    - **Recommendation**: resume (with re-entry point) or adoption (with justification)
  - `logs/auditor-analysis.md` — analysis log
- **Transformation**: artifacts present in the repository are compared against the expected pipeline structure to determine project state and consistency.
- **Validation criteria**:
  - every found artifact has been classified against its originating stage
  - the interruption point has been uniquely identified
  - the report contains an explicit recommendation (resume or adoption)
- **RESUME/ADOPTION threshold criteria**:
  - **RESUMABLE** if: `manifest.json` exists AND is valid AND all artifacts referenced in the manifest are present AND the last completed stage is uniquely identifiable
  - **ADOPTION** if: `manifest.json` is absent OR corrupted OR artifacts do not match the manifest OR the last completed stage cannot be uniquely determined
- **User gate**: the user confirms the audit result
- **Outcome**:
  - **Resumable**: re-entry into the main flow (C/O) at the identified point. The orchestrator reconstructs context by reading: manifest, artifacts from the last completed stage, conversation logs.
  - **Not resumable**: recommendation to switch to Flow C (Adoption)
- **Resulting state**: state of the last completed stage (as determined by audit)

---

# Flow C — Project Adoption

---

## C-ADO1 — Conformance Audit

- **Purpose**: analyze a non-conforming repository to produce an adoption plan that makes it pipeline-compatible.
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
- **Plan execution**: the orchestrator executes the conformance plan actions by invoking the appropriate agents for each missing artifact, in the order specified by the plan. Each produced artifact follows the standard pattern (R.1).
- **Transition**: once the plan is complete, re-entry into the main flow at the identified point
- **Resulting state**: state of the identified re-entry stage

---

# Cross-Cutting Rules

## R.1 — Standard Interaction Pattern

Every stage follows the pattern:

1. The orchestrator reconstructs its own context by reading: `manifest.json` (pipeline state), artifacts from the current and preceding stages, last relevant conversation logs
2. The orchestrator assigns the task to the specialized agent, transmitting as input: formal stage artifacts, a context brief summarizing relevant conversation, any user feedback notes
3. The agent produces the artifacts and returns the result to the orchestrator
4. The orchestrator executes a commit with message in format `[<stage-id>] <description>`
5. The orchestrator updates `manifest.json` with: completed stage, timestamp, produced artifacts, commit hash
6. The orchestrator writes in the chat an **executive summary** of the agent's report, indicating the location of the full report in the repository (e.g., "Full report: `docs/validator-report.md`")
7. If a user gate is required: awaits confirmation or feedback
8. If feedback is negative: the cycle repeats from step 2 with the user's notes

## R.2 — Atomicity and Stop

- Every agent operation is an atomic unit of work: invocation completion + artifact production + commit
- **Stop triggers**:
  - Explicit user command (always available)
  - Fatal agent error (automatic)
  - No automatic timeout or budget-based stops — the user must stop explicitly
- On stop request: in-progress changes are discarded and rollback to last commit
- **Stop during commit**: if stop occurs during the commit operation, rollback to the previous commit (pre-operation). The partial commit is discarded.
- **Stop during Builder cycle (O3)**: each committed module is independent. Stop interrupts the in-progress module (discarded) and preserves already committed modules.
- The pipeline state is always determinable from the manifest and committed artifacts

## R.3 — Traceability

- Every invocation produces a log in `logs/`
- **Log format**: Markdown, with structure:
  ```
  # Log [stage-id] — [timestamp]
  ## Agent: [agent name]
  ## Stage: [stage name]
  ### Conversation
  - **[role]** [timestamp]: [content]
  ```
- The manifest (`pipeline-state/manifest.json`) is updated at every commit with:
  - completed stage
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

When the user chooses to re-enter the pipeline at a previous point (from O10, or from B1/C-ADO1):

1. **Archival**: artifacts produced by stages after the re-entry point are moved to `archive/<timestamp>/`, preserving the original structure
2. **Manifest update**: `manifest.json` is updated to reflect the new state (the re-entry stage state), with reference to the archive for traceability
3. **Commit**: the re-entry is committed with message `[RE-ENTRY] Return to <stage-id> — artifacts archived in archive/<timestamp>/`
4. **Resumption**: execution resumes from the indicated stage with artifacts from preceding stages intact

## R.6 — Git Conventions

- **Branch**: pipeline execution occurs on branch `pipeline/<project-name>`
- **Commit messages**: format `[<stage-id>] <description>` (e.g., `[C7] Architecture synthesis completed`)
- **Tags**: on pipeline completion, tag with semantic version (e.g., `v1.0.0`)
- **Merge**: on completion and user confirmation, merge to `main`

---

# Pipeline State Machine

## Valid States

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
O9_RELEASED
COMPLETED
STOPPED
```

## Valid Transitions

```
C1_INITIALIZED           → C2_INTENT_CLARIFIED
C2_INTENT_CLARIFIED      → C3_PROBLEM_FORMALIZED
C3_PROBLEM_FORMALIZED    → C4_REQUIREMENTS_EXTRACTED
C4_REQUIREMENTS_EXTRACTED → C5_EXTERNAL_ANALYZED | C5_SKIPPED
C5_EXTERNAL_ANALYZED     → C6_DOMAIN_MODELED
C5_SKIPPED               → C6_DOMAIN_MODELED
C6_DOMAIN_MODELED        → C7_ARCHITECTURE_SYNTHESIZED
C7_ARCHITECTURE_SYNTHESIZED → C8_ARCHITECTURE_VALIDATED
C8_ARCHITECTURE_VALIDATED → C7_ARCHITECTURE_SYNTHESIZED    [architecture invalid]
C8_ARCHITECTURE_VALIDATED → C9_IMPLEMENTATION_PLANNED
C9_IMPLEMENTATION_PLANNED → O1_ENVIRONMENT_READY
O1_ENVIRONMENT_READY     → O2_SCAFFOLD_CREATED
O2_SCAFFOLD_CREATED      → O3_MODULES_GENERATED
O3_MODULES_GENERATED     → O4_SYSTEM_VALIDATED
O4_SYSTEM_VALIDATED      → O3_MODULES_GENERATED            [correction]
O4_SYSTEM_VALIDATED      → O5_SECURITY_AUDITED
O5_SECURITY_AUDITED      → O3_MODULES_GENERATED            [security correction]
O5_SECURITY_AUDITED      → O6_DEBUG_COMPLETED
O6_DEBUG_COMPLETED       → O3_MODULES_GENERATED            [bug correction]
O6_DEBUG_COMPLETED       → O7_DOCUMENTATION_GENERATED
O7_DOCUMENTATION_GENERATED → O8_CICD_CONFIGURED
O8_CICD_CONFIGURED       → O9_RELEASED
O9_RELEASED              → COMPLETED
COMPLETED                → any state C2–O9                 [user re-entry]
any state                → STOPPED                         [user stop or fatal error]
STOPPED                  → any state                       [resume/adoption]
```

## Invariants

- The current state is always recorded in `manifest.json`
- Only one state is active at any time
- Backward transitions (correction, re-entry) activate the Re-Entry Protocol (R.5)
- The `STOPPED` state preserves the last valid state in the manifest to enable resume

---

# Pipeline Summary

```
COGNITIVE PIPELINE

C1  Initialization
C2  Intent Clarification             (Prompt Refiner)
C3  Problem Formalization            (Prompt Refiner)
C4  Requirements Extraction          (Prompt Refiner)
C5  External Source Analysis         (Analyst)         [conditional]
C6  Constraint Analysis and Domain
C7  Architecture Synthesis           (Architect)
C8  Architecture Validation
C9  Implementation Planning

↓

OPERATIONAL PIPELINE

O1  Environment Setup
O2  Repository Scaffold
O3  Module Generation                (Builder)
O4  System Validation                (Validator)
O5  Security Audit
O6  Debug and Smoke Test             (Debugger)
O7  Documentation Generation
O8  CI/CD Configuration
O9  Release and Deployment
O10 Closure and Final Report

AUXILIARY FLOWS

B1      Continuity Audit             (Auditor)         [Resume]
C-ADO1  Conformance Audit            (Auditor)         [Adoption]
```

---

*End of formal pipeline model v1.0.*
