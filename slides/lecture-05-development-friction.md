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

# Seven friction surfaces expose different limits

1. Setup
2. Comprehension
3. Change
4. Testing
5. Review
6. Operations
7. Coordination

Do not collapse them into one impression of “developer experience.”

Measure where the workflow slows, blocks, duplicates work, or loses confidence.

<!-- [Sources] book/02_challenge/05_friction.md -->

---

# The newcomer path is an architectural test

Give an unfamiliar reviewer a runnable checkout and a bounded task.

Observe:

- time to first successful run;
- commands and documentation used;
- boundaries found or missed;
- questions the repository could not answer;
- checks completed;
- the first point where progress slowed or stopped.

Author familiarity can hide structural costs.

<!-- [Sources] book/02_challenge/05_friction.md; specifications/audit_change_probes.instructor.md -->

---

# A change probe turns friction into evidence

Use a disposable branch or copy.

1. Locate the likely change surface.
2. Run relevant existing checks.
3. Make one narrow change.
4. Add focused evidence when time permits.
5. Stop at the time box and report the actual outcome.

“Setup blocked” is evidence when the setup path was followed faithfully.

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

Rerun the same probe before claiming improvement.

<!-- [Sources] book/02_challenge/05_friction.md -->

---

# Compare author intent with newcomer evidence

The useful gap is not “who was right?”

Compare:

- the path authors expected;
- the path the auditor discovered;
- assumptions that remained undocumented;
- duplicated or unnecessary work;
- checks that did or did not establish acceptance.

The repository should carry more of the explanation over time.

<!-- [Sources] book/02_challenge/05_friction.md -->

---

# Challenge checkpoint

Produce:

- a standardized friction audit;
- one cross-team change probe;
- one verified feedback-loop improvement;
- the evidence before and after that improvement;
- a remaining friction boundary the team accepts deliberately.

**Question to carry forward:** Which assumptions will fail when runtime pressure changes?

<!-- [Sources] course_plan.md; specifications/02_challenge.md -->
