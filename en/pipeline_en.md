# Formal Model of the Software Development Pipeline

---

# Cognitive Pipeline

Goal: progressively transform an ambiguous user idea into a complete, validated implementation plan.

---

## C1 — Initialization

- **Purpose**: set up the pipeline infrastructure and establish a traceable starting point for the project.
- **Input**:
  - `user_request` — user request to start a new project (natural language)
- **Output**:
  - `pipeline-state/manifest.json` — initial pipeline manifest (state: initialized)
  - `logs/session-init.md` — initialization session log
  - directory structure: `docs/`, `logs/`, `pipeline-state/`
- **Transformation**: an informal request is converted into a traceable repository structure with a state manifest.
- **Validation criteria**:
  - the Git repository is initialized and accessible
  - directories `docs/`, `logs/`, `pipeline-state/` exist
  - `manifest.json` contains state `initialized` with timestamp
  - the initial commit has been performed

---

## C2 — Requirements Gathering

- **Purpose**: capture and formalize project requirements through iterative conversation with the user.
- **Input**:
  - `user_request` — natural language conversation with the user
  - `pipeline-state/manifest.json` — current pipeline state
- **Output**:
  - `PROMPT.md` — complete project specification (functional requirements, non-functional requirements, scope, constraints, acceptance criteria)
  - `logs/prompt-refiner-conversation.md` — conversation log
- **Transformation**: an idea expressed in natural language is progressively refined into a structured specification document through user feedback cycles.
- **Validation criteria**:
  - `PROMPT.md` contains sections for: objective, functional requirements, non-functional requirements, constraints, acceptance criteria
  - the user has explicitly confirmed document completeness (user gate passed)
  - the conversation log has been committed

---

## C3 — External Source Analysis [conditional]

- **Purpose**: analyze external code and architectures relevant to the project, extracting reusable patterns and logic.
- **Entry condition**: `PROMPT.md` contains references to external code sources (orchestrator decision confirmed by user)
- **Input**:
  - `PROMPT.md` — references to external sources
- **Output**:
  - `docs/upstream-analysis.md` — detailed analysis of external sources (extracted logic, configuration models, architectural patterns, licenses)
  - `logs/analyst-conversation.md` — conversation log
- **Transformation**: references to external sources are converted into a structured analysis document focused on elements relevant to the current project.
- **Validation criteria**:
  - every source referenced in `PROMPT.md` has been analyzed
  - `upstream-analysis.md` links each extracted element to its original source
  - the user has confirmed analysis quality (user gate passed)
- **Bypass**: if there are no external sources, the stage is skipped and `upstream-analysis.md` is not produced. The subsequent stage must function with or without this artifact.

---

## C4 — Constraint Analysis and Domain Modeling

- **Purpose**: identify the system's operational constraints and build the conceptual domain model.
- **Input**:
  - `PROMPT.md`
  - `docs/upstream-analysis.md` (optional)
- **Output**:
  - `docs/constraints.md` — performance, security, environment, and scalability constraints
  - `docs/domain-model.md` — domain entities, relationships, and operations
- **Transformation**: requirements and external analysis are analyzed to extract explicit and implicit constraints and to build the conceptual model of the application domain.
- **Validation criteria**:
  - every constraint is classified by category (performance, security, environment, scalability)
  - the domain model covers all entities mentioned in the requirements
  - no constraints conflict with each other

---

## C5 — Architecture Synthesis

- **Purpose**: define the system architecture, APIs, interface contracts, and configuration model.
- **Input**:
  - `PROMPT.md`
  - `docs/upstream-analysis.md` (optional)
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture.md` — system architecture (structure, components, dependencies, interaction patterns)
  - `docs/api.md` — API definition
  - `docs/configuration.md` — configuration model
  - `docs/interface-contracts.md` — interface contracts between components
- **Transformation**: requirements, constraints, and domain model are synthesized into a coherent architectural structure with component responsibilities, contracts, and implementation sequence.
- **Validation criteria**:
  - every functional requirement is mapped to at least one architectural component
  - every constraint is addressed in the architecture
  - interface contracts are unambiguous
  - the user has confirmed the architecture (user gate passed)

---

## C6 — Architecture Validation

- **Purpose**: verify architecture coherence against requirements, constraints, and domain model before proceeding to implementation.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
  - `PROMPT.md`
  - `docs/constraints.md`
  - `docs/domain-model.md`
- **Output**:
  - `docs/architecture-review.md` — architecture validation report (requirements coverage, constraint compliance, identified risks)
- **Transformation**: systematic cross-referencing between architecture, requirements, and constraints to produce a structured conformance judgment.
- **Validation criteria**:
  - every requirement is traced to at least one component
  - no constraint is violated
  - identified risks have mitigation proposals
- **Decision rule**:
  - if architecture is invalid → return to C5 with review notes
  - if architecture is valid → proceed

---

## C7 — Implementation Planning

- **Purpose**: decompose the architecture into implementable tasks, define the dependency graph, and establish the execution sequence.
- **Input**:
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
- **Output**:
  - `docs/task-graph.md` — task graph with dependencies
  - `docs/implementation-plan.md` — implementation plan with execution order and per-module specification
  - `docs/module-map.md` — module map with responsibilities and interfaces
- **Transformation**: the architecture is decomposed into implementable work units with their dependencies and priorities.
- **Validation criteria**:
  - every architectural component is mapped to at least one task
  - the dependency graph is acyclic
  - every module has declared responsibilities, interfaces, and dependencies
  - the user has confirmed the plan (user gate passed)

---

## Cognitive Pipeline Output

Final artifacts produced:

```
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
```

These artifacts are consumed by the Operational Pipeline.

---

# Operational Pipeline

Goal: execute the implementation plan and produce working, tested, and validated software.

---

## O1 — Repository Scaffold

- **Purpose**: create the project structure based on the architectural plan and module map.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/architecture.md`
- **Output**:
  - `docs/repository-structure.md` — documented repository structure
  - physical directory structure and placeholder files
- **Transformation**: the implementation plan and module map are converted into the physical project structure.
- **Validation criteria**:
  - every module in `module-map.md` has a corresponding directory
  - the structure reflects dependencies declared in the architecture
  - the commit has been performed

---

## O2 — Module Generation (Builder)

- **Purpose**: implement code module by module following the implementation plan and dependency graph.
- **Input**:
  - `docs/implementation-plan.md`
  - `docs/module-map.md`
  - `docs/task-graph.md`
  - `docs/architecture.md`
  - `docs/api.md`
  - `docs/interface-contracts.md`
- **Output** (per module):
  - `src/<module>/` — module source code
  - `tests/<module>/` — module tests
  - `logs/builder-report-module-N.md` — per-module report
- **Output** (upon completion):
  - `logs/builder-cumulative-report.md` — cumulative report
- **Transformation**: each module specification is converted into working code with associated tests, following the task graph order.
- **Validation criteria**:
  - every module declared in the plan is implemented
  - every module has at least one associated test
  - module tests pass before proceeding to the next module
  - a commit has been performed for each completed module
- **Internal cycle**: the Builder iterates over each module. User feedback is informational only and does not require confirmation.
- **Error handling**: if a module fails, the orchestrator notifies the user and awaits instructions (retry, skip, stop).

---

## O3 — System Validation (Validator)

- **Purpose**: verify overall system conformance against architecture, requirements, and interface contracts.
- **Input**:
  - `src/` — complete source code
  - `tests/` — complete test suite
  - `docs/architecture.md`
  - `docs/interface-contracts.md`
  - `PROMPT.md`
- **Output**:
  - `docs/validator-report.md` — validation report (architectural conformance, test results, static analysis, non-conformances)
- **Transformation**: produced code is systematically compared against architectural specifications and requirements, producing a structured judgment.
- **Validation criteria**:
  - all tests pass
  - every functional requirement is covered by at least one test
  - no interface contract violations
- **User gate**: user chooses between:
  - **a)** full correction → return to O2 with all notes
  - **b)** selective correction → return to O2 with selected items
  - **c)** no correction needed → proceed

---

## O4 — Debug and Smoke Test (Debugger)

- **Purpose**: exercise the application in a controlled environment, capture logs, and identify runtime bugs not found during static validation.
- **Input**:
  - `src/` — complete source code
  - `docs/architecture.md`
  - `docs/validator-report.md`
- **Output**:
  - `docs/debugger-report.md` — bug report, captured logs, smoke test results
  - `logs/runtime-logs/` — logs captured during execution
- **Transformation**: the application is executed in realistic scenarios and results are analyzed to identify anomalous behavior not found during validation.
- **Validation criteria**:
  - all defined smoke tests have been executed
  - logs have been captured and analyzed
  - every bug found is documented with: reproduction scenario, associated logs, severity
- **User gate**: user chooses between:
  - **a)** full correction → return to O2 with all notes
  - **b)** selective correction → return to O2 with selected items
  - **c)** no bugs → proceed

---

## O5 — Closure and Final Report

- **Purpose**: verify repository integrity, consolidate pipeline state, and provide a final report to the user.
- **Input**:
  - all artifacts produced by the pipeline (cognitive + operational)
  - `pipeline-state/manifest.json`
- **Output**:
  - `docs/final-report.md` — cumulative final report
  - `pipeline-state/manifest.json` — manifest updated with state `completed`
- **Transformation**: all artifacts are inventoried, verified for integrity, and synthesized into a final report.
- **Validation criteria**:
  - every artifact declared in the manifest is present in the repository
  - no untracked file is left out of the manifest
  - the manifest is updated with final state and timestamp
- **User gate**: user chooses between:
  - **Iteration**: re-entry at a specific pipeline point (C2–O4) with instructions
  - **Closure**: pipeline is concluded

---

# Flow B — Project Resume

---

## B1 — Continuity Audit

- **Purpose**: analyze an existing repository to determine if the project can be resumed from the interruption point.
- **Input**:
  - repository contents
  - `pipeline-state/manifest.json` (if present)
- **Output**:
  - `docs/audit-report.md` — audit report (found artifacts, pipeline state, interruption point, recommendation)
- **Transformation**: artifacts present in the repository are compared against the expected pipeline structure to determine project state and coherence.
- **Validation criteria**:
  - every found artifact has been classified against the stage that produced it
  - the interruption point has been uniquely identified
  - the report contains an explicit recommendation (resume or adoption)
- **User gate**: user confirms audit result
- **Outcome**:
  - **Resumable**: re-entry into the main flow (C/O) at the identified point
  - **Not resumable**: recommendation to proceed to Flow C (Adoption)

---

# Flow C — Project Adoption

---

## C-ADO1 — Conformance Audit

- **Purpose**: analyze a non-pipeline-conformant repository to produce an adoption plan that makes it compatible.
- **Input**:
  - repository contents
  - previous audit artifacts (if present)
- **Output**:
  - `docs/adoption-report.md` — adoption report (gap analysis, conformance plan, pipeline entry point)
- **Transformation**: repository contents are compared against the expected pipeline structure, identifying gaps and producing a plan to fill them.
- **Validation criteria**:
  - every gap has been documented with the missing artifact and the responsible stage
  - the conformance plan specifies required actions in order
  - the pipeline entry point is justified
- **User gate**: user must confirm the adoption plan
- **Transition**: re-entry into the main flow at the identified point

---

# Cross-Cutting Rules

## R.1 — Standard Interaction Pattern

Every stage follows the pattern:

1. The orchestrator assigns the task to the specialized agent
2. The agent produces artifacts and returns the result to the orchestrator
3. The orchestrator performs a commit
4. The orchestrator rewrites the report in the user chat
5. If a user gate is specified: awaits confirmation or feedback
6. If feedback is negative: the cycle repeats from step 1 with the user's notes

## R.2 — Atomicity and Stop

- Every agent operation is an atomic unit of work: invocation completion + artifact production + commit
- On stop request: in-progress changes are discarded and rollback to the last commit
- Pipeline state is always determinable from the manifest and committed artifacts

## R.3 — Traceability

- Every invocation produces a log in `logs/`
- The manifest (`pipeline-state/manifest.json`) is updated at every commit
- Conversations are serialized and committed
- Every artifact is registered in the manifest with: author, timestamp, phase, commit hash

## R.4 — Portability

- The manifest and artifacts are sufficient to determine pipeline state on a different workspace
- No dependencies on absolute paths or untracked local configurations are permitted

---

# Pipeline Summary

```
COGNITIVE PIPELINE

C1  Initialization
C2  Requirements Gathering           (Prompt Refiner)
C3  External Source Analysis          (Analyst)         [conditional]
C4  Constraint Analysis & Domain Modeling
C5  Architecture Synthesis            (Architect)
C6  Architecture Validation
C7  Implementation Planning

↓

OPERATIONAL PIPELINE

O1  Repository Scaffold
O2  Module Generation                 (Builder)
O3  System Validation                 (Validator)
O4  Debug and Smoke Test              (Debugger)
O5  Closure and Final Report

AUXILIARY FLOWS

B1  Continuity Audit                  (Auditor)         [Resume]
C-ADO1  Conformance Audit             (Auditor)         [Adoption]
```

---

*End of formal pipeline model.*
