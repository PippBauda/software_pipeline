# Normalized Software Development Pipeline

## Legend

- **User gate**: point where the user must confirm to proceed.
- **Automatic gate**: point where the orchestrator autonomously evaluates whether to proceed.
- **Review cycle**: iterative pattern agent → orchestrator → user → possible re-cycle.
- **Artifacts**: each phase explicitly declares its outputs.

---

## Flow A — PROJECT START

### A.0 — Initialization
- **Actor**: Orchestrator
- **Input**: User request to start a new project
- **Actions**:
  1. Verify/initialize the Git repository
  2. Create the directory structure for pipeline artifacts (`docs/`, `logs/`, `pipeline-state/`)
  3. Initialize the pipeline manifest (`pipeline-state/manifest.json`)
  4. Register the session in the tracking log
- **Artifacts**: directory structure, initial manifest, session log
- **Commit**: yes
- **Transition**: → A.1

### A.1 — Requirements Gathering (Prompt Refiner)
- **Actor**: Prompt Refiner (via Orchestrator)
- **Input**: Conversation with the user
- **Actions**:
  1. Functional and non-functional requirements gathering
  2. Scope and constraint definition
  3. Acceptance criteria identification
  4. PROMPT.md document production
- **Artifacts**: `PROMPT.md`, conversation log
- **Commit**: yes
- **User gate**: user must confirm PROMPT.md completeness
- **Review cycle**: if the user is not satisfied, feedback is passed to the Prompt Refiner and the phase repeats
- **Transition**: → A.2

### A.2 — External Source Analysis (Analyst) [conditional]
- **Actor**: Analyst (via Orchestrator)
- **Entry condition**: PROMPT.md contains references to external code sources (orchestrator decision confirmed by user)
- **Input**: references from PROMPT.md
- **Actions**:
  1. Access and clone/analyze external sources
  2. Extract relevant logic, configuration models, proxy behavior
  3. Produce the analysis document
- **Artifacts**: `docs/upstream-analysis.md`, conversation log
- **Commit**: yes
- **User gate**: user must confirm analysis quality
- **Review cycle**: if the user is not satisfied, feedback is passed to the Analyst and the phase repeats
- **Bypass**: if there are no external sources, skip directly to → A.3
- **Transition**: → A.3

### A.3 — Architectural Design (Architect)
- **Actor**: Architect (via Orchestrator)
- **Input**: PROMPT.md, optional upstream-analysis.md
- **Actions**:
  1. System architecture definition (structure, components, dependencies)
  2. API and interface contract definition
  3. Configuration model definition
  4. Module implementation sequence definition
- **Artifacts**: `docs/architecture.md`, `docs/api.md`, `docs/configuration.md`, `docs/interface-contracts.md`
- **Commit**: yes
- **User gate**: user must confirm the proposed architecture
- **Review cycle**: if the user is not satisfied, feedback is passed to the Architect and the phase repeats
- **Transition**: → A.4

### A.4 — Modular Implementation (Builder)
- **Actor**: Builder (via Orchestrator)
- **Input**: all architectural documents, module sequence
- **Actions** (cycle per module):
  1. Read the current module specification
  2. Implement code
  3. Write tests for the module
  4. Execute module tests
  5. Report module to orchestrator
- **Artifacts**: source code, tests, `logs/builder-report-module-N.md`
- **Commit**: yes (one per completed module)
- **User gate**: none (informational feedback only per module)
- **Module failure handling**: if a module fails, the Builder signals the failure to the orchestrator, which notifies the user and awaits instructions (retry, skip, stop)
- **Upon completion of all modules**: cumulative report, final commit
- **Transition**: → A.5

### A.5 — Validation (Validator)
- **Actor**: Validator (via Orchestrator)
- **Input**: source code, tests, architectural documents
- **Actions**:
  1. Code conformance check against architecture
  2. Test suite execution
  3. Static code analysis
  4. Validation report production
- **Artifacts**: `docs/validator-report.md`
- **Commit**: yes
- **User gate**: user chooses between:
  - **a)** Full correction: all validator notes are passed to the Builder → re-entry at A.4
  - **b)** Selective correction: user selects items to correct, passed to the Builder → re-entry at A.4
  - **c)** No correction needed → proceed
- **Transition**: → A.6

### A.6 — Debug and Smoke Test (Debugger)
- **Actor**: Debugger (via Orchestrator)
- **Input**: complete application, architectural documents
- **Actions**:
  1. Application execution in a controlled environment
  2. Smoke test execution
  3. Log capture and analysis
  4. Debug report production
- **Artifacts**: `docs/debugger-report.md`, captured logs
- **Commit**: yes
- **User gate**: user chooses between:
  - **a)** Full correction → re-entry at A.4
  - **b)** Selective correction → re-entry at A.4
  - **c)** No bugs → proceed
- **Transition**: → A.7

### A.7 — Closure and Final Report
- **Actor**: Orchestrator
- **Input**: all artifacts produced by the pipeline
- **Actions**:
  1. Repository integrity verification
  2. Pipeline manifest update with final state
  3. Cumulative final report production
  4. Report presentation to user
- **Artifacts**: `docs/final-report.md`, updated `pipeline-state/manifest.json`
- **Commit**: yes
- **User gate**: user chooses between:
  - **Iteration**: re-entry at a specific pipeline point (A.1–A.6) with instructions
  - **Closure**: pipeline is concluded

---

## Flow B — PROJECT RESUME

### B.0 — Resume Request
- **Actor**: Orchestrator
- **Input**: User request to resume an existing project

### B.1 — Continuity Audit (Auditor)
- **Actor**: Auditor (via Orchestrator)
- **Input**: repository contents
- **Actions**:
  1. Discovery of artifacts present in the repository
  2. Artifact coherence verification against pipeline structure
  3. Pipeline manifest integrity verification
  4. Pipeline state and interruption point determination
  5. Audit report production
- **Artifacts**: `docs/audit-report.md`
- **Commit**: yes
- **User gate**: user confirms audit result
- **Outcome**:
  - **Resumable**: artifacts are coherent, state is determinable → re-entry into Flow A at the point identified by the Auditor
  - **Not resumable**: coherence cannot be verified → recommendation to proceed to Flow C (Adoption)

---

## Flow C — PROJECT ADOPTION

### C.0 — Adoption Request
- **Actor**: Orchestrator
- **Input**: User request to adopt an existing project

### C.1 — Conformance Audit (Auditor)
- **Actor**: Auditor (via Orchestrator)
- **Input**: repository contents
- **Actions**:
  1. Artifact discovery (including any previous audit artifacts)
  2. Gap analysis against pipeline structure
  3. Conformance plan production with required operations
  4. Optimal pipeline entry point identification
  5. Adoption report production
- **Artifacts**: `docs/adoption-report.md`
- **Commit**: yes
- **User gate**: user must confirm the adoption plan
- **Transition**: re-entry into Flow A at the point identified by the Auditor

---

## Cross-Cutting Rules

### R.1 — Standard interaction pattern
Every phase follows the pattern:
1. The orchestrator assigns the task to the specialized agent
2. The agent produces artifacts and returns the result to the orchestrator
3. The orchestrator performs a commit
4. The orchestrator rewrites the report in the user chat
5. If a user gate is specified: awaits confirmation or feedback
6. If feedback is negative: the cycle repeats from step 1 with the user's notes

### R.2 — Atomicity and stop
- Every agent operation is an atomic unit of work
- The atomic unit is defined as the completion of a single agent invocation with the production of its associated artifacts and commit
- On user stop request: in-progress changes are discarded and a rollback to the last commit is performed
- Pipeline state is always determinable from the manifest and committed artifacts

### R.3 — Traceability
- Every agent invocation produces a log in the `logs/` directory
- The pipeline manifest (`pipeline-state/manifest.json`) is updated at every commit
- Agent conversations are serialized and committed
- Every artifact is registered in the manifest with: author (agent), timestamp, pipeline phase, commit hash

### R.4 — Portability
- The manifest and artifacts must be sufficient to determine pipeline state on a different workspace
- No dependencies on absolute paths or untracked local configurations are permitted

---

*End of normalized pipeline.*
