## Project artifacts

Each chapter should help you produce or revise one concrete project artifact.
By the end of the course, these artifacts should form a small engineering portfolio around your event tracking system:

- Chapter 1: scalability dimensions checklist.
- Chapter 2: README, assumptions, and development process notes.
- Chapter 3: shared measurement protocol and implementation A baseline.
- Chapter 4: architecture reading, implementation A analysis, and an implementation B architecture hypothesis.
- Chapter 5: friction audit.
- Chapter 6: challenged-assumptions and pressure maps for implementations A and B.
- Chapter 7: agent instructions, task boundaries, and review workflow.
- Chapter 8: three-way scaling comparison, target design, and scaling trade-off table.
- Chapter 9: final evidence-based reflection.

## Notes for further development

- Preserve the traditional scalability thread explicitly.
  The three-build comparison is a way to study development scalability, but every implementation still has to be discussed in terms of users, data, traffic, failure, architecture, operations, and resource use.
- Preview the bounded cross-team audit as the place where unfamiliar readers test setup, documentation, hidden assumptions, and change friction.
  Do not promise a full handover-and-return cycle.
- Revisit the artifact list after the common specification is settled.
  Some artifacts should be produced for every build in a comparable evidence package; others should culminate in the final cross-build analysis.
- Use [`docs/three-build-project-direction.md`](../docs/three-build-project-direction.md) as the source of truth during this rewrite.
