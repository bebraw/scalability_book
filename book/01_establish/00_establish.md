# Establish — Build and measure a baseline

Establish creates implementation A and a baseline for the later comparisons.
Define what should remain true under pressure, build the common behavior through the approved local single-agent workflow, and record what the first implementation actually does.

## From scalability claims to comparable evidence

The three chapters form one progression:

1. [What does scalability mean for web development?](/chapters/what-is-scalability/) identifies the maintained goal, relevant pressures, constraints, and evidence a scalability claim would need.
2. [How can coding agents support scalable development?](/chapters/scalable-development/) treats the application and its development system as connected systems, with explicit constraints, validation, correction, and ownership.
3. [How can we measure web applications and development workflows?](/chapters/benchmarking/) turns runtime behavior and the development process into a repeatable evidence baseline.

Bind implementation A to a declared revision and evidence package so later comparisons can use recorded results.

## Implementation A — Work Activity Tracker

The [Establish project specification](/project/establish/) defines the implementation and evidence requirements.
Choose a domain interpretation, stack, and architecture that fit the [common contract](/concepts/#contract) and one question you want to investigate.
Record the assumptions and [trade-offs](/concepts/#trade-off) that later builds should test.
Follow the [shared transfer policy](/project/#8-permitted-transfer-between-implementations) when carrying material into those fresh implementations.

### Instructor perspective — Carry the learning, not the code

Building the application three times lets you compare development setups and see how growing domain knowledge changes your decisions.
That learning is part of the course, even though it complicates causal attribution.

Agents can make a fresh implementation inexpensive enough to abandon a weak product interpretation or architecture.
Carry forward the permitted specifications, acceptance material, evidence, and lessons instead of protecting code merely because it took effort to produce.
By the third build, you should be better able to judge both the application and the workflow that produced it.

## Implementation discovery lab

Use this lab to turn the [shared specification](/project/) into a direction to explore.
It produces a first project-direction document that you can refine as implementation creates evidence.

{{ import "site/includes/project-fit-checker.html" }}
