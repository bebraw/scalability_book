# First-run course improvement notes

The book already has a coherent conceptual path, substantial project material, and enough interactive examples.
The clearest next improvements are therefore operational: make the course easier to enter, execute, compare, and assess without adding more subject matter.

These are working notes rather than commitments.
They should be revisited against the first cohort's questions, project evidence, and instructor workload.

## 1. Create a student-facing course cockpit

Add a course page separate from the book's narrative.
It should show:

- the current phase and next deadline;
- required reading, optional material, and lecture preparation;
- the next project evidence expected from teams;
- the assigned model, harness, access path, budget, privacy rules, and fallback;
- project-card submissions and the presentation schedule.

Before the course begins, replace every **To be announced** field in the [course environment sheet](../specifications/course_environment.md).
Pair this with a small technical preflight in which every student or team reaches the assigned model, runs the harness, completes one bounded change, and executes the supported validation path.
This should expose access, hardware, account, and environment problems before Establish begins.

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

## 3. Reduce the apparent surface area of Compare

Keep the existing learning demands, but consolidate the Compare submission into four coherent outputs:

1. runnable implementation C;
2. fleet evidence package;
3. scaling-and-deployment experiment; and
4. final A–B–C decision package.

Provide a trace-loader skeleton and one supported deployment recipe.
Students should spend their limited time mapping and interpreting coordination evidence, applying formal models, testing a justified scaling response, and defending a decision rather than building generic import or deployment plumbing.

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

At the maximum cohort size, the current design can produce approximately 45 group-phase submissions, 450 lecture-diary entries, 150 phase-level self- and peer-assessment packages, and 39–45 stage presentations.

Before launch:

- collect diary entries as three phase portfolios while preserving the nine entry-level criteria;
- automate evidence-presence and link checks without automating judgment;
- use one scoring sheet across all phases;
- generate presentation cards from the common evidence template;
- test the 153-point scheme against several fictional student profiles; and
- reserve qualitative instructor feedback for the most consequential reasoning, evidence, or collaboration issue.

The goal is to preserve formative assessment while preventing bookkeeping from displacing discussion and feedback.

## Suggested priority

The evidence template and course cockpit have the widest effect because they improve project work, comparison, presentations, and assessment together.
The Compare scaffolds provide the largest scope-risk reduction, while the paired diagnostic is the smallest change that materially improves evidence about learning.
