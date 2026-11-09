# Student project guidance

Read the root README, the active phase's README and AGENTS.md, the shared specification, and relevant decisions before changing application code.
The instructor-assigned requirement edition and course environment govern the work.
This starter's placeholders do not waive a course requirement or authorize another model, route, tool, or external action.

## Active phase and transferable context

- Work on one selected phase: A in `projects/01-establish`, B in `projects/02-challenge`, or C in `projects/03-compare`.
- Do not inspect, import, copy, or adapt sibling implementation source, implementation-specific tests, generated components, or configuration when building a later phase.
  Ask the student to supply permitted written lessons and behavior-level context instead.
- Shared `specifications/` owns intended behavior and acceptance, and `docs/adrs/` owns reasoning and history.
  Do not put shared application runtime code there or create a shared application package between builds.
- Start B and C from the original unchanged starter or a documented fresh generic scaffold, never from the previous completed implementation.
- A and B each use one coding-agent process at a time, without subagents or parallel coding agents.
  C uses a declared fleet under the published configuration.
- Compare's scaling/deployment experiment may use a separately identified copy or branch of frozen A, B, or C, preserving the submitted baseline and its evidence.
  The optional matched-pair probe may also use two experimental copies of a frozen revision under its specified controls.
  These experiments use their declared Compare configuration and never supply starting source for fresh C.

Open the active phase as the agent workspace and supply shared documents deliberately.
These instructions do not enforce filesystem isolation; use harness access controls or a separate working copy when isolation is needed, and record material differences in conditions.

## Work and acceptance

Before a consequential change, identify intended behavior, code entry point, state owner, public contract, dependency direction, and an observable check.
Implement bounded tasks and validate the actual result.
The starter's smoke checks only establish that the stub runs; add meaningful application checks as behavior is implemented.
Do not weaken the specification to fit a defect or claim acceptance from an agent's completion message alone.

Keep setup and architecture notes current.
Record consequential choices in the decision log, including alternatives, assumptions, evidence, reversibility, and a revisit condition.
Scope implementation claims to a phase and revision; validation in A establishes nothing about B or C.
Preserve failures, manual corrections, unknown measurements, and known gaps in the existing evidence index.
Avoid inventing results, model assignments, rationale, or completed records to fill placeholders.

Use synthetic demonstration and test data.
Keep credentials, personal records, raw sensitive transcripts, installed dependencies, and generated local state out of source submissions.
Publish or deploy only within the student's course assignment and authorization; keep model access and budgets within the published limits.
