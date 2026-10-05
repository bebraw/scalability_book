# ADR-016: Version formative exercises and save private answers

**Status:** Implemented

**Date:** 2026-10-05

**Recorded retrospectively:** Chapter integration introduced on 2026-09-17.

## Context

Readers need practice beside the relevant explanation and demo, with useful feedback and the ability to resume.
Changing a question must not reinterpret an old answer, and formative progress must not become an undocumented course grade.

## Decision

Keep canonical question text, stable IDs, versions, fields, and deterministic checks in `shared/exercises.ts`.
Render the same definitions in chapters and the demo gallery rather than maintain separate question copies.
Increment the version when changing what is asked and preserve saved answers with their original question version.

Allow reading, experiments, and answer checking without an account.
Saving uses the verified session identity and a separate `LEARNING_DB` store, with the same local persistence contract.
The server independently validates fields and calculates completion; there is no self-reported completion checkbox.
Incorrect attempts can be saved and retried.

Keep answers private to their owner, with same-origin writes, bounded inputs, revision checks, and private/no-store responses.
Expose no teacher answer-listing API and do not publish answers as feedback.
Distinguish unsaved, saved, restored, failed, and conflicting states rather than claiming persistence before it succeeds.

Progressively enhance neighboring demos and questions into accessible Explore/Practice tabs.
Keep both in the reading flow without JavaScript and when printing.
Formative completion is separate from course assessment; ungraded explanation prompts still ask the learner to justify a correct calculation.

## Trigger

The September history integrated checked questions across all chapters and added authenticated private progress while retaining the reading experience.

## Consequences

**Positive:**

- A single question definition remains consistent across reading surfaces.
- Revisioned private answers preserve earlier attempts without inflating course obligations.

**Negative:**

- Question changes require deliberate versioning and retained historical content.
- Saving adds authentication, persistence, concurrency, and failure states to an otherwise static activity.

**Neutral:**

- Public formative answers and worked explanations are learning aids, not protected assessment secrets.

## Alternatives considered

### Store progress only in browser memory or local storage

This cannot provide the implemented authenticated cross-session record on another device.

### Treat checked exercise completion as a course score

The published exercise contract explicitly calls this formative work and provides no grading integration.

## Implementation and verification

[Exercise definitions](../../../shared/exercises.ts), [rendering](../../../scripts/lib/exercise-html.ts), [client behavior](../../../site/scripts/exercises.ts), [answer API](../../../worker/learning.ts), and [local adapter](../../../scripts/lib/local-answers.ts) implement the contract.
[Learning API](../../../tests/learning.test.ts), [authentication](../../../tests/learning-auth.test.ts), and [chapter exercise](../../../tests/e2e/chapter-exercises.spec.ts) tests cover the relevant boundaries.
[chapter-exercises.md](../../chapter-exercises.md) owns current behavior and provisioning instructions; repository support does not establish production database setup.

## Historical evidence

- [2026-09-17: integrate chapter exercises, deterministic checks, and saved progress](https://github.com/bebraw/scalability_book/commit/7abb5beb7922f9e23c27c9e8c3e9ef38836a4816).
- [2026-10-01: retain earlier versions and add transfer questions](https://github.com/bebraw/scalability_book/commit/ba57ff796f78c3f4f39f4e7e032fc332f2e16555).
