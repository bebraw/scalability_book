# First-run course improvement notes

The book already has a coherent conceptual path, substantial project material, and enough interactive examples.
The clearest next improvements are therefore operational: make the course easier to enter, execute, compare, and assess without adding more subject matter.

These are working notes rather than commitments.
They should be revisited against the first cohort's questions, project evidence, and instructor workload.
The [course workspace guide](course-system.md) owns implemented behavior; this backlog contains remaining preparation and possible improvements.

## 1. Improve run-specific orientation

Use the existing course workspace as the entry point for run-specific work.
It already provides phase submissions, private portfolios, timed audit and class access, evidence checklists, and scoring records.
Review whether students can readily find:

- the current phase and next deadline;
- required reading, optional material, and lecture preparation;
- the next project evidence expected from teams;
- the assigned model, harness, access path, budget, privacy rules, and fallback;
- project-card submissions and the presentation schedule.

Add missing links or a compact run overview only where this review reveals an actual navigation gap.
Configure the published run according to the [project introduction](../specifications/00_introduction.md#groups-submissions-and-access), then test its source and evidence access as an author, assigned auditor, classmate, and instructor.
Verify the audit and class-opening times and the privacy of scores, diaries, and confidential assessment reports with synthetic records before enrollment.

Before each affected phase begins, fill its **To be announced** fields in the [course environment sheet](../specifications/course_environment.md).
Pair this with a small technical preflight in which every student or team reaches the assigned model, runs the harness, completes one bounded change, and executes the supported validation path.
Check Establish access before its work begins, then repeat the preflight when the model or workflow changes for Challenge or Compare.

## 2. Provide an executable evidence and submission template

Turn the common submission contract into a downloadable repository or bundle instead of asking each team to translate the specification into a new structure.
A minimum template could contain:

- `evidence/claims.md`;
- `evidence/workload.md`;
- `evidence/architecture.md`;
- `evidence/ai-use-log.md`;
- `evidence/friction-audit.md`;
- `evidence/project-card.md`; and
- `evidence/manifest.json` tying the evidence to an implementation and revision.

Include a small worked example from a domain other than the course project.
It should contrast a strong bounded claim with a plausible but weak claim and show how an observation, interpretation, limitation, and next measurement differ.

The presentation project card should be generated from the same evidence bundle.
It must not become another deliverable.

## 3. Support the required Compare path

Use the current brief to help students organize the existing Compare bundle into four coherent parts:

1. runnable implementation C;
2. fleet evidence package;
3. scaling-and-deployment experiment; and
4. final A–B–C decision package.

Provide one supported deployment recipe and check that the guidance makes actual-run analysis and supplied matched-trace analysis possible without trace import into C.
For students choosing the optional trace-import extension, start from the existing [portable fleet-trace example](../specifications/03_compare.md#optional-import-the-trace-into-c); consider a loader skeleton only if their experience shows it would help.
Prioritize interpreting coordination evidence, applying formal models, testing a justified scaling response, and defending a decision within the required path.

## 4. Add a paired first- and last-lecture diagnostic

Keep the opening and closing word clouds as shared discussion artifacts.
Add a short individual case in Lectures 1 and 9 that asks each student to:

- form one bounded scalability claim;
- identify the likely first limit;
- choose the first useful signal;
- propose a response and its trade-off; and
- state what evidence would change the conclusion.

Revisiting the same case would give students concrete material for final reflection and provide stronger evidence of changing reasoning than the word cloud alone.
It does not require changing or displaying the official learning outcomes.

## 5. Protect instructor attention

At the maximum cohort size, the current design can produce approximately 51 group-phase submissions, 450 lecture-diary entries, 150 phase-level self- and peer-assessment packages, and 51 stage presentations when about 50 students form 17 groups.

The workspace already collects three phase portfolios, retains criterion-level scoring, displays the individual passing requirements, and has synthetic grading walkthroughs.
Use those workflows in a rehearsal with the planned cohort size before launch, then focus remaining preparation on:

- checking whether evidence-presence and link validation would save meaningful review time without automating judgment;
- generating presentation cards from the common evidence template;
- calibrating criterion-level feedback against fictional submissions; and
- reserving qualitative instructor feedback for the most consequential reasoning, evidence, or collaboration issue.

The goal is to preserve formative assessment while preventing bookkeeping from displacing discussion and feedback.

The [individual-assessment comparison](individual-assessment-requirements-2026-10-05.md) examines how published courses require individual work alongside shared project marks.
The revised rubric requires two completed lecture activities and at least six self- and peer-assessment points per phase, including contribution credit, using already-assessed evidence.
This closes the earlier case in which 90 shared project points alone could earn grade 1.
Publish any completion or approved absence arrangements before the affected work begins and record them through the existing individual-arrangement workflow.

## Suggested priority

Prioritize the evidence template, run-specific orientation, and access rehearsal because they support project work, presentations, and assessment together.
Keep Compare support focused on the required analysis and deployment work; optional import scaffolding has lower priority.
The paired diagnostic is a small addition that could improve evidence about learning.
