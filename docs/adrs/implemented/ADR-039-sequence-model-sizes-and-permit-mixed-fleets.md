# ADR-039: Sequence model sizes and permit declared mixed-model fleets

**Status:** Implemented

**Date:** 2026-10-08

**Supersedes:** [ADR-021](../implemented/ADR-021-compare-three-fresh-builds-of-one-common-application.md)

**Implemented follow-up:** [ADR-046](ADR-046-make-fleet-trace-import-an-optional-extension.md) makes trace import optional while retaining actual-run analysis and this three-build progression; the revised contract is reflected in the current owners and snapshots.

**Implemented follow-up:** [ADR-047](ADR-047-make-live-paired-experiments-an-optional-extension.md) requires supplied matched-trace analysis and makes student-run paired experiments optional; the revised contract is reflected in the current owners and snapshots.

## Context

The course has not run yet.
The instructor wants students to learn the engineering workflow with a large model before investigating a small model's constraints, then study whether fleet coordination and model assignment improve accepted quality, time, and cost.
Both single-agent configurations may be department-hosted, so hosting location does not describe the intended model-size contrast.
The instructor explicitly authorized replacing unused earlier course contracts rather than maintaining legacy editions.

## Decision

Keep three fresh implementations of the same bounded Work Activity Tracker:

- **Establish — A:** approved large model, one coding agent, and the initial evidence baseline.
- **Challenge — B:** approved small model, one coding agent, and comparison with A using permitted lessons and fresh application code.
- **Compare — C:** a declared fleet using approved small models, large models, or a mixture, with B's small model as its reference configuration.

Publish the exact model identities, relative size basis where exposed, serving configuration, access, budgets, and fallback in the course environment sheet.
The size labels do not guarantee capability, privacy, lower cost, or easier learning.
Larger-model support in A is a teaching hypothesis to check with the assigned configuration.

Keep the common behavior, normally the primary stack, shared measurement boundaries, evidence categories, transfer rules, audits, individual learning practice, numeric scoring, and passing requirements.
Specifications, course-provided acceptance material, permitted lessons, and generic tools can transfer; application source, implementation-specific tests, and application configuration do not become later builds' starting material.
Full A–B–C builds remain comparative engineering cases because practice, architecture, tools, and serving conditions may change together.

Declare C's model assignments, routing and fallback, hypothesis, and actual model/route per attempt.
Count every worker, retry, failed attempt, integration, and human review when reporting accepted quality, time, and total cost; distinguish departmental resource costs from student payment.
Mixed-fleet B–C results compare complete development systems rather than isolate orchestration.

Retain the required bounded single-agent/fleet pair on the same small-model configuration, routing policy, frozen revision, checks, environment, intervention policy, and predeclared time/resource limits.
An optional small-only/mixed-fleet pair holds the task graph fixed and assigns a large model to one named role within the remaining rehearsal budget.
It adds no fourth application, compulsory experiment, or separate submission.
Preserve failed and negative results and use the supplied-trace alternative when matched access or accounting is unavailable.

Use `2026-10-v2` as the sole revised pre-course requirement edition and `2026-10-solo-equivalence-v2` as the sole supported rubric.
Remove unused earlier requirement snapshots and rubric compatibility; retain both group and approved solo routes with unchanged points.
Regenerate the current snapshots and checklist together in place before the first run.
Once a real run begins, pin its contract and retain later revisions as separate editions.

## Alternatives

### Local model first, then comparison model and a matched fleet

This preserves the previous B–C model continuity but conflates the intended size contrast with hosting and adds serving/configuration questions to the introductory phase.
It remains a possible teaching design, but the instructor selected large-model-first support for this course.

### Require the entire C build to use only B's small model

This foregrounds orchestration but prevents students from investigating model assignment as a quality/time/cost decision.
The matched bounded task provides the narrower orchestration contrast while the full fleet remains flexible.

### Require another full build or model-mixture experiment

That expands the workload beyond the three-application course.
Keep the assignment comparison optional and bounded within rehearsal.

### Retain unused contracts as legacy editions

There are no completed or active course runs whose contracts need preservation.
The instructor authorized revising the pre-course baseline directly; version retention starts when a real run uses an edition.

## Implementation and verification

The common contract, phase briefs, rubric wording, course environment sheet, book progression, course and lecture plans, diagram, project summaries, and checklist own the revised design.
The course API accepts the sole supported rubric and keeps the existing run-pinning and approved solo behavior.
The portable fleet fixture uses synthetic small-model names and documents how to preserve mixed assignments without changing its schema.

Verification passed: 24 focused unit tests covering requirements, evidence, the solo route, course administration, the fleet fixture, and the progression diagram; 11 affected Chromium browser checks covering the project briefs, group evidence, approved solo submissions, and diagram geometry; type checking; the site build; and validation of all 115 generated HTML pages.
The rendered progression and Compare brief were also inspected in Chrome.
Model assignments and departmental access still require publication and preflight before teaching; this decision does not claim a completed cohort or a measured model/fleet benefit.
