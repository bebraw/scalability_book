# Establish agent boundary

Read [the root agent instructions](../../AGENTS.md), this phase's README, the shared specification, and the relevant decision records.

During Establish, use only the approved large-model route and one coding-agent process at a time for planning, implementation, testing, explanation, and review.
Do not spawn subagents, delegate to other coding agents, run parallel coding-agent processes, or silently switch models.
Unapproved automatic routes and fallback must be disabled or fail closed.
Manual work is permitted under the course rules and must be recorded when consequential.

While constructing fresh A, keep application changes within this phase directory and do not inspect or reuse sibling implementations' source, implementation-specific tests, generated components, or configuration.
Later Compare experiments may select a separately identified copy or branch of frozen A under the [root experiment guidance](../../AGENTS.md#active-phase-and-transferable-context), preserving the original submission and using the declared Compare configuration.
Shared behavioral specifications and decision history may evolve, with previous phase snapshots preserved.
The starter's smoke tests establish setup only; implement and verify the required behavior independently.
