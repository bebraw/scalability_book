# Project specification scope review

**Agreed scope — 22 October 2026.**

This is a dated decision and verification record.
Its preparation and deployment statements describe the state on 22 October, before the later reference, runner and matched-pair work.
For current implementation evidence and release obligations, use the [course preparation tooling guide](course-tooling.md#completed-matched-pair) and [pilot instructor checklist](solo-pilot-2026/instructor-guide.md#prepare-the-private-arrangement).

Keep **three fresh implementations** of the Work Activity Tracker: large-model single-agent A, small-model single-agent B and fleet-built C.
Offer a **course benchmark runner as optional tooling**, while allowing students to implement their own runner under the same measurement protocol.
Keep actual fleet-trace analysis required and make transformation and import into C an optional extension.
Require analysis of supplied matched single-agent/fleet traces, with execution of a student-run matched pair as an optional extension.
Require ADRs or an equivalent decision log that evolves across the three projects.
Keep maintaining specifications mandatory, with students choosing and refining how they capture that context for agent-assisted work.
Retain a short, standardized ownership card in the evidence index for consistent grading.
Require one shared primary-pressure investigation across A, B and C, a bounded correctness or recovery case in B, and the measured scaling response with its new obligation checked in C.
Further pressure scenarios are optional explorations.
Assess documented-incident transfer in the chapter 6 activity, without an additional detailed incident pressure map in the project record.
When a starter is used, require provenance, material changes and inherited assumptions; make the detailed pruning classification optional.
Require one evidenced development bottleneck and a checked improvement or justified follow-up per phase; retain both audits and use the eight friction categories as prompts.
Reference exact retained course configurations, confirm actual models, routes and environment, and record deviations and material exposed settings.
The scope decisions are settled and incorporated in the course contracts and pilot documents.

The application has a reasonable correctness core, with the surrounding measurement, integration and analysis work remaining important to the workload review.
The owning specifications, evidence checklist and unused `2026-10-v2` snapshots carry the revised contract; no real run used the earlier draft, as confirmed by the instructor.
At this review, the course runner had not yet been implemented, and the dedicated reference implementation was still to be built after the specification review.
The instructor agreed to perform the incoming human audits.

## Where the workload accumulates

The [course plan](../course_plan.md#workload) allocates 99 project hours: 30 for Establish, 30 for Challenge and 39 for Compare.
Compare's 39 hours include 18 for the fleet build and correction, nine for scaling and deployment, six for synthesis, three for auditing and three for reflection.
Its revised [brief](../specifications/03_compare.md) requires actual-run debugging findings, supplied matched-trace analysis, separate application and workflow models and the final decision.
Trace import and a student-run matched pair are optional extensions.
These obligations compete for the same allocation; they do not each have another allowance.

The [baseline protocol](../specifications/00_common_project.md) requires two measured profiles, three repetitions each, on A, B and C: **18 measured baseline runs before pressure experiments or deployment**.
The main tooling burden is implementing the adapter, fixture resets, outcome accounting and validation faithfully.
Reducing repetition alone would leave much of that work in place while weakening the evidence.

The contract already permits one evidence index, shared artifacts and links to earlier results.
Combining files or shortening checklists alone would therefore provide limited relief.
The substantive question is how many different behaviors, experiments and analyses students must produce.

## Preserve the application correctness core

Keep workspaces, three-stage work items, activity events, a deterministically ordered and filtered feed, one summary, validation and restart persistence.
They provide a small system with state authority, derived data, concurrent operations, realistic reads and writes, and observable failure cases.
Removing event recording or persistence would make implementation easier but would remove useful architecture and correctness questions.

Retain interactive workspace creation and the existing twelve acceptance scenarios.
The earlier suggestion to remove this flow is withdrawn: preserving the common observable contract supports straightforward grading and implementation comparison, while the agreed experiment and integration extensions provide the more useful scope relief.

Clarify that actor names need not be authenticated accounts and workspace filtering does not establish authorization or security isolation.
Authentication, invitations, workspace administration, editing, deletion, elaborate dashboards and additional work-item fields should stay outside the required scope.
Several are already optional or unspecified; clearer boundaries would prevent accidental expansion.

## Retained comparison work

Retain Establish's [two bounded claims](../specifications/01_establish.md#analyze-initial-scalability): one about runtime demand or data, and one about contributors or change.
The earlier proposal to remove the second is withdrawn because the instructor has emphasized learning to maintain the development context, and the existing rubric already assesses both dimensions.
Use the evolving specifications, decision records, representative agent task and audit evidence to inform the workflow claim, without another report.

Keep the real fleet, a consequential correction or integration episode, direct student explanation, the incoming and outgoing audits, one implemented scaling response and a realistic deployment.
Keep one application-level formal-model analysis and one workflow-level analysis.
Reuse and revisit the Challenge Little's Law analysis when it supports the final application decision; another disconnected calculation should not be required.

## Agreed build and benchmark decisions

Retain three fresh builds and the existing A–B–C comparison, as specified by [ADR-039](adrs/implemented/ADR-039-sequence-model-sizes-and-permit-mixed-fleets.md).
Compare builds a fresh C through a real fleet; it does not start from B's application source.
The reference implementation remains a separate audit target.

Provide a course runner for convenience, with students free to build their own.
Both paths must implement the same fixture, logical-operation boundary, operation mix, seeded order, profiles, repetitions, resets, deadlines, outcome accounting and correctness checks in the [common protocol](../specifications/00_common_project.md).
A custom runner must be reproducible and provide the observations needed to check its compliance and interpret its results.
The grade concerns the required behavior, quality of evidence and reasoning; writing additional benchmark infrastructure has no separate point allocation.

The course runner should own generic scheduling, timing, result calculation and reporting, with a thin adapter exercising each application's real persistence path.
Keep repetitions, valid versus failed outcomes, unresolved-write reconciliation and the consistent resource proxy visible.
Publish the protocol and result format independently of the runner so students can implement another runner without reverse-engineering course code.
Generic runner tooling may transfer between phases under the existing transfer policy; application-specific adapters must respect the fresh-build boundary.

Creating and validating this optional runner is additional course preparation work.
Its implementation and distribution details remain to be settled before students need the baseline measurements.

## Agreed trace analysis and optional import

Require a compact, redacted record from the actual fleet run and analysis of at least two debugging findings.
Identify the relevant tasks or actors, handoffs, validation, integration, correction or human intervention, link the supporting observations and explain what they establish and leave uncertain.
A curated log excerpt or table is sufficient; a normalized trace schema and application importer are not required for this path.

Offer trace transformation, repeatable loading into C and application-based debugging views as an optional extension.
If a group chooses it, retain source provenance, redaction, coherent state mapping and a repeat-import policy that avoids duplicate records.
Live ingestion, general-purpose exporters and elaborate visualization remain further optional scope.

The purpose is to accommodate different group capabilities while the actual task difficulty is still unknown.
The required path must support full credit, including grade 5; importing a trace must not become a hidden condition for the highest grade.
An optional integration may support the existing criteria through better evidence, but has no separate point allocation and cannot replace required analysis or correctness checks.
Keep optional work within the existing phase budget and prioritize the assessed core.

[ADR-046](adrs/implemented/ADR-046-make-fleet-trace-import-an-optional-extension.md) records the accepted change and the adopted contract and remaining preparation boundaries.
The three fresh builds, real fleet, actual-run evidence and numeric assessment rules remain part of the course.

## Agreed paired comparison and optional live experiment

Require analysis of instructor-supplied matched single-agent/fleet traces as part of the existing Compare activity and evidence.
Students identify what was held constant, what changed, whether acceptance checks support the recorded outcomes, and how elapsed time, human effort, model resources and correction work compare.
They explain missing measurements and limits, and do not present supplied observations as results from their own workflow or one pair as a general model or orchestration effect.
Keep this within the existing study allocation and reuse the analysis in the phase evidence index.

The instructor supplies provenance, the task brief, configurations, acceptance checks and outcomes, with accounting gaps explicit.
Synthetic teaching data must be identified as such and cannot establish an empirical effect.
The supplied evidence package still needs preparation.

Make a student's execution of their own matched pair optional.
For this extension, retain the common frozen starting revision, brief and checks, small-model configuration and routing, environment and tools, intervention policy, and equal predeclared wall-time and aggregate resource limits.
Keep the existing maximum of 20 minutes per attempt, preserve partial and failed results, and count all fleet workers and retries.
The optional experiment fits within the phase budget and has no separate point allocation; the required analysis supports full credit, including grade 5.
Building fresh C through a real fleet remains required.

[ADR-047](adrs/implemented/ADR-047-make-live-paired-experiments-an-optional-extension.md) records the accepted change and the adopted comparison contract and remaining supplied-package preparation.

## Agreed evolving decision records

Require ADRs or a comparable decision-record approach throughout A, B and C.
The learning goal is to maintain and use the reasoning layer around the project, revisiting choices as implementation, measurements, audits and experience provide new evidence.
Retain an architecture/data-flow explanation alongside the log; a collection of decisions does not replace an explanation of the running system.

Record consequential choices with their context, alternatives, decision and rationale, assumptions and consequences, status and owner, evidence, reversibility and a revisit condition.
Use a lightweight format and the project's existing workflow; no particular directory layout, tool, word count or record quota is required.
Capture decisions while doing the work and assess their usefulness, evidence and the student's ability to explain them.

In Establish, record the initial stack, state/event workflow and important assumptions as they arise.
In Challenge, revisit relevant earlier choices and explain why they are retained, revised or rejected in light of the fresh build and audit evidence.
In Compare, use that history when selecting the scaling response and fleet boundaries, and record the resulting evidence and next revisit condition.
A decision can remain unchanged when the evidence supports it; students need not invent a reversal.

Carry reasoning and links forward as written lessons, retaining the original record and linking a replacement when a decision is superseded.
Bind implementation status and evidence to the applicable phase and revision, so implementation in A is not treated as proof that the choice works in B or C.
Preserve phase snapshots for assessment while the log continues evolving.
Keep previous application source, implementation-specific tests and configuration outside later builds' starting material under the existing transfer policy.

[ADR-048](adrs/implemented/ADR-048-require-evolving-decision-records-across-fresh-builds.md) records this accepted learning requirement.
Maintained specifications remain mandatory as described below, and the short ownership card is retained for grading consistency.
The starter-pruning classification is optional as described below.

## Agreed starter evidence

When a student uses a starter template, require its source and starting revision, material changes and inherited assumptions in the existing evidence bundle.
Record consequential choices about adopting or adapting the starter in the evolving decision log.
Make the detailed component-by-component keep, replace later, remove or decide inventory optional.
Students may use it when helpful, but its absence must not reduce credit when the required evidence and reasoning are present.

This preserves provenance and responsibility while reducing bookkeeping; it does not relax the existing permitted-transfer rules for the three fresh builds.
Students who do not use a starter have no starter inventory to produce.
[ADR-048](adrs/implemented/ADR-048-require-evolving-decision-records-across-fresh-builds.md) records this refinement; the Establish brief, learning guidance and requirement checklist now distinguish the optional inventory from required provenance and reasoning.

## Agreed maintained specifications

Keep [specification maintenance](../specifications/00_common_project.md#6-minimum-project-harness) mandatory in each project.
Students choose the format and workflow, and may improve their approach as the course progresses.
The purpose is to capture useful, current project context for human and agent work while learning how to maintain it effectively.

The specification records intended behavior, acceptance criteria, important constraints, assumptions and scope for the work being undertaken.
It can refer to the common course contract and add project-specific interpretations rather than reproduce the entire assignment.
Documents, structured issues, examples or executable scenarios are suitable when the intended behavior and acceptance conditions are explicit and discoverable.
ADRs retain why consequential choices were made; specifications retain the current intent those choices support.
Both may live in the same tool or document when readers can distinguish their roles.

Use the specifications when briefing an agent, decomposing a task and deciding whether to accept a result.
Update them when a legitimate clarification or agreed change occurs, retaining the distinction between intended behavior, implemented behavior and known gaps.
An implementation defect does not by itself justify changing the specification to match it, and the student cannot remove a course requirement by editing their project context.
The existing representative agent-task record and phase discussion can show how the maintained context guided work and checking, without another report.

Carry forward behavior-level specifications and lessons under the existing transfer policy, revisiting their clarity and usefulness in B and C.
Keep implementation-specific bindings, source code, tests and configuration subject to the fresh-build rules, and identify the phase and revision in a readable submitted snapshot or export that the reviewer can access independently of the chosen tool.
Assess the specification's usefulness, consistency and actual maintenance through the existing harness, correctness and evidence criteria; no particular tool, file layout, document count or separate points are required.
The specification requirement is retained from the current contract and is clarified alongside the agreed decision-log expectation.

## Agreed ownership card and grading access

Retain a short standard ownership card for the core event workflow, placed under the same heading in each phase's evidence index and identified by phase and submitted revision.
The existing rubric already refers to ownership cards in Establish and Challenge, and common architecture criteria assess authority, contracts and ownership throughout.
Use the card to summarize and locate evidence, with no additional point allocation or change to the 30-point projects, 153-point maximum or passing thresholds.

Use the [six-field card in the study agreement](solo-pilot-2026/study-agreement.md#ownership-card): code entry points, authoritative state and responsible component, public contracts, dependency direction, excluded responsibilities, and validation and acceptance evidence.
These fields cover the existing ownership questions and link to the maintained specifications, architecture description, decision records and checks.
Short answers and references are sufficient; a separate polished report is unnecessary.

Keep specification and ADR methods flexible, but require their current readable snapshots or exports to be linked from the evidence index.
The instructor starts with the card, follows the relevant evidence during the existing audit and discussion, and scores accuracy, coherence and reasoning under the existing criteria.
A completed card alone does not establish correctness or earn the architecture points.
Keep any phase-specific ownership and reflection judgment within its existing criterion, without adding a separate card score.

## Agreed focused friction reporting

Keep the incoming independent audit and outgoing audit required in every phase, following the existing bounded audit protocol.
For the author's phase evidence, require one concrete development bottleneck supported by observations and either a checked improvement or a justified follow-up decision.
Use the eight categories of setup, comprehension, change, testing, review, deployment, operations and coordination as prompts; commentary on every category is optional.

Keep one compact entry in the existing evidence index: the phase and revision, bottleneck and supporting observations, response and rationale, and check result or justified next step.
Link existing task, audit or validation evidence rather than create another report.
Record the outcome of a checked improvement honestly even if it leaves friction unchanged or makes it worse; a proposed follow-up is not evidence of an improvement already achieved.
Retain actual audit outcomes and the distinction between setup and probe time, and label unavailable observations instead of inventing measurements.

Assess this under the existing engineering, evidence and phase-specific criteria, with no separate points or change to passing minima.
One well-supported finding and response can satisfy the friction requirement for full credit; covering more categories is not a hidden condition for grade 5.
[ADR-050](adrs/implemented/ADR-050-focus-friction-reporting-on-evidenced-bottlenecks.md) records the accepted direction; the common contract, affected briefs, rubric, learning guidance, checklist and pilot materials now use the same focused requirement.

## Agreed focused pressure investigation

| Phase     | Required investigation                                                                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Establish | Establish the shared baseline, select one application pressure and define a repeatable transformation of the workload.                                                                 |
| Challenge | Repeat the same pressure and investigate one bounded correctness or recovery case, such as concurrent transitions, within the existing engineering session and evidence.               |
| Compare   | Repeat the pressure on C, implement one justified scaling response in A, B or C, measure before and after, and exercise a new failure or recovery obligation introduced by the change. |

Keep the application and workflow model reasoning, realistic deployment and deployed baseline rerun required.
The B investigation replaces the compulsory additional secondary-pressure analysis; further pressure scenarios are optional extensions.
Retain every relevant measured repetition, failed or partial outcome, measurement boundary and distinction between observations and projections.
Choosing an optional scenario does not relax the evidence needed for its claim, including the existing arrival-controlled procedure when drawing conclusions about sustained arrivals, backlog or admission control.

Use one evolving record with consistent fields: hypothesis, conditions and constraints, procedure, results and evidence links, interpretation and limits, and response, trade-offs and recovery obligations.
Keep it in the existing evidence index and reuse the engineering-session record where it answers the same question.
The required investigation supports full credit, including grade 5; extra scenarios have no separate point allocation and fit within the existing phase budget.

Preserve the same baseline and primary-pressure procedure within each group's A–B–C comparison.
Across groups, the shared baseline provides a common reference while chosen pressures and optional explorations can differ.
Identify the required evidence and optional findings in the existing final matrix, with the environment, scope and measurement conditions visible so comparisons remain interpretable.
A broader exploration or a lower raw latency does not automatically make one group's work better.

[ADR-049](adrs/implemented/ADR-049-focus-required-pressure-investigations-and-offer-extensions.md) records the accepted direction; the phase contract, rubric and checklist now use this progression.

## Agreed incident-transfer assessment

Assess the documented incident and its transferable lessons through the existing chapter 6 activity.
Keep a compact explanation of the failed assumption, observable signal, response and recovery obligation that could matter for B, distinguishing source facts from interpretation and proposed transfer.
Link the activity entry from the project evidence index instead of requiring an additional detailed incident pressure map in the cumulative project pressure record.
The conceptual work remains, so the workload saving is modest.

Use the existing activity and diary criteria, with no change to points or passing minima.
The project's required primary-pressure measurements, bounded correctness or recovery investigation and formal-model reasoning remain assessed through their existing project criteria.
The incident analysis need not introduce another implementation or experiment.
[ADR-049](adrs/implemented/ADR-049-focus-required-pressure-investigations-and-offer-extensions.md) includes this agreed assessment placement; the affected brief, book checkpoint, activity guidance and checklist now place assessment in the activity.

## Smaller submission contract

Organize technical evidence around the three fresh builds, with private portfolios kept separately:

- **Establish:** runnable A, reproducible setup and checks, architecture and assumptions, the ownership card, maintained specifications and the initial decision log, the two bounded claims and primary-pressure baseline, a representative agent decision and audit response.
- **Challenge:** fresh B, the same baseline and pressure, an evidenced architecture difference, the updated ownership card and maintained specifications and review of earlier decisions, the application-level model, bounded correctness or recovery investigation, friction finding and audit response.
- **Compare:** fresh fleet-built C, the comparable baseline and primary pressure, the ownership card and compact fleet evidence, the supplied paired-trace analysis and a workflow model, one scaling response with before-and-after and recovery results, deployment evidence, maintained specifications and the updated decision log, final A–B–C decision and audit response.

Use one evolving evidence index with phase-bound revisions and links.
Keep observations, explanations, projections, failed attempts and unavailable measurements distinguishable.
The reduced contract must still make grade 5 achievable through excellent required work, with optional extensions carrying no hidden expectation.

## Scope of the reference implementation

With the scope settled, build **one small, correct and auditable application** as the dedicated audit reference.
It needs the agreed behavioral core, synthetic fixtures, a clean setup path, meaningful lifecycle and event checks, and compatibility with the chosen measurement tooling.
Use ordinary, explicit boundaries that permit a bounded vertical change without prescribing the architecture students must choose.
Do not add a trace platform, fleet orchestration system or model integration to the reference merely because the course discusses those topics.

Prepare three frozen audit packages and phase-specific withheld probes from that reference as needed.
Repeated inspection of the same codebase creates familiarity; record exposure and treat later audit times as learning observations, not independent evidence about unfamiliar code.
Do not create artificial architectural variation solely to disguise that limitation.

Keep the reference source and probes in an instructor-controlled location until their intended release, so public source does not silently remove the unfamiliar-code condition.
The reference is an audit target, not permitted starting application code for the student's fresh builds.
Shared course tooling and black-box acceptance material should be distinguishable from the reference's application source.
Creating this application and its packages adds preparation beyond the current 16–23-hour instructor allowance, which assumed suitable references already existed.

## Agreed configuration reporting

Link the exact retained version or snapshot of the published course configuration, confirm the models, assignments, actual routes and environment used, and record deviations including fallback.
Reference unchanged published details and add exposed settings when material to a claim.
Mark unavailable details honestly; an unobserved setting is not confirmation that a default applied.
[ADR-051](adrs/implemented/ADR-051-reference-versioned-course-configurations-in-student-evidence.md) records the reporting and configuration-publication rule.

## Publication and remaining preparation

The instructor confirmed that no existing runs require legacy preservation, so the sole unused requirement edition is revised in place under the [publication workflow](../requirements/README.md).
The numeric rubric and passing minima are unchanged.
The specifications, chapter checkpoints, plans, checklist, snapshots, operating guidance and pilot materials are updated together.

The next preparation work identified at the review was to build and verify the dedicated private reference, optional course benchmark runner and supplied matched-trace evidence package.
Complete the actual model assignments, configuration versions, access, budgets, private channels and dated commitments before the affected student work begins.
These operational tasks remain separate from adoption of the course contract.

## Verification

The following checks describe the candidate reviewed on 22 October 2026.

The requirement/checklist tests pass, including owner and snapshot digest checks and every evidence link to its owning fragment.
The Worker build and HTML/type validation pass; 74 rendered pages contain 6,617 valid local links.
All 14 affected Chromium checks pass, covering course submission and grading, the final-reflection demo, canonical and archived briefs, fragments and rubric layout at three widths.
The full link check found no broken links across 242 external URLs; 15 destinations were inconclusive because of access restrictions or a fetch failure.
The revised archived briefs and ownership card were inspected in the browser.
At the time of this review, the changes were prepared in the repository and had not been deployed.
