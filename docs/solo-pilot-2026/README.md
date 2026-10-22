# Independent course pilot review pack

**Draft for instructor review — 22 October 2026.**

This arrangement offers the full 5 ECTS course to one student working independently, with all student work due on 16 December and assessment targeted for 18 December 2026.
The planning budget is 135 student hours and approximately 16–23 instructor hours for delivery and assessment, plus preparation of the reference application, optional runner and supplied matched-trace package.
Begin with 6–8 hours of independent reading and orientation in late October, followed by a proposed kickoff during 2–4 November.
Finishing by 16 December then needs approximately 20–21 student hours per week after kickoff, with the final phase approaching 22–25 hours per week.
Dates and support commitments become operative when agreed with the student and entered in the private course records.

## Documents to review

| Document                                                                          | Audience               | Purpose                                                                                                |
| --------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| [Specification scope review](../project-specification-scope-review-2026-10-22.md) | Instructor             | Agreed scope and preparation boundaries for the reference and study contract.                          |
| [Study agreement](study-agreement.md)                                             | Student and instructor | Scope, dated milestones, responsibilities, grading and correction arrangements.                        |
| [Student discussion proposal](student-discussion-proposal.md)                     | Student and instructor | A staged small-model exercise to calibrate difficulty before choosing further scope.                   |
| [Independent activities](independent-activities.md)                               | Student and instructor | Nine concrete equivalents for the lecture activities, using the existing reading and project evidence. |
| [Instructor guide](instructor-guide.md)                                           | Instructor             | Preparation, reference audits, phase reviews, assessment and evaluation of the pilot.                  |

Review the agreement first, then the activities and instructor checklist.
Share the agreement and activities with the student after completing the run details below.
Keep actual reference assignments, unreleased change probes and private assessment records in the staff course channel.

## Agreed reviewer

The course instructor will personally perform the incoming independent human audit of the student's frozen implementation in each of the three phases.
The student's outgoing reference audits remain separate work; private frozen packages and phase prompts are prepared, with their actual assignment and release still to be recorded.

## Agreed reference preparation

Build a dedicated reference implementation after critically reviewing and settling the project specifications.
The [scope review](../project-specification-scope-review-2026-10-22.md) records the settled choices, now reflected in the course contracts, checklist, snapshots and this pack.
Building the reference and its audit packages needs additional preparation beyond the current instructor allowance, which assumed suitable references were available.
The [tooling guide](../course-tooling.md#preparation-status--22-october-2026) records the frozen reference, clean-unpack verification and release limitations.

## Agreed builds and benchmark tooling

Keep three fresh implementations: large-model single-agent A, small-model single-agent B and fleet-built C.
Provide a course benchmark runner as optional tooling; students may implement their own runner under the same measurement and evidence protocol.
The optional runner is implemented and validated against the private reference; its public download is built with the site.
The scope choices are settled; model assignments and operational preparations remain open.

## Agreed trace extension

Keep analysis of the actual fleet run required, with a compact redacted execution record and at least two debugging findings.
Make trace transformation, repeatable import into C and application-based debugging an optional extension to accommodate different group capabilities.
The required path must support full credit, including grade 5.
[ADR-046](../adrs/implemented/ADR-046-make-fleet-trace-import-an-optional-extension.md) records the adopted requirement and optional extension.

## Agreed paired experiment extension

Require analysis of supplied matched single-agent/fleet traces within the existing Compare activity and evidence.
Make execution of the student's own matched pair optional, with full credit available through the required analysis.
The actual fleet build and analysis of its real execution remain required.
[ADR-047](../adrs/implemented/ADR-047-make-live-paired-experiments-an-optional-extension.md) records the adopted comparison contract; the supplied evidence package still needs preparation.

## Agreed decision records

The evolving ADR-style decision log is required, as recorded in [ADR-048](../adrs/implemented/ADR-048-require-evolving-decision-records-across-fresh-builds.md).
Carry forward the reasoning and revisit relevant choices across A, B and C while keeping application implementations fresh.

## Agreed maintained specifications

Maintaining specifications is mandatory throughout the projects; students choose and refine how they capture that context.
Keep intended behavior, acceptance criteria, constraints and important assumptions current and accessible to agents, alongside the evolving decision log.
Use the existing task evidence and discussions to show how the specifications informed work and validation.

## Agreed starter evidence

When a starter is used, require its source and starting revision, material changes and inherited assumptions, with consequential choices in the evolving decision log.
Make the detailed keep, replace later, remove or decide inventory optional, with no grading penalty for its absence when the required evidence and reasoning are present.
The fresh-build transfer rules remain; [ADR-048](../adrs/implemented/ADR-048-require-evolving-decision-records-across-fresh-builds.md) records this refinement in the current contract.

## Agreed ownership card

Keep the [short standard ownership card](study-agreement.md#ownership-card) for the core event workflow in the same place in each phase's evidence index.
This gives the instructor a consistent entry to ownership evidence while specifications and ADRs retain format freedom.
Assess it within the existing architecture and phase-specific criteria, with no extra points or separate report.

## Agreed friction reporting

Keep both audits required and record one concrete development bottleneck supported by evidence per phase, with a checked improvement or a justified follow-up decision.
Use the eight friction categories as prompts, with no compulsory commentary on each category or additional report.
Assess the finding and response under the existing criteria; exhaustive category coverage is not required for full credit.
[ADR-050](../adrs/implemented/ADR-050-focus-friction-reporting-on-evidenced-bottlenecks.md) records the adopted contract.

## Agreed pressure investigation and exploration

Use one primary application pressure across A, B and C, with a bounded correctness or recovery investigation in B and one measured scaling response plus its new failure or recovery check in Compare.
Keep formal-model reasoning, realistic deployment and the deployed baseline rerun required.
Allow additional pressure scenarios as optional explorations, with full credit available through the required investigation.
The shared baseline supports comparison across implementations; identify optional findings and their conditions separately in the existing final evidence matrix.
[ADR-049](../adrs/implemented/ADR-049-focus-required-pressure-investigations-and-offer-extensions.md) records the adopted contract.

## Agreed incident-transfer assessment

Assess the documented incident and its transferable lessons in [activity 6](independent-activities.md#activity-6-failure-and-recovery), using the existing activity and diary criteria.
Link that entry from the project evidence index instead of requiring an additional detailed incident pressure map in the project record.
The conceptual work, numeric rubric and passing minima remain; the course contracts reflect this placement under ADR-049.

## Agreed configuration reporting

Link the exact retained course-configuration version, confirm actual models, routes and environment, and record deviations and material exposed settings.
Mark unavailable details honestly and reference unchanged published fields through the retained snapshot.
[ADR-051](../adrs/implemented/ADR-051-reference-versioned-course-configurations-in-student-evidence.md) records the publication rule; actual model and access choices still need preparation.

## Decisions needed before starting

- Confirm that the student can reserve 6–8 orientation hours before kickoff, approximately 20–21 hours per week afterward, and 22–25 hours per week during the final phase.
- Select the kickoff time during 2–4 November and confirm the proposed 16 November, 30 November and 15 December reviews, instructor availability during the audit windows, and the local deadline for registering the grade.
- Choose the supported models, harnesses, execution environments, budgets and fallbacks using the [course environment sheet](../../specifications/course_environment.md).
  Establish must be ready before its project work begins; prepare Challenge and Compare before their respective phases.
- Retain an instructor-controlled backup of the prepared private reference packages and record each outgoing audit assignment, holding phase-specific probes back until the audit window.
  Confirm supported model access and any remaining preparation budget, including the supplied matched-trace package.
- Confirm the private submission, communication and feedback channels, and the proposed two-working-day response to blockers.
- Agree the solo assessment equivalents and proposed correction arrangements in writing before work begins.

## Existing course contracts

The [course plan](../../course_plan.md), [approved solo route](../../specifications/00_introduction.md#approved-solo-route), [common specification](../../specifications/00_common_project.md), phase briefs and [rubric](../../specifications/grading.md) define the learning and project requirements.
This pack applies the existing [solo operating arrangements](../course-system.md#solo-route-across-all-three-phases) and [ADR-026](../adrs/implemented/ADR-026-support-an-approved-solo-course-route.md) to a dated pilot.
It does not change the published requirements or create a new assessment scale.

Use requirements `2026-10-v2` and rubric `2026-10-solo-equivalence-v2` for the new run.
Retain the agreed documents with the private portfolio and use the run's archived requirements once study begins.
Treat the requirement edition as immutable after the first real run starts, following the [requirement publication rules](../../requirements/README.md).

These repository documents contain reusable arrangements only.
Keep the student's identity, contact details, personal circumstances, completed agreement, work and scores in the private course records.
