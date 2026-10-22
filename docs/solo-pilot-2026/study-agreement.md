# Independent course study agreement

**Draft for discussion — 22 October 2026.**

Complete the full 5 ECTS course through the approved solo route, with student work submitted by **16 December 2026** and grading targeted for **18 December**.
The expected student workload is **135 hours**, including approximately **6–8 hours of orientation before an early-November kickoff**.
The remaining work needs approximately **20–21 hours per week after kickoff**, with the final phase approaching **22–25 hours per week**.
Confirm that this fits your other commitments before starting.

The instructor and student will record their names, agreed dates, course workspace, communication channel, model access and any individual adjustments in the private course records.

## Learning and required work

The [six course learning outcomes](../../course_plan.md#learning-outcomes) cover scalability, architecture, design decisions, formal models, evaluation, and practical building and deployment.
Complete three fresh implementations of the same Work Activity Tracker:

1. **Establish:** implementation A with an approved large model and a single agent, plus a correctness and measurement baseline.
2. **Challenge:** implementation B with an approved small model and a single agent, plus architecture, friction, pressure and A–B analysis.
3. **Compare:** implementation C with an approved agent fleet, plus actual-run debugging analysis, supplied matched-trace analysis, formal-model analysis, one implemented scaling response, realistic deployment and the final comparison.

Follow the [common specification](../../specifications/00_common_project.md) and the full [Establish](../../specifications/01_establish.md), [Challenge](../../specifications/02_challenge.md) and [Compare](../../specifications/03_compare.md) briefs.
The milestones below summarize the work; the briefs define the complete deliverables and permitted transfer between implementations.
The required work supports full credit, including grade 5.
Additional pressure scenarios, trace transformation and import into C, and running your own matched pair are optional explorations within the same budget, with no separate points.
Use a course-provided benchmark runner when available or your own implementation under the identical measurement protocol.
Keep both audits and one evidenced development bottleneck with a checked improvement or justified follow-up per phase; the eight friction categories are prompts.
Reference the exact retained course configuration, confirm actual models, routes and environment, and record deviations and material exposed settings, marking unavailable details honestly.
Keep optional features and extension reading within the available time.

Required reading is the book introduction, the three part openings and the nine main chapters.
Use the project specifications as working references.
Read appendices and case studies when assigned or needed for a project question.
Complete the [nine independent activities](independent-activities.md) and submit their concise diary entries through one private portfolio per phase.

## Maintained specifications

Maintain specifications for the core event workflow and consequential project work, choosing a format and working method that you can improve across the course.
Capture intended behavior, acceptance criteria, important constraints, assumptions and scope, referring to the course contract where appropriate.
Documents, structured issues, examples or executable scenarios are suitable when a human or agent can find and understand the intended behavior and acceptance conditions.

Use this context to brief agents, divide work and validate results, and keep it current as legitimate clarifications or agreed changes occur.
Distinguish intended behavior, implemented behavior and known gaps; project specifications cannot waive the course requirements.
Carry forward behavior-level specifications and lessons while respecting the fresh-build restrictions on application source, implementation-specific tests and configuration.
Retain a readable phase snapshot or export with the existing evidence, so the chosen tool need not be available to the reviewer, and use the representative agent-task record to show how the maintained context supported the work.

## Decision records

Maintain ADRs or a similar decision log for consequential choices throughout the three projects.
Record the context, alternatives, choice and rationale, assumptions and consequences, status and owner, supporting evidence, reversibility and a condition for revisiting the choice.
Use a lightweight format that helps you make and explain decisions; no particular tool, directory structure or record count is required.

Start the log in Establish, revisit relevant decisions in Challenge, and use the accumulated reasoning for Compare's scaling and fleet decisions.
Explain why earlier choices are retained, revised or rejected; a supported decision may remain unchanged.
Keep earlier records and link their replacements, with evidence and implementation status tied to the relevant phase and revision.
Carry this reasoning forward as written lessons while each application's source, implementation-specific tests and configuration remain fresh under the transfer policy.
Submit the relevant phase snapshot or revision of the log with the existing evidence bundle.
Specifications describe the current intended behavior and constraints; the decision log preserves why consequential choices were made and when to revisit them.
You may keep both in the same tool or document when their roles remain clear.

## Ownership card

Include this short card under **Ownership card** in each phase's evidence index for the core event workflow.
Identify the phase and submitted revision, then give a brief answer or evidence link for each field.
Keep the card consistent with the running system and use it to link the current specification, architecture and decision records.

| Field                     | What to record                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------- |
| Code entry points         | The source root and composition or request entry point for the workflow.                |
| State authority           | The authoritative state and the component responsible for changing it.                  |
| Public contracts          | The relevant interfaces, lifecycle and event-recording obligations.                     |
| Dependency direction      | Which components may depend on which others.                                            |
| Excluded responsibilities | Responsibilities that belong outside this workflow or component.                        |
| Validation and acceptance | Links to relevant checks and results, plus the role responsible for accepting the work. |

Short answers and references are sufficient; the card is part of the existing evidence bundle.
It supports the current architecture and phase-specific ownership criteria, with no separate points or change to the grading scale.

## Benchmark tooling

A course benchmark runner is planned as optional tooling.
You may use it or implement your own runner, following the same fixture, measurement boundary, workload profiles, repetitions, outcome accounting and correctness checks in the common specification.
Provide a reproducible setup and retain the required observations whichever runner you use.
The assessment concerns the measurements and reasoning; creating another runner has no separate point allocation.

## Schedule and workload

All dates are in **2026** and all submission deadlines are **17:00 Europe/Helsinki**.
Agree meeting times separately, with phase discussions before the corresponding final-evidence deadline.

| Phase     | Study period           | Project work | Reading and independent activities |     Total |
| --------- | ---------------------- | -----------: | ---------------------------------: | --------: |
| Establish | 22 October–16 November |         30 h |                               12 h |      42 h |
| Challenge | 17–30 November         |         30 h |                               12 h |      42 h |
| Compare   | 1–16 December          |         39 h |                               12 h |      51 h |
| **Total** |                        |     **99 h** |                           **36 h** | **135 h** |

The kickoff, tool preflight, solo engineering sessions, audits, review discussions, evidence and reflection fit within these allocations.
Hours are planning estimates; record approximate actual time without maintaining a detailed timesheet.

### Orientation before kickoff

Use **22 October–1 November** for approximately 6–8 hours of independent preparation:

- Read the book introduction, Establish opening and Chapters 1–3, taking concise notes and marking unfamiliar concepts.
- Browse the project introduction, common specification and Establish brief to understand the application, evidence and three-build structure.
- Try an accessible book demonstration and collect questions about the material and practical setup.

These hours count within Establish's 12-hour reading and activity allowance.
Keep the notes for the later diary and activity work; reading alone does not establish activity completion.
Confirm the assessment agreement, model access and tool policy at kickoff before substantive project implementation.
Instructor support and the proposed two-working-day response commitment begin at kickoff; until then, collect questions and continue with accessible reading.

### Submissions and reviews

| Milestone                                                                   | Establish   | Challenge   | Compare     |
| --------------------------------------------------------------------------- | ----------- | ----------- | ----------- |
| Frozen source and initial evidence due                                      | 11 November | 25 November | 10 December |
| Independent human audit returned and student's outgoing reference audit due | 13 November | 27 November | 14 December |
| Instructor discussion                                                       | 16 November | 30 November | 15 December |
| Final technical evidence, audit response and private portfolio due          | 16 November | 30 November | 16 December |
| Assessment and feedback target                                              | 18 November | 2 December  | 18 December |

Hold a 30–45-minute kickoff during **2–4 November**, with the exact date and time to be agreed, before substantive project work.
Check the starting skills, run the supported tools, agree the required evidence and confirm the arrangement.
The short starting exercise is ungraded.

At the **16 November review**, compare actual effort with the Establish budget and agree any necessary schedule changes for the remaining phases.
Keep **21–23 December** available for explicitly agreed corrections or administrative problems.
This is contingency time; the planned work ends on 16 December.

## Student responsibilities

- Work independently through the reading, activities and three implementations, using only the announced tools and supported model routes.
  Record material assistance, human corrections, checks, acceptance decisions and known limits.
- In each phase, complete the approximately 30-minute solo engineering session: predict before agent use, investigate, challenge a competing explanation or failure case, validate and explain the acceptance decision.
  Link the compact record from the existing evidence.
- Submit reproducible frozen source and initial evidence, audit the assigned reference implementation, respond to the incoming human audit, and complete the final technical evidence and private portfolio.
- Attend the kickoff and three approximately 30-minute phase discussions.
  Explain a consequential decision, its checks and limits, and respond to an independent challenge.
- Send a short weekly update by Friday: approximate hours, completed work, next step and blockers.
  Begin the weekly updates after kickoff and include the earlier orientation hours in the first update.
  Report a blocker when it prevents progress, rather than waiting for the weekly update.

## Instructor responsibilities

- Agree the scope, activities, assessment equivalents, submission channels and supported environment before work begins.
  Publish each phase's model assignment, access, spending limit, tool policy and fallback before that phase starts.
- Personally perform the independent human audit of each frozen implementation and supply the student's outgoing reference-audit assignment for each phase.
  Release the reference and bounded change probe after the source deadline opens the audit window.
- Return each incoming audit by the date above, conduct the phase discussion, and provide criterion-level assessment and feedback by the stated target.
- Aim to respond to blocking questions within **two working days**, and record any known absence or alternative support contact in advance.
- Adjust faulty instructions or unavailable infrastructure explicitly, retaining the original evidence and explaining any approved schedule or assessment adjustment.

## Assessment and final grade

Use the run's retained [course rubric](../../requirements/2026-10-v2/grading.md), with the following agreed solo equivalents for the individual assessment.
The total remains **153 points**: three projects worth 30 points each, nine activities and diary entries worth 3 points each, and three individual assessments worth 12 points each.

| Solo individual assessment criterion            | Points per phase | Evidence                                                                                                                        |
| ----------------------------------------------- | ---------------: | ------------------------------------------------------------------------------------------------------------------------------- |
| Evidence-based self-assessment                  |              0–3 | Concrete contributions, decisions, completed and missed commitments, learning and next improvement.                             |
| Useful independent implementation review        |              0–3 | Actionable findings from the outgoing reference audit, supported by checks and stated limitations.                              |
| Response to feedback and solo reflection        |              0–3 | A considered response to the human audit and instructor challenge, one adjustment and a working condition affecting the result. |
| Reliable contribution and accountable ownership |              0–3 | Project history, checks, portfolio and discussion demonstrate understanding and responsibility for accepted work.               |

Each lecture-equivalent activity earns one point for completing the activity, one for a concrete idea in the diary, and one for connecting it to evidence, an assumption or a decision.
Record activity completion separately from the diary content.
A project check-in alone does not count as a lecture activity.

To pass, all of the following must hold:

- At least **10/30 points from each project**.
- At least **two fully completed activities in each phase**, each earning all three activity and diary points.
- A submitted individual assessment earning at least **6/12 points in each phase**, including at least **1/3 for accountable ownership**.
- At least **50% of the available total points** after any formally agreed adjustment.

Once those requirements are met, grades 1, 2, 3, 4 and 5 begin at **50%, 60%, 70%, 80% and 90%**, respectively.
Grade 5 is available through excellent work within the required scope.
Visual polish, extra features, time spent and the amount of generated output do not replace rubric evidence.

## Submission and correction arrangements

Use the private course workspace agreed at kickoff for submissions and feedback.
Technical bundles contain reproducible source, synthetic demonstration data and the indexed evidence; private portfolios contain diaries, individual assessment and the discussion record.
Keep credentials, personal circumstances and private assessment records out of technical bundles.

Freezing preserves the original source and initial evidence.
Complete the audit response and final evidence by the later deadline; mark gaps honestly.
Submit any source correction separately with its revision, checks and reason, and ask the instructor whether it can become an assessed revision.
The original frozen submission remains retained.

The proposed correction window is **two working days after feedback**, with the exact deadline recorded by the instructor.
For the final phase, agree any correction immediately and target completion by **23 December**.
Further substantive work may require a later completion date.
An unmet mandatory requirement prevents passing until the required work is completed and assessed; an extension does not itself satisfy a passing requirement.

## Feedback on the pilot

Briefly note unclear instructions, missing prerequisites, tool problems and approximate effort in the weekly update or existing reflection.
Distinguish difficulty understanding the subject, operating the tools and interpreting the assignment.
This feedback is ungraded and may be critical of the course.
Keep it within the 135-hour budget and reuse existing notes rather than preparing another report.

At the final discussion, identify what most helped learning, what consumed avoidable time and which instruction should change first.
The instructor may use anonymized lessons to improve the course; any attributed quotation or publication of the student's work requires a separate agreement.
