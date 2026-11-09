# Decision history

Use this log while working to preserve consequential choices and revisit them with evidence.
Begin with [ADR-001: stack hypothesis](ADR-001-stack.md), then copy [template.md](template.md) when another meaningful choice needs a record.
Small reversible implementation details do not each need an ADR, and record volume earns no credit.

This setup borrows the separation of specifications and decision history from [vibe-template](https://github.com/bebraw/vibe-template).
The specification describes current intent, the log preserves rationale, and each phase's architecture note describes the system that actually runs.

## Lifecycle

1. **Proposed:** State the problem, alternatives, tentative choice, assumptions, owner, and what evidence would change it.
2. **Accepted:** Record the choice the group or solo author has adopted and why.
   Acceptance does not prove implementation or validation, and does not add an instructor-approval step where the course does not require one.
3. **Implementation evidence:** Update the phase table with the actual revision, checks, results, and remaining gaps.
   A choice can be implemented in A while not yet implemented in B or C.
4. **Superseded:** Retain the old record, name and link its replacement, and explain what changed.
   Never silently rewrite the earlier rationale or reuse its identifier.

Keep records in this directory; file movement is unnecessary because implementation status differs by phase.
Revisit relevant decisions for B and C even when retaining the same choice.
Explain why evidence still supports it or why it changed.
Reasoning may transfer, but earlier application code, tests, and configuration may not.

At each phase freeze, retain readable snapshots of the relevant records and link them from the phase's evidence index.
Use evidence links rather than copying measurements into several places.

| Record                                        | Decision status               | Scope                                           |
| --------------------------------------------- | ----------------------------- | ----------------------------------------------- |
| [ADR-001: stack hypothesis](ADR-001-stack.md) | Proposed; prompts to complete | Initial stack choice, revisited in A, B, and C. |
