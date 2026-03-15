# Reference Pipeline for Prompt-Driven Software Generation

## Overview

This pipeline describes a **generic, project-agnostic system** for generating software from a natural language prompt.  
It is divided into two macro phases:

1. **Cognitive Pipeline** – transforms an ambiguous prompt into a complete implementation plan.
2. **Operational Pipeline** – executes that plan to generate, test, and validate the software.

Each stage has **explicit inputs and outputs**.  
Artifacts produced by one stage are consumed by later stages.

---

# Cognitive Pipeline

Goal: progressively remove ambiguity from the user prompt and produce a **complete implementation plan**.

---

## C1 — Intent Clarification

**Input**

```

user_prompt

```

**Output**

```

intent.md

```

**Description**

Clarifies the user's intent and removes ambiguity from the original prompt.

`intent.md` includes:

- interpreted goal
- system context
- assumptions
- clarified terminology

---

## C2 — Problem Formalization

**Input**

```

intent.md

```

**Output**

```

problem_statement.md

```

**Description**

Produces a concise technical definition of the system.

`problem_statement.md` includes:

- system objective
- expected inputs
- expected outputs
- high-level behavior

---

## C3 — Requirements Extraction

**Input**

```

problem_statement.md

```

**Output**

```

requirements.md

```

**Description**

Extracts system requirements.

`requirements.md` contains:

- functional requirements
- non-functional requirements
- acceptance criteria

---

## C4 — Constraint Analysis

**Input**

```

requirements.md

```

**Output**

```

constraints.md

```

**Description**

Identifies operational constraints.

`constraints.md` includes:

- performance constraints
- security constraints
- environment constraints
- scalability constraints

---

## C5 — Domain Modeling

**Input**

```

requirements.md
constraints.md

```

**Output**

```

domain_model.json

````

**Description**

Defines the conceptual model of the domain.

`domain_model.json` describes:

- entities
- relationships
- operations

Example structure:

```json
{
  "entities": [],
  "relationships": [],
  "operations": []
}
````

---

## C6 — Architecture Synthesis

**Input**

```
domain_model.json
requirements.md
constraints.md
```

**Output**

```
architecture.md
components.json
```

**Description**

Defines the system architecture.

`architecture.md` includes:

* system overview
* component responsibilities
* interaction patterns

`components.json` defines the component structure.

Example:

```json
{
  "components": [
    "auth_service",
    "api_layer",
    "data_layer"
  ]
}
```

---

## C7 — Architecture Validation

**Input**

```
architecture.md
requirements.md
constraints.md
```

**Output**

```
architecture_review.md
```

**Description**

Evaluates the architecture against requirements and constraints.

`architecture_review.md` includes:

* requirement coverage
* constraint compliance
* identified risks

Decision rule:

```
If architecture invalid → return to C6
If architecture valid → continue
```

---

## C8 — Task Graph Generation

**Input**

```
components.json
architecture.md
```

**Output**

```
task_graph.json
```

**Description**

Breaks the system into implementable tasks.

Example:

```json
[
  {
    "task": "implement auth service",
    "component": "auth_service",
    "depends_on": []
  },
  {
    "task": "implement user API",
    "component": "api_layer",
    "depends_on": ["auth_service"]
  }
]
```

---

## C9 — Implementation Planning

**Input**

```
task_graph.json
architecture.md
```

**Output**

```
implementation_plan.md
module_map.json
```

**Description**

Defines the execution strategy for implementation.

`implementation_plan.md` includes:

* execution order
* task dependencies
* implementation stages

`module_map.json` defines the module structure.

Example:

```json
{
  "modules": [
    "auth_service",
    "api_layer",
    "database_layer"
  ]
}
```

---

## Cognitive Pipeline Output

Final artifacts produced:

```
implementation_plan.md
module_map.json
task_graph.json
architecture.md
requirements.md
constraints.md
domain_model.json
```

These artifacts are used by the operational pipeline.

---

# Operational Pipeline

Goal: execute the implementation plan and produce working software.

---

## O1 — Repository Scaffold

**Input**

```
implementation_plan.md
module_map.json
architecture.md
```

**Output**

```
repository_structure.json
repository_tree.txt
```

**Description**

Creates the base project structure.

Example tree:

```
project/
  src/
    auth_service/
    api_layer/
  tests/
  docs/
```

---

## O2 — Module Generation

**Input**

```
module_map.json
repository_structure.json
components.json
```

**Output**

```
module_specs/
```

For each module a specification is generated:

```
module_spec_<module>.md
```

Each specification defines:

* module responsibilities
* interfaces
* dependencies

---

## O3 — Code Generation

**Input**

```
module_specs/
task_graph.json
```

**Output**

```
source_code/
```

Code is generated **task by task**, according to the task graph.

---

## O4 — Test Synthesis

**Input**

```
requirements.md
source_code/
```

**Output**

```
tests/
```

Generated tests include:

* unit tests
* integration tests
* edge cases

---

## O5 — System Validation

**Input**

```
source_code/
tests/
requirements.md
```

**Output**

```
validation_report.md
```

Validates:

* test results
* requirement compliance
* system integrity

---

## O6 — Repair Loop

**Input**

```
validation_report.md
source_code/
```

**Output**

```
patched_code/
```

If validation fails:

1. locate bug
2. generate patch
3. re-run tests

Loop ends when:

```
all tests pass
requirements satisfied
```

---

# Complete Pipeline Summary

```
COGNITIVE PIPELINE

C1 intent clarification
C2 problem formalization
C3 requirements extraction
C4 constraint analysis
C5 domain modeling
C6 architecture synthesis
C7 architecture validation
C8 task graph generation
C9 implementation planning

↓

OPERATIONAL PIPELINE

O1 repository scaffold
O2 module generation
O3 code generation
O4 test synthesis
O5 system validation
O6 repair loop
```

```
```
