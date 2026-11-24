---
marp: true
paginate: true
title: "Lecture 2: Agent-supported development"
---

# How can coding agents support scalable development?

## Lecture 2 · Establish

More implementation capacity makes the feedback system more important.

<!-- [Sources] course_plan.md; book/01_establish/02_scalable_development.md -->

---

# The development system scales too

A web project is changed by a connected system of:

- people and agents;
- instructions and context;
- tools and environments;
- tests and review;
- ownership and correction paths.

Faster code production does not guarantee faster accepted change.

<!-- [Sources] book/00_introduction.md; book/01_establish/02_scalable_development.md -->

---

# Constrain → generate → validate

**Constrain**

State the behavior, boundaries, commands, and prohibited effects.

**Generate**

Let the agent propose and implement a bounded change.

**Validate**

Check the artifact independently and feed concrete failures back into the loop.

The loop ends with accepted evidence—not generated output.

<!-- [Sources] book/01_establish/02_scalable_development.md -->

---

# A project harness makes work inspectable

Could another team run A and explain why a transition produces one event?

- Give them setup instructions, run commands and repeatable acceptance checks.
- Link the maintained specification and architecture notes from the **ownership card** for the core event workflow.
- Record the stack choice, its risks and what would make you revisit it.
- Keep one representative agent task, including its configuration, checks, human corrections and acceptance decision.

<!-- [Sources] book/01_establish/02_scalable_development.md; specifications/00_common_project.md -->

---

# Can a retry record the event twice?

For this class discussion, read the [event recorder](https://scalableweb.dev/explore/challenge-an-explanation/).
An agent says it prevents duplicates even after a worker restart.

1. On your own, predict the event count after the first call, a retry on the same worker and a retry after restart.
   Which state survives?
2. Ask the agent for a test of its claim, or inspect the sample test.
   Does the test restart the recorder, keep the event store and inspect the stored events?
3. Correct the test if needed and run it.
   What guarantee would you now state?

<!-- [Sources] book/01_establish/02_scalable_development.md; explorations/challenge-an-explanation.md -->

---

# Authority should shrink as consequences grow

An agent may:

- **propose** when intent is ambiguous;
- **prepare** when a human must approve a consequential action;
- **execute** when scope, evidence, reversibility, and limits are clear.

Provenance records who or what produced an artifact.
It does not prove correctness or transfer accountability.

<!-- [Sources] book/01_establish/02_scalable_development.md -->

---

# Improve the feedback loop, not just the prompt

When an agent struggles, ask which system property is weak:

- the requirement is ambiguous;
- the relevant context is hard to find;
- the change boundary is unclear;
- checks are slow or incomplete;
- failure output does not explain what to correct.

Prompt changes help only when the prompt is the actual bottleneck.

<!-- [Sources] book/01_establish/02_scalable_development.md -->

---

# Establish checkpoint

Use one engineering session of **about 30 minutes** to check a work-item transition and its activity event.
Each person predicts the result before the group uses the agent.

- The **operator** guides the approved large-model agent.
- The **challenger** tries a case that could break the claim.
- The **validator** checks the visible result and stored state.
  Someone other than the operator explains the acceptance decision.

Record the roles, predictions, check and decision in your existing decision log or AI-use log. [Session protocol and approved solo equivalent](https://scalableweb.dev/project/#shared-engineering-sessions)

<!-- [Sources] lecture_plan.md; specifications/01_establish.md; specifications/00_common_project.md#shared-engineering-sessions -->
