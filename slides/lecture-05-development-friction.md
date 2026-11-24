---
marp: true
paginate: true
title: "Lecture 5: Development friction"
---

# How does development friction limit web projects?

## Lecture 5 · Challenge

Change capacity is constrained by the slowest feedback and coordination paths.

<!-- [Sources] course_plan.md; book/02_challenge/05_friction.md -->

---

# What did you expect a newcomer to do?

Reopen an Establish diary entry or project decision about setting up, changing or checking A.

1. What did you expect, and why?
2. What did you actually see in an audit, your own work or another team’s demonstration?
3. Which expectation will you keep, revise or test in B?
   If the question is still open, what would help settle it?

Record your response in your private lecture diary.
Choose what to share in discussion.

<!-- [Sources] lecture_plan.md#5-development-friction; specifications/grading.md#participation-and-learning-diary-3-points-per-lecture -->

---

# Friction is the work around the intended change

Feature work includes more than editing code:

- finding the correct boundary;
- constructing a runnable environment;
- understanding contracts and state;
- choosing and running checks;
- interpreting failures;
- integrating and reviewing the result;
- operating and recovering the change.

Repeated friction compounds as contributors and change rate grow.

<!-- [Sources] book/02_challenge/05_friction.md -->

---

# Friction prompts help locate one bottleneck

1. Setup
2. Comprehension
3. Change
4. Testing
5. Review
6. Deployment
7. Operations
8. Coordination

Use these as optional prompts to find where work slows, blocks, repeats, or loses confidence.
One evidenced bottleneck is sufficient; measurement of every category is not required.

<!-- [Sources] book/02_challenge/05_friction.md -->

---

# The newcomer path is an architectural test

In the assigned audit, start from the other implementation’s frozen revision and submitted instructions.

Observe:

- time to first successful run;
- commands and documentation used;
- boundaries found or missed;
- questions the repository could not answer;
- checks completed;
- the first point where progress slowed or stopped.

Author familiarity can hide structural costs.

<!-- [Sources] book/02_challenge/05_friction.md; specifications/00_common_project.md#10-bounded-cross-team-audit -->

---

# A change probe turns friction into evidence

The instructor releases a different probe after each phase freezes.
Record setup time separately.
Start the **30-minute probe** when you have the prompt and a runnable checkout.

1. Locate the likely change surface.
2. Run relevant existing checks.
3. Attempt the assigned change in a disposable branch or copy.
4. Add a focused test if time permits.
5. Stop at 30 minutes and report the actual outcome, including unfinished checks.

If setup blocks you, report the probe as **not attempted because setup blocked it**.

<!-- [Sources] book/02_challenge/05_friction.md; specifications/00_common_project.md -->

---

# Improve the feedback path with the largest justified payoff

Possible responses include:

- one supported setup command;
- clearer architecture or feature guidance;
- faster focused tests;
- stable fixtures and demonstration data;
- errors that name the violated contract;
- smaller integration boundaries;
- an explicit recovery or rollback path.

Check the response against the bottleneck you observed.
If you defer the change, explain why and record the next check.

<!-- [Sources] book/02_challenge/05_friction.md -->

---

# Challenge checkpoint

**While building B**, keep one concrete friction finding in the evidence index. Record what you observed, how you responded and what happened, or why you chose a follow-up.
An unchanged or worse result still counts as evidence.

**After B freezes**, complete the phase record with the audit you performed and the one you received.
Preserve the actual setup and probe outcomes and add your response to the incoming report.

<!-- [Sources] specifications/00_introduction.md#submit-each-phase-in-stages; specifications/00_common_project.md#9-4-engineering-explanation; specifications/02_challenge.md -->
