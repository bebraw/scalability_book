# ADR-052: Separate the private audit reference from public workload tooling

**Status:** Implemented

**Date:** 2026-10-22

## Context

The instructor approved a dedicated audit reference and optional reusable benchmark runner after settling the course scope.
The reference must remain unfamiliar until its audit release, while students need an implementation-independent measurement protocol and may build their own tooling.
Putting reference source in this public repository or importing it into generic tooling would weaken both boundaries.

## Decision

Keep the reference application, its adapter, frozen archives, probes and empirical preparation records under ignored `.local/course-preparation/`, outside site builds and public downloads.
Use a standalone local Node/SQLite application with shared HTML/API domain commands and transactional item/event writes, independently versioned in a local private Git repository.
The reference has no model integration and does not stand in for three student implementations.

Keep the generic runner under `course-tools/benchmark/` with its protocol, adapter contract and reporting tests, using only Node built-ins.
It owns fixture descriptions, seeded logical-operation scheduling, deadlines, outcome accounting and reporting.
Each application-specific adapter owns its real boundary, persistence acknowledgements, reset/quiescence, response validation, write reconciliation, correctness checks and application resource observations.
The runner must not import or package the private application or adapter.

Prepare three frozen audit packages from one checked reference revision and release only the current package and probe at the relevant audit window.
Record repeated-code familiarity honestly.
Earlier probe variants appeared in this public repository; retire those variants from current release prompts and retain only generic release guidance publicly.
Fresh private prompts do not erase prior exposure to the general probe pattern or the repository history.
Keep the model-dependent matched experiment separate, with fresh copies/sessions and explicit configurations; never fabricate empirical traces from the development transcript or synthetic tests.

## Trigger

The instructor authorized proceeding with implementation and offered help when model changes or access are needed.

## Consequences

- Generic tooling can be shared without revealing the audit solution.
- An unfamiliar auditor gets a small standalone source archive with a reproducible setup and meaningful checks.
- The ignored private artifacts require an instructor-controlled backup; the public repository is not their backup.
- Private reference validation must be recorded separately from public-runner CI.

## Alternatives considered

### Publish the reference beside the runner

This simplifies distribution but removes the intended unfamiliar-code condition before audit release.

### Make every student write the full runner

This preserves implementation freedom but spends the existing workload budget on generic scheduling and accounting that can be provided once.

## Implementation and verification

The [tooling guide](../../course-tooling.md) owns commands, privacy and readiness.
Verify the twelve reference acceptance scenarios, restart and transactional failures through real HTTP and SQLite; inspect the visible form journey.
Test the runner with deliberately incorrect, timed-out and late-writing adapters, then run the full fixed baseline against the frozen reference.
Inspect archives and clean-unpack validation before marking the decision implemented.

The private reference acceptance checks and form journey pass; all three archived packages share the frozen private revision and a clean unpack passes without dependencies.
The public runner passes eighteen checks, including the fractional-deadline regression, and the full real-reference baseline retains all 2,200 operations with passing checks and actual server CPU observations.
The site build, types, HTML/local-link validation, requirement checks and thirteen project browser checks pass locally.
Public deployment and actual model experiments are separate release work; implementation status does not claim either has occurred.
