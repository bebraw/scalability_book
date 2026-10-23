# ADR-054: Correct demo inference and add bounded local experiments

**Status:** Implemented

**Date:** 2026-10-23

## Context

The second demo review reproduced a contradictory fresh-cache path, a hypermedia result without its displayed mutation and false Little's Law agreement under an undisclosed tolerance.
Boundary trace and the dimensions radar still infer ranks from authored selections.
The model-evaluation worksheet accepts real outputs but retains invented cost and latency.
Students also need a manageable route from a mechanism illustration to independently checked execution on their own machines.

## Decision

Correct the three reproduced teaching errors and preserve focused browser regressions.
Remove Boundary trace's risk rank and replace the weighted dimensions widget with a static pressure–boundary–signal mapping and prediction prompt.
Retain its conceptual exercise and historical notebook sources; remove the retired widget from current catalog, controls and resources.
The remaining gallery contains 28 demos.
Let the evaluation worksheet accept actual elapsed time and cost with explicit provenance and unknown values, independent of manually justified quality scores.
Do not use invented cost to break quality ties or silently retain observations after replacing an output.

Offer two optional standalone starters after the CSV lab: a persisted receiver effect across a worker restart, and browser caching with conditional HTTP responses.
Each supplies a specification, task, decision template, setup preflight and independent acceptance checks, leaving one implementation function unfinished.
The retry lab owns synthetic receiver and worker SQLite records in separate files; the supplied harness owns process startup, deliberate interruption and restart.
The HTTP lab owns a loopback origin, versioned synthetic body and origin-request log; its browser uses normal HTTP caching, independently of direct HTTP assertions.
Neither lab imports the private course reference or executes a model.
Archive each as a self-contained source ZIP and verify completed candidates in clean disposable copies while distributing the gap.

These activities replace existing practice time and add no submission, grading criterion or required infrastructure platform.
Keep formal models and useful browser mechanisms; do not build a local version of every demo.
Planning limits remain uncalibrated until a learner trial.

## Trigger

The instructor approved the second review's adjustments and concrete local-exercise proposals.

## Alternatives and consequences

- Qualify the remaining ranks: retains an arbitrary priority that students should justify themselves.
- Keep only worked examples: loses the chance to distinguish process execution and actual browser reuse from authored outcomes.
- Require full distributed or framework implementations: adds setup and scope without evidence that the initial learning question needs them.

The labs require separate setup and unfinished-feature results, deliberate negative controls and retained failed attempts.
Process restart establishes only the selected failure window, not power-loss durability or general exactly-once delivery.
Browser observations depend on stated request modes and browser settings; a direct 304 response alone does not establish browser reuse.
Learning gains and completion times require learner evidence, independently of repository correctness.

## Implementation and verification

The demo guide owns pedagogical boundaries; the development guide owns check commands and clean-archive verification.
Each lab's SPEC and README own its exercise contract and setup.
The affected interactions, all 28 demos' automated theme/accessibility checks, resource/investigation contracts, historical-source fallback and Chromium/WebKit observation flows pass.
The full unit suite passed 192 tests; the subsequent source-archive regression also passes after excluding `.lab-data` alongside generated check records and dependencies.
The three teaching errors and archive inclusion were reproduced before correction, with first failures retained locally.
Keyboard verification now waits for the lazy teaching cluster's actual ready state; browser snapshot schema remains version 1 independently of activity version 2.
Both unfinished starters pass preflight and fail their intended feature checks.
Completed candidates pass from clean ZIP installations on Node 24.22.1 and from disposable source copies on Node 26.12.0.
Retry verifies five contract tests and two process cases; HTTP verifies six contract tests and three Chromium cases, including actual cache reuse and network 304 versus browser-visible 200.
Autocommit-only receiver, always-200 and no-store candidates are rejected by the supplied checks.
Build and local validation pass; the full published-link check reports no broken targets, with blocked external requests retained as inconclusive.
Production publication remains separate from repository implementation.
