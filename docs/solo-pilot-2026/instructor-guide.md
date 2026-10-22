# Instructor guide for the independent pilot

**Draft operating checklist — 22 October 2026.**

Reserve approximately **16–23 instructor hours**, assuming supported tools and suitable reference repositories are available.
The course instructor will personally perform all three incoming human audits, as agreed.
The student has a 135-hour budget, with final work due on 16 December and grading targeted for 18 December.
Use the [study agreement](study-agreement.md) for the calendar and commitments.

| Instructor work                                                                   |   Allowance |
| --------------------------------------------------------------------------------- | ----------: |
| Agreement, activity review, kickoff, environment checks and reference preparation |       4–6 h |
| Three human audits, discussions and phase assessments                             |      9–12 h |
| Asynchronous support                                                              |       2–3 h |
| Final grade reconciliation, registration and pilot conclusions                    |       1–2 h |
| **Total**                                                                         | **16–23 h** |

Building the dedicated reference implementation and audit packages is agreed, following the [specification scope review](../project-specification-scope-review-2026-10-22.md).
This work, the planned optional benchmark runner, supplied matched-trace package and any model infrastructure setup need additional preparation beyond the allowance above; their scope and time remain to be estimated before committing to delivery.
Confirm the audit windows before fixing the dates with the student.

## Prepare the private arrangement

- [x] Reviewer role agreed: the course instructor personally performs the incoming human audits of A, B and C.
- [x] Reference approach agreed: build a dedicated implementation after reviewing the specifications.
- [x] Build structure agreed: retain fresh A, B and C with the existing large-model, small-model and fleet progression.
- [x] Benchmark tooling agreed: offer a course runner and allow student-built runners under the same protocol.
- [x] Trace extension agreed: actual-run analysis remains required; transformation and import into C are optional, with full credit available through the required path.
- [x] Paired experiment agreed: analyse supplied matched traces; running the student's own matched pair is optional and not needed for full credit.
- [x] Decision practice agreed: require ADRs or a similar log that evolves across A, B and C, with relevant decisions revisited using new evidence.
- [x] Specification practice agreed: maintenance remains mandatory; students choose and refine how they capture and use context for agent work.
- [x] Ownership evidence agreed: retain a short standard card in the same evidence-index location for each phase, assessed within existing criteria.
- [x] Pressure scope agreed: one primary pressure across A–B–C, one bounded correctness or recovery case in B, and a measured response plus new-obligation check in Compare; further scenarios are optional.
- [x] Incident assessment agreed: use the chapter 6 activity for documented-incident transfer and link it from the project index, removing the additional detailed project pressure map.
- [x] Starter evidence agreed: retain source and revision, material changes, inherited assumptions and consequential decisions; make the detailed pruning inventory optional.
- [x] Friction reporting agreed: retain both audits and require one evidenced bottleneck and a checked improvement or justified follow-up per phase; use the eight categories as prompts.
- [x] Scope review completed and the common contract, briefs, rubric wording, checklist, snapshots, chapter checkpoints and pilot documents revised together.
- [x] Configuration reporting agreed: reference exact retained versions, confirm actual models/routes/environment, and record deviations, material settings and unavailable details.
- [ ] Build and verify the reference before its first audit release.
- [x] Reflect [ADR-046](../adrs/implemented/ADR-046-make-fleet-trace-import-an-optional-extension.md) consistently to the retained Compare brief, rubric, evidence checklist and pilot agreement before use.
- [x] Reflect [ADR-047](../adrs/implemented/ADR-047-make-live-paired-experiments-an-optional-extension.md) in the paired comparison requirements, retaining provenance, configurations, checks, outcomes and accounting limits as supplied-package obligations.
- [x] Reflect [ADR-048](../adrs/implemented/ADR-048-require-evolving-decision-records-across-fresh-builds.md) to the project harness, phase expectations, transfer guidance and assessment wording before use, including the optional starter inventory and required provenance and reasoning.
- [x] Retain the mandatory maintained specification in the revised harness and explain the format freedom, use in agent work, phase snapshots and fresh-build boundary.
- [x] Reflect [ADR-049](../adrs/implemented/ADR-049-focus-required-pressure-investigations-and-offer-extensions.md) to the common pressure protocol, phase instructions, rubric wording, evidence checklist and pilot agreement, including the activity-based incident-transfer assessment and affected book checkpoint.
- [x] Reflect [ADR-050](../adrs/implemented/ADR-050-focus-friction-reporting-on-evidenced-bottlenecks.md) to the common engineering evidence, affected phase briefs, rubric wording, requirement checklist and pilot materials while preserving the bounded audit protocol.
- [x] Reflect [ADR-051](../adrs/implemented/ADR-051-reference-versioned-course-configurations-in-student-evidence.md) in the evidence contract, environment publication rule, checklist and pilot agreement.
- [ ] Prepare and verify the supplied matched traces, retaining provenance, brief, configurations, checks, outcomes and accounting gaps.
- [ ] Implement and validate the optional course runner, publish its protocol and result format, and explain how a student-built runner demonstrates equivalent compliance.
- [ ] Confirm 6–8 student orientation hours before kickoff, approximately 20–21 hours per week afterward and 22–25 hours per week during the final phase.
- [ ] Select a kickoff time during 2–4 November and confirm the proposed 16 November, 30 November and 15 December reviews.
- [ ] Agree the study agreement, independent activities, solo assessment equivalents and correction policy; retain the agreed copy privately.
- [ ] Name the instructor, human reviewer, support contact, communication channel and submission workspace.
- [ ] Confirm the institution's grade-registration deadline and your availability on 17–18 December and for contingencies on 21–23 December.
- [ ] Create or select the actual course run with requirements `2026-10-v2` and rubric `2026-10-solo-equivalence-v2`.
      Record the approved one-person allocation for each phase using the [solo operating flow](../course-system.md#solo-route-across-all-three-phases).
- [ ] Enter the frozen-source, audit and final-evidence deadlines from the agreement, with the Europe/Helsinki timezone.
      Confirm student and staff access to source, audit, final-evidence and private-portfolio submission paths.
- [ ] Complete the run-specific [environment sheet](../../specifications/course_environment.md) before the affected phase.
      Store operational records in the private course workspace and give the student the supported access instructions.

The model choices, access paths, budgets and fallback services are still to be selected.
Complete the following decisions for Establish before substantive work, for Challenge by 17 November and for Compare by 1 December:

| Decision                       | Establish                                                           | Challenge                                                           | Compare                                                                              |
| ------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Model assignment               | Approved large model; identity and revision to select               | Approved small model; identity and revision to select               | Approved model set and role assignments to select; B's small model is the reference  |
| Harness and orchestration      | Version to select; single agent                                     | Version to select; single agent                                     | Version, concurrency limit, routing, isolation and trace export to select            |
| Supported access and resources | Endpoint, environment, cost basis and allocation to confirm         | Endpoint, environment, cost basis and allocation to confirm         | Endpoints, aggregate budget and accounting to confirm                                |
| Operational policy             | Data boundary, tool limits, support contact and fallback to confirm | Data boundary, tool limits, support contact and fallback to confirm | Data boundary, external-action limits, cancellation, support and fallback to confirm |

Run one small preflight task with each assigned configuration and retain its trace.
For A and B, verify that automatic delegation and unapproved model routes are disabled.
For C, verify task attribution, cancellation, usage accounting, isolation and trace export.
Prepare the supplied paired evidence, and any optional live pair, under the same small-model configuration and fixed routing policy.
The live pair becomes optional under ADR-047 when the revised contract is published; the supplied analysis and actual fleet work remain required.
Do not require unannounced personal spending or hardware.

## Support orientation before the November kickoff

Direct the student to the agreement's 6–8-hour reading and orientation plan for 22 October–1 November.
This counts within Establish's study allocation and uses the existing book and public project briefs.
Ask the student to retain questions and reading notes for kickoff.
The proposed two-working-day support commitment and weekly updates begin after kickoff.

## Conduct the kickoff during 2 to 4 November

Use 30–45 minutes to confirm the arrangement and inspect the supported environment.
Ask the student to trace a simple request through persistence, identify a plausible scalability limit and explain how to check an agent's proposed change.
Use the response to identify prerequisites and initial support needs; the diagnostic is ungraded.

Show where the complete briefs, nine activities, evidence checklist, portfolio and audit submissions live.
Agree the meeting times, spending limits, blocker channel and proposed two-working-day response.
Explain that the weekly update and feedback on the course do not earn or remove marks.

## Arrange incoming and outgoing audits

The human audit of the student's work and the student's outgoing reference audit are separate obligations in every phase.
You conduct the incoming human audit; the student conducts the outgoing audit of the supplied reference.
An agent cannot replace the human reviewer.
Follow the [common audit protocol](../../specifications/00_common_project.md#10-bounded-cross-team-audit), including the 30-minute change probe after a runnable setup, separate setup timing, retained partial results and a concise friction report.
If setup blocks the probe, record that outcome rather than reporting an estimated completion as observed evidence.

| Phase     | Student source freezes | Audit reports due | Discussion  | Final evidence due |
| --------- | ---------------------- | ----------------- | ----------- | ------------------ |
| Establish | 11 November            | 13 November       | 16 November | 16 November        |
| Challenge | 25 November            | 27 November       | 30 November | 30 November        |
| Compare   | 10 December            | 14 December       | 15 December | 16 December        |

Before each freeze, retain the following in the staff course records:

- The human reviewer's name and incoming-review arrangement.
- A legitimate outgoing reference repository, full commit hash, supported setup and validation instructions, and synthetic data.
- The reference's phase-specific bounded change probe, acceptance checks, common tool policy and setup time box.
- An access check, prior-exposure record and reason for the reference choice.

Select references the student can inspect without another person's credentials or private data.
Each reference must differ from the student's submitted implementation.
Record prior exposure and narrow later comparisons if references or conditions differ between phases.
The actual repository identities and probe contents belong in the private assignment records; keep them withheld until the audit window opens after the source deadline.

Bind the incoming human report to the student's frozen revision and return it by the audit-report deadline.
Release the outgoing reference assignment through the course workspace, and require the student's report by the same date.
Retain the student's response in final technical evidence and the useful review evidence in the private portfolio.
Record missing or blocked audits and arrange an explicit fallback rather than silently waiving them.

## Run the phase discussions

Allow approximately 30 minutes for each discussion:

1. **Five minutes:** the student explains a consequential decision and the initial prediction.
2. **Ten minutes:** inspect the relevant implementation, check or measurement and its acceptance decision.
3. **Ten minutes:** challenge an assumption or present a plausible failure case; ask the student to explain how the conclusion changes.
4. **Five minutes:** agree the feedback response, unresolved work and workload adjustment.

Use the phase's existing engineering-session question: transition and activity-event correctness for A, concurrent transitions for B, and scaling benefit plus a new failure or recovery obligation for C.
Use the student's evidence and incoming audit to choose the independent challenge.
Use the evolving decision log to ask why a consequential choice was retained or revised, and what later evidence would change it.
Check that carried reasoning remains distinct from reused implementation and that implementation claims identify their phase and revision.
Ask how the maintained specification informed the selected agent task and its acceptance checks, and what the student changed in the context as they learned.
Keep the current intended behavior distinguishable from ADR rationale and from known implementation gaps.
Record completion and the compact prediction/challenge/check/acceptance evidence in the private solo review record.
The discussion supports existing assessment criteria and does not automatically complete a lecture activity.

On 16 November, compare Establish effort, including earlier orientation, with its 42-hour budget.
Separate conceptual difficulty, tool friction and unclear instructions.
Reduce optional scope or agree an explicit schedule adjustment when needed, while preserving the required outcomes and evidence.
Recheck the Christmas target if the remaining work no longer fits the student's available hours.

## Assess and return feedback

Use the retained rubric and agreed solo equivalents in the course gradebook.
Give criterion-level reasons, identify missing evidence and bind the assessment to the relevant submission and portfolio revisions.
Target phase feedback for **18 November**, **2 December** and **18 December**.

Start with the [ownership card](study-agreement.md#ownership-card) in the phase evidence index.
Use its links to locate the current specifications, architecture explanation, ADRs and validation evidence, and check the relevant paths during the existing audit and discussion.
Score the evidence under the common architecture/change-capacity criterion and the applicable phase-specific ownership or analysis criterion; do not add a separate card score or award points for presence alone.
The card standardizes access to evidence while leaving the student's specification and decision-record methods flexible.

For each phase, check:

- [ ] Project score out of 30, using the common 20 points and phase-specific 10 points; passing minimum 10.
- [ ] Ownership card identifies the assessed phase/revision and accurately links the implementation, current context and checks.
- [ ] Three activity-completion records and diary scores, each out of 3; at least two activities earn all three points.
- [ ] Submitted solo individual assessment out of 12; at least 6, including at least 1 for accountable ownership.
- [ ] Completed instructor discussion, incoming human audit and outgoing reference audit, or an explicitly recorded missing-work assessment.
- [ ] Final evidence answers the incoming findings, and approved corrections retain their reason and original evidence.

The nine activities offer 27 points, the individual assessments 36 and the projects 90, for a total of 153.
After every passing minimum is met, apply the 50/60/70/80/90 percent thresholds for grades 1–5.
Use the formally adjusted available total only when an approved arrangement actually changes it.
Keep incomplete assessment distinct from an assessed failure; do not convert ungraded work silently into zero.

Allow the proposed two-working-day correction window after feedback, recording the exact scope and deadline.
Treat source changes separately from later technical evidence and retain the frozen original.
Reassess affected records after an accepted correction or changed review evidence.
The final December contingency is limited to explicitly agreed work; substantial unfinished requirements need a realistic later date.

## Collect useful pilot evidence

Use this short weekly update in the existing private channel:

> Approximate hours this week and total so far:
>
> Completed work and next step:
>
> Blocker or unclear instruction, with a page or task reference:
>
> Help needed and what I already tried:

Keep a brief instructor note when you intervene: the question, its source, whether it concerned concepts, tools or instructions, and the help needed to resume independent work.
Count this support time within the instructor allowance.
Pilot feedback remains separate from marks.

At each phase end, ask whether the student could find the next step, whether the reading prepared them for the task and where effort exceeded the budget.
At the final discussion, revisit the starting scalability question and note changes in reasoning without treating the diagnostic as another graded task.

Finish with a short private evaluation: planned versus actual student and instructor effort, recurring blockers, evidence of independent explanation, and the first course changes to make.
One student's experience can expose problems but cannot establish cohort-wide difficulty or human teamwork outcomes.
Keep personal circumstances and actual marks in private records; use anonymized findings for course improvement.
