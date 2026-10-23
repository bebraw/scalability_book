# ADR-055: Consolidate local practice and retire low-value demo interactions

**Status:** Implemented

**Date:** 2026-10-23

## Context

The strict review of the remaining 28 demonstrations found interactions that assemble prose or prescribed judgments without exposing a mechanism or evidence.
The incident game can erase earlier duplicate effects when a preventive policy is selected; other models conflate acknowledgement timing with transaction boundaries or omit the simulation qualifier from exported notes.
Four useful local starters repeat setup while their implementation gaps, fixtures and expected failure modes are independent.

## Decision

Retire twelve standalone widgets: Implementation discovery, Constraint feedback loop, Boundary trace, Client activation lens, API contract lens, Goodhart pressure test, Queue balance, Model evaluation, Friction audit, Changed assumptions map, Agent fleet delegation and Scaling pressure planner.
Preserve their useful content as worked examples, evidence exercises and editable project prompts in the owning chapters.
Keep sixteen gallery entries: seven focused investigations, six reworked mechanisms and three smaller orientations leading to practical work.
Use explicit model inputs, visible rejected proposals, request outcomes and attributed observations rather than automatic architectural recommendations or invented quantitative evidence.

Distribute the four core starters in one teaching workspace with a common setup and exercise index.
Each exercise retains its own specification, implementation or test gap, fixtures, checks and evidence directory.
Selection runs only that exercise; one unfinished task must not block another.
Browser installation is needed only for browser exercises.
Share setup and conventions without coupling student-editable domain implementations or mutable state.
Keep optional standalone archives generated from the same sources.
No completed solution, model credentials, generated evidence or private reference enters public archives.

Students use their own model and harness and evolve specifications and decision notes alongside the work.
These activities occupy existing optional practice time and add no grading criterion, required platform or document quota.
Telemetry remains a short trace-reading orientation with a bounded instrumentation recipe for an existing project; a new standalone starter can follow learner evidence.

## Trigger

The instructor approved combining the starters into one workspace with independent exercises and implementing the strict review's cuts.

## Alternatives and consequences

- One cumulative application reduces repeated domain context but makes later lessons depend on earlier solutions and faults.
- Separate downloads preserve isolation but repeat setup and navigation.
- Keeping every widget with more caveats preserves interaction that contributes little beyond the adjacent explanation.

The workspace needs clean-archive verification, independent command dispatch and truthful handling of intended feature failures.
There are no existing students; remove retired demo contracts and queue-specific compatibility paths instead of maintaining migrations.
The learning benefit and exercise timing remain hypotheses for the exploratory student to assess.

## Implementation and verification

The [workspace index](../../../labs/README.md) and [launcher](../../../labs/workspace.mjs) share setup while selecting independent checks; [archive composition](../../../scripts/lib/lab-downloads.ts) publishes the combined workspace and independent downloads from the same sources.
The [catalog](../../../shared/demo-catalog.ts) now contains sixteen demos; retired code, includes, previews, CSS and queue-specific companion contracts are removed.
The owning chapters preserve the useful exercises; [the style guide](../../demo-style-guide.md) records the retained mechanisms and local-practice boundary.
[Architecture](../../../ARCHITECTURE.md) and [development](../../development.md#downloadable-labs) document ownership and verification.

Verification on 2026-10-23 includes:

- Clean ZIP installation, setup preflights, selected-command exit propagation and independent starter setup; expected unfinished outcomes retained separately from completed disposable candidates.
- Actual CSV/cache browser checks and retry process interruption; mutation baseline/refactor accepted and the selected fault rejected; always-200 cache and non-atomic retry candidates rejected.
- 192 unit tests, build/types/HTML validation and published links with no broken targets; blocked or unavailable external URLs remain explicitly inconclusive.
- 56 focused Chromium and 12 WebKit browser cases across retained mechanisms, gallery, all-sixteen observation/bridge and learning journeys; automated accessibility in five themes and keyboard focus.
- A reproduced stale saturation comparison after changing load, corrected by clearing the earlier comparison and protected by a browser regression check.
- Updated preview images and rendered incident-table/disclosure inspection.

Ignored evidence is under `.local/reviews/demo-strict-2026-10-23/`.
A broader Safari compatibility scan still fails on pre-existing ES2022 course output and `.at`/`.replaceAll` calls in learning dependencies; this change does not claim to fix that separate compatibility boundary.
The native-tool reading fixture now uses a 16k context budget for generic visible-text snapshots; production context limits remain enforced.
No live model evaluation or learner study was run, and production publication is separate from local implementation.

This supersedes the earlier demo inventories and separate primary setup in [ADR-053](ADR-053-focus-demos-on-evidence-and-offer-executable-starters.md) and [ADR-054](ADR-054-correct-demo-inference-and-add-bounded-local-experiments.md), while retaining their evidence and bounded-practice principles.
It retires the specialized queue activity introduced by [ADR-043](ADR-043-activate-reading-through-shared-investigation-sessions.md); the general learning loop in [ADR-044](ADR-044-generalize-the-learning-loop-through-a-contextual-cockpit.md) continues.
