# ADR-021: Compare three fresh builds of one common application

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Direction changed on 2026-07-25; book and phase names aligned on 2026-07-27.

## Context

The earlier course plan centered on extending, handing over, and receiving back one implementation, with a proposed declining model-capability arc.
The July direction note explicitly replaced this with a comparison of development systems against a common target.
The book also needs to teach runtime scalability, not let AI tooling displace the application engineering outcome.

## Decision

Use three fresh implementations of the same bounded Work Activity Tracker contract:

- **Establish — A:** approved local-model, single-agent workflow and a measured baseline.
- **Challenge — B:** approved comparison-model, single-agent workflow and an explicit comparison hypothesis.
- **Compare — C:** declared agent fleet with real delegation, handoffs, integration, and review.

Keep required behavior, shared measurement boundaries, and evidence categories comparable.
Normally keep the stack across builds and the B/C base model stable when comparing orchestration; document approved exceptions and their interpretation limits.
Allow learning, requirements, instructor tests, and generic tooling to transfer, but do not start a later implementation from earlier application code or implementation-specific tests.
The current Common Contract owns the exact transfer rule; older direction notes are historical rationale.

Use Establish, Challenge, and Compare as the book's three-part progression, with three core chapters per part.
Study both the application and the development workflow that produces it.
Explain practice effects, environment differences, changing scope, and incomplete control rather than claim a universal model or fleet ranking.
Reward compliant behavior, evidence, and engineering judgment rather than output volume.

Compare also maps a curated real fleet trace into C's application concepts for debugging and coordination analysis.
Provide a portable example/schema with explicit source-ID mapping, ordering, repeat-import behavior, and redaction guidance rather than mandate one agent tool's export or database schema.
Bounded audits replace the former full handover cycle; their protocol is recorded separately in ADR-023.

## Trigger

The July project redesign explicitly rejected the cumulative handover and declining-capability framing.
Later changes aligned chapter naming, clarified fresh-build rationale, and provided a portable fleet-trace fixture.

## Consequences

**Positive:**

- A stable target makes differences in architecture, workflow, and resource use discussable.
- Fresh builds expose how specification, validation, and learned judgment transfer between development setups.

**Negative:**

- Repeated implementation consumes time and requires a bounded common core.
- The fixed order and changing student knowledge limit causal claims about the tools.

**Neutral:**

- Actual model assignments, budgets, access, and fallbacks still need publication in the environment sheet before a run.
- Implemented status describes the published course design, not evidence that a cohort has completed it.

## Alternatives considered

### Cumulative implementation with full handover and return

The historical direction note rejects the scheduling and ownership dependency while preserving unfamiliar-system learning through bounded audits.

### Declining-capability model progression or unrelated products

The note replaces the model ranking premise with local/comparison/fleet setups and a common behavioral target.

## Implementation and verification

[Common Contract](../../../specifications/00_common_project.md), [Establish](../../../specifications/01_establish.md), [Challenge](../../../specifications/02_challenge.md), [Compare](../../../specifications/03_compare.md), [trace fixture](../../../specifications/examples/fleet-trace/README.md), [course plan](../../../course_plan.md), and [publication configuration](../../../site.config.jsonc) implement the design.
[Project-specification browser tests](../../../tests/e2e/project-specification.spec.ts) cover publication; [fixture tests](../../../tests/fleet-trace-example.test.ts) validate the supplied trace.
[The direction note](../../three-build-project-direction.md) preserves the original reasoning and historical follow-up list.

## Historical evidence

- [2026-07-25: adopt three comparable builds](https://github.com/bebraw/scalability_book/commit/b4cc80e0d5c5dea9d01d2faa0d822dcc1f4fbc93).
- [2026-07-25: replace project specifications](https://github.com/bebraw/scalability_book/commit/a53e40aec5dcb7ff84b58612966073acc8c17479).
- [2026-07-27: align the book's three-part narrative](https://github.com/bebraw/scalability_book/commit/be62eb75f0d8b9e0c0e5ad519e586e4feaedb96e).
- [2026-08-28: state the two-system thesis](https://github.com/bebraw/scalability_book/commit/31456067d60dc55dd097ce7d2a39cacc2ccf62fe) and [supply the portable trace](https://github.com/bebraw/scalability_book/commit/2de4e6f5c891c9e3e2082c83efe1e47944f7f27f).
- [2026-09-01: explain the fresh-build rationale](https://github.com/bebraw/scalability_book/commit/3c35d7aba9464317f3666f631ed9a9af30264487).
