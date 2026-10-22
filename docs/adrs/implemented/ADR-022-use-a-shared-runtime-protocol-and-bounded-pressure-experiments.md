# ADR-022: Use a shared runtime protocol and bounded pressure experiments

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Shared workload specified on 2026-08-28.

**Implemented follow-up:** [ADR-049](ADR-049-focus-required-pressure-investigations-and-offer-extensions.md) replaces the compulsory additional Challenge pressure with a bounded correctness or recovery investigation and makes further scenarios optional; the revised contract is reflected in the current owners and snapshots.

## Context

Three implementations can use different architectures and still appear comparable if measurements silently change operation boundaries, fixtures, retries, or completion rules.
Short classroom benchmarks also cannot establish production performance merely by reporting a fast best run.

## Decision

Define a stack-neutral shared workload in the Common Contract and require an adapter that exercises the real application and persistence path.
Choose a logical user-operation boundary before A and retain it across B and C.
Use the prescribed seeded fixture, operation mix, warm-up, repeated closed-loop profiles, reset rules, and time limits.
Retain correctness validation and one comparable resource-efficiency proxy alongside latency and useful throughput.

Account separately for valid completions, expected domain rejections, unexpected failures, timeouts, unfinished work, and work never started.
Preserve observations from every repetition; label latency percentiles as conditional on completed valid operations.
Reconcile potentially late writes before resetting and report unresolved outcomes rather than treating a timeout as proof that nothing committed.

Select one primary pressure in Establish as a documented transformation of the baseline and reuse it across phases.
Add the relevant architectural pressure in Challenge and interpret the broader catalog in Compare without requiring exhaustive repeated matrices.
For claims about sustained arrivals, backlog, or admission, use the contract's bounded open-loop overload/drain procedure and distinguish generator lag from application backlog.
Keep observation, projection, and environment limitations explicit.

## Trigger

The August commits replaced broad scalability discussion with a shared workload and progressive, protocol-driven pressure evidence.

## Consequences

**Positive:**

- Common boundaries and outcome accounting make comparisons more interpretable.
- Correctness and recovery remain visible when a fast result hides lost work or unfinished writes.

**Negative:**

- Every stack needs an adapter and deliberate reset/reconciliation behavior.
- The classroom-sized workload supports bounded observations rather than general production claims.

**Neutral:**

- Detailed counts and timing defaults remain in the Common Contract rather than being copied into this ADR.
- Implemented status refers to the published protocol; students still implement and run their adapters.

## Alternatives considered

### Let groups independently choose all benchmark parameters

This makes scope and measurement differences difficult to separate from implementation differences.

### Rank only best-run latency or generate exhaustive hypothetical scenarios

The implemented contract requires repeated observations, outcome/correctness accounting, and cumulative selected pressure experiments.

## Implementation and verification

[Common Contract section 7](../../../specifications/00_common_project.md#7-shared-runtime-workload-and-progressive-scalability-analysis), the three [phase briefs](../../../specifications/README.md), and the [Benchmarking chapter](../../../book/01_establish/03_benchmarking.md) implement the evidence requirements.
Contract changes should verify publication and the consistency of phase instructions; project measurements require the students' actual workload evidence.

## Historical evidence

- [2026-08-28: define the shared runtime workload](https://github.com/bebraw/scalability_book/commit/470013df511e7c441ac4603d7ec643e918d318f2).
- [2026-08-28: make benchmark validity protocol-driven](https://github.com/bebraw/scalability_book/commit/6488c8cdb7aeb984b4d4e80994b818cd4952cff6).
- [2026-08-28: make pressure analysis progressive](https://github.com/bebraw/scalability_book/commit/83243e17b728bf6b1a5daf58779c7613b19e094b).

## References

- [ADR-021: comparison design](ADR-021-compare-three-fresh-builds-of-one-common-application.md).
