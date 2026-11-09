# ADR-001: initial stack hypothesis

**Decision status:** Proposed; the student has not yet adopted a stack.

**Date:** _fill in_  
**Owner:** _group or solo author_  
**Applies to:** Initial A stack choice, normally retained and reconsidered in B and C.

## Context and alternatives

The supplied default is a small Node HTTP server with a static page and no external runtime dependencies.
It does not choose application storage, persistence semantics, domain modules, or a full web framework.

_What do we want to learn?
Which application constraints matter?
Compare adopting this default with one credible alternative, including a familiar or more suitable stack if relevant._

## Decision and rationale

_State our actual language, framework or rendering approach, and initial storage choice when made.
Explain suitability, inherited assumptions, and why we expect the assigned model to handle the stack.
Link the starter manifest or original source/version and record material adaptations in the phase evidence._

## Risks, consequences, and reversibility

_Identify setup, deployment, scalability, and maintainability risks.
What is cheap to revise now?
What would make it costly later?
Which assumptions still need checking?_

## Evidence and revisit condition

_What observation would support or challenge the choice?
Name a concrete revisit trigger and link results as they become available.
A runnable stub is setup evidence, not evidence that the application architecture is suitable._

## Phase implementation and review

| Phase | Retain, revise, or reject; why                              | Implementation status, revision, and evidence                 |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| A     | _Initial decision to make._                                 | _Only the supplied stub exists; application not implemented._ |
| B     | _Revisit with A's written lessons and fresh B evidence._    | _Not started._                                                |
| C     | _Revisit with A/B evidence and the fleet/scaling question._ | _Not started._                                                |

Normally keep the primary language and framework family stable across builds.
A phase-to-phase stack change requires the course's instructor approval and belongs among the comparison's interpretation limits.
Preserve earlier rationale, phase snapshots, and any replacement decision links here.
