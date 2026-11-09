# Compare agent boundary

Read [the root agent instructions](../../AGENTS.md), this phase's README, the shared specification, and the relevant decision records.

Use the declared fleet under the instructor's published model, routing, isolation, tool, and aggregate-budget rules.
Require at least two independently operating agent instances or delegated executions, real task boundaries and outputs, a handoff or integration point, and review before accepting the result.
Several fictional roles within one agent do not constitute a fleet.
Record the actual model and route for each task or attempt, workers and retries, shared-state ownership, integration, correction, and unavailable measurements.
Do not extend delegation or spending beyond the declared limits.

While constructing fresh C, keep application changes within this phase directory and do not inspect or reuse sibling implementations' source, implementation-specific tests, generated components, or configuration.
Shared behavioral specifications and decision history may evolve, with previous phase snapshots preserved.
The starter's smoke tests establish setup only; implement and verify the required behavior independently.

For the required scaling and deployment experiment, you may select frozen A, B, or C and work in a separately identified experimental copy or branch, preserving the submitted baseline and evidence.
The optional matched-pair probe may also use experimental copies of a frozen revision under the brief's specific controls.
Follow the configuration declared for each experiment; these exceptions never permit using an earlier implementation as fresh C's starting source.
