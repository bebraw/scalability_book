# ADR-023: Test unfamiliar-system work through bounded audits

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Audit direction introduced on 2026-07-25; equivalent change probes specified on 2026-08-28.

## Context

The course should expose whether another group can understand and change a submitted system.
A full handover makes project progress dependent on another group's code and schedule, while an unrestricted review has inconsistent effort and scope.

## Decision

Run a bounded cross-team audit against each phase's frozen implementation and submitted instructions.
Separate setup and validation from a thirty-minute instructor-supplied change probe.
Release the probe after submission, with equivalent vertical-slice and acceptance burdens across phases and its exact shape withheld until release.
Use a disposable checkout, a consistent tool policy, and the same auditors where practical; record prior inspection and unavoidable changes.

The probe starts only after the prompt is received and setup is runnable.
Do not seek directions from the authors during the probe.
Stop at the time limit and report complete, partial, blocked, or not attempted outcomes honestly.
If setup blocks the change, a speculative estimate is commentary rather than completed evidence.

Return a concise friction report and any patch, separating setup time, comprehension, touched boundaries, acceptance checks, regressions, and uncertainty.
Let authors respond without erasing the auditor's evidence of difficulty.
The audit supplies evidence to the instructor, does not transfer ownership, and is not a comprehensive maintainability score or an automatic peer grade.
Timed access and class browsing follow ADR-009.

## Trigger

The July redesign replaced handover with bounded unfamiliar-system work.
August added equivalent, released-after-submission probes and a stable reporting protocol.

## Consequences

**Positive:**

- Another group tests communicability and change friction without taking over the project.
- Time and setup boundaries keep audit results interpretable and workload bounded.

**Negative:**

- Instructor assignment, probe preparation, and fallback handling are required.
- Prior knowledge and stack familiarity still limit comparisons and need disclosure.

**Neutral:**

- The instructor awards the project score; audit findings remain evidence rather than grade votes.

## Alternatives considered

### Full handover-and-return development

The historical direction note explicitly rejected making one group's progress heavily dependent on another team's implementation or schedule.

### Unbounded code review or an estimated change without execution

These lack a common effort boundary and do not establish the observed setup/change outcome required by the current protocol.

## Implementation and verification

[Common Contract section 10](../../../specifications/00_common_project.md#10-bounded-cross-team-audit), [instructor probes](../../../specifications/audit_change_probes.instructor.md), and [the project introduction](../../../specifications/00_introduction.md) implement the protocol.
The [course API](../../../worker/courses.ts) records assigned audits against frozen revisions; [API tests](../../../tests/courses.test.ts) verify access and record constraints.
Actual change-friction evidence still requires the auditor's performed task and report.

## Historical evidence

- [2026-07-25: replace full handover with bounded audits](https://github.com/bebraw/scalability_book/commit/b4cc80e0d5c5dea9d01d2faa0d822dcc1f4fbc93).
- [2026-08-28: define equivalent change probes](https://github.com/bebraw/scalability_book/commit/39b1ea34e01f65dd9cd04b901c6a14e98d5889eb).
- [2026-10-05: implement audit access and submission records](https://github.com/bebraw/scalability_book/commit/e8e48c02766ace4525d6c645a285ec4a2f4c15d7).

## References

- [ADR-009: access and frozen evidence](ADR-009-preserve-evidence-and-control-submission-access.md).
- [ADR-021: fresh-build course design](ADR-021-compare-three-fresh-builds-of-one-common-application.md).
