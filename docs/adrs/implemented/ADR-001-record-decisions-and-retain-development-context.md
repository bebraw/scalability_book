# ADR-001: Record decisions and retain development context

**Status:** Implemented

**Date:** 2026-10-05

## Context

The repository contains a book, a deployed website, and a course administration application.
Several course decisions have been agreed in discussion while the application still implements an earlier workflow.
Without durable records, future development can confuse the intended design with current behavior or repeat decisions already made.

The vibe-template repository offers an ADR lifecycle and documentation practices that fit this problem.
Its runtime, tooling, and automatic quality gates belong to a different application and are not prerequisites for adopting these practices here.

## Decision

Adopt `proposed/`, `accepted/`, and `implemented/` ADR directories, a sequential local ID scheme, and an indexed template.
Require an ADR alongside changes that establish lasting constraints, choose meaningful architectural alternatives, or supersede a prior decision.
Treat acceptance and implementation as separate states; document deployment and external setup limits independently.

Keep durable facts with one authoritative owner: README for discovery, ARCHITECTURE for current composition, development documentation for commands, course-system documentation for implemented application behavior, student specifications for course requirements, and ADRs for rationale and future constraints.
Keep agent guidance concise and scoped to the task.
Update owning documentation with changes to behavior.

Use focused correctness review, concrete bug reproduction, meaningful regression tests, and verification appropriate to the affected surface.
Before expanding a capability, identify its entry point, state owner, public contract, and dependency direction.
Treat growing modules as a reason to review ownership rather than mechanically split files.

## Trigger

The instructor requested adopting the ADR flow and useful development practices from vibe-template, then recording the decisions from this discussion.

## Consequences

**Positive:**

- Agreed future work remains discoverable without being mistaken for a working feature.
- Contributors can locate contracts, rationale, and verification commands without reconstructing conversation history.
- Review effort follows the actual behavior and risks of a change.

**Negative:**

- Significant changes require maintaining the ADR index and owning documentation.
- Records need review as implementation reveals new constraints.

**Neutral:**

- The existing npm toolchain, build, tests, and deployment commands remain the verification foundation.
- This adoption adds guidance and records rather than new executable quality gates.

## Alternatives considered

### Keep decisions only in conversation or commit messages

This loses the connection between approved direction, remaining implementation, and later superseding decisions.

### Copy the entire template and its tooling

This would introduce unrelated runtime assumptions, skills, and gates into an established book application.
Adopting the documentation and review practices directly is sufficient for the current need.

## Implementation and verification

The [ADR guide](../README.md), [repository guidance](../../../AGENTS.md), [architecture map](../../../ARCHITECTURE.md), and [development guide](../../development.md) implement the workflow.
README and the course-system guide link to these records.
Verify document formatting, relative links, unique IDs, and consistency between record status and directory.
No runtime or deployment behavior changes in this adoption.

## References

- [Reviewed vibe-template ADR workflow](https://github.com/bebraw/vibe-template/blob/27b3fb0571c421a1aacaf7908e2ef333ddb0d4d2/docs/adrs/README.md).
- [Upstream documentation ownership and durable context decision](https://github.com/bebraw/vibe-template/blob/27b3fb0571c421a1aacaf7908e2ef333ddb0d4d2/docs/adrs/implemented/ADR-062-retain-durable-implementation-context.md).
- [Upstream task-scoped agent guidance decision](https://github.com/bebraw/vibe-template/blob/27b3fb0571c421a1aacaf7908e2ef333ddb0d4d2/docs/adrs/implemented/ADR-066-scope-agent-guidance-to-the-task.md).
